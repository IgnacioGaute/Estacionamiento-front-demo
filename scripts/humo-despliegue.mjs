#!/usr/bin/env node
// Prueba de humo después de un despliegue. SOLO LECTURAS: inicia sesión y abre pantallas, nunca
// registra entradas, salidas, cobros ni usuarios. Un despliegue «exitoso» en Railway no prueba
// estos flujos; esto sí, de punta a punta.
//
//   HUMO_FRONT=https://front.example  HUMO_API=https://api.example  node scripts/humo-despliegue.mjs
//
// Opcionales:
//   HUMO_VERSION        commit esperado (el SHA desplegado). Falla si front o back sirven otro.
//   HUMO_USUARIO / HUMO_CLAVE   una cuenta de operador o administrador de una playa (no super admin)
//                       para probar autenticación, empresa/playas y la apertura de Tickets.
//   HUMO_PLAYA_ID       si la cuenta es administrador con varias playas: la playa a abrir.
// Sin credenciales comprueba solo disponibilidad, versión y la red privada front → back.

const FRONT = process.env.HUMO_FRONT?.replace(/\/$/, '');
const API = process.env.HUMO_API?.replace(/\/$/, '');
const VERSION = process.env.HUMO_VERSION;
const USUARIO = process.env.HUMO_USUARIO;
const CLAVE = process.env.HUMO_CLAVE;
const PLAYA = process.env.HUMO_PLAYA_ID;
const ESPERA_MS = 20_000;

if (!FRONT || !API) {
  console.error('Faltan HUMO_FRONT y HUMO_API.');
  process.exit(2);
}

const resultados = [];
const paso = async (nombre, prueba) => {
  const inicio = Date.now();
  try {
    const detalle = await prueba();
    resultados.push({ nombre, ok: true, ms: Date.now() - inicio, detalle });
  } catch (error) {
    resultados.push({ nombre, ok: false, ms: Date.now() - inicio, detalle: error instanceof Error ? error.message : String(error) });
  }
};
const exigir = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };
const coincideVersion = (servida) => !VERSION || (servida && (servida.startsWith(VERSION) || VERSION.startsWith(servida)));
const pedir = (url, init = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(ESPERA_MS), ...init });

// Cookies mínimas para seguir la sesión de NextAuth entre pedidos.
const galleta = new Map();
const guardar = (respuesta) => {
  for (const linea of respuesta.headers.getSetCookie?.() ?? []) {
    const [par] = linea.split(';');
    const i = par.indexOf('=');
    galleta.set(par.slice(0, i).trim(), par.slice(i + 1));
  }
};
const cookie = () => [...galleta].map(([k, v]) => `${k}=${v}`).join('; ');

await paso('Backend listo (/salud)', async () => {
  const r = await pedir(`${API}/salud`);
  const datos = await r.json().catch(() => null);
  exigir(r.status === 200 && datos?.estado === 'listo', `HTTP ${r.status} ${JSON.stringify(datos)}`);
  exigir(coincideVersion(datos.version), `versión ${datos.version}, se esperaba ${VERSION}`);
  return `versión ${datos.version}`;
});

await paso('Frontend listo (/api/salud)', async () => {
  const r = await pedir(`${FRONT}/api/salud`);
  const datos = await r.json().catch(() => null);
  exigir(r.status === 200 && datos?.estado === 'listo', `HTTP ${r.status}`);
  exigir(coincideVersion(datos.version), `versión ${datos.version}, se esperaba ${VERSION}`);
  return `versión ${datos.version}`;
});

await paso('Front → back por el camino del servidor (API_INTERNAL_URL si está)', async () => {
  const r = await pedir(`${FRONT}/api/salud?backend=1`);
  const datos = await r.json().catch(() => null);
  exigir(r.status === 200 && datos?.backend?.estado === 'listo', `HTTP ${r.status} ${JSON.stringify(datos?.backend)}`);
  return `${datos.backend.redPrivada ? 'red privada' : 'URL pública'}, ${datos.backend.ms} ms`;
});

if (USUARIO && CLAVE) {
  await paso('Autenticación', async () => {
    const csrf = await pedir(`${FRONT}/api/auth/csrf`);
    guardar(csrf);
    const { csrfToken } = await csrf.json();
    const r = await pedir(`${FRONT}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookie() },
      body: new URLSearchParams({ csrfToken, identifier: USUARIO, password: CLAVE, callbackUrl: `${FRONT}/tickets` }),
    });
    guardar(r);
    exigir([...galleta.keys()].some((k) => k.includes('session-token')), `sin cookie de sesión (HTTP ${r.status}, ${r.headers.get('location')})`);
    const s = await pedir(`${FRONT}/api/auth/session`, { headers: { cookie: cookie() } });
    const sesion = await s.json().catch(() => null);
    exigir(sesion?.user?.id, 'la sesión no tiene usuario');
    exigir(!sesion.validacionPendiente, 'la sesión quedó con validación pendiente (el front no pudo consultar la cuenta)');
    if (PLAYA) galleta.set('parking-playa', encodeURIComponent(`${sesion.user.id}:${PLAYA}`));
    return `rol ${sesion.user.role}`;
  });

  await paso('Empresa, playas y apertura de Tickets', async () => {
    const r = await pedir(`${FRONT}/tickets`, { headers: { cookie: cookie() } });
    exigir(r.status === 200, `HTTP ${r.status} → ${r.headers.get('location') ?? ''}`);
    const html = await r.text();
    const fallas = {
      'No pudimos validar tu sesión': 'la sesión no se pudo validar',
      'No pudimos cargar tu empresa y tus playas': 'no cargó empresa y playas',
      'Tu cuenta no tiene una empresa activa': 'la cuenta no tiene empresa activa',
      'Asignación pendiente': 'la cuenta no tiene playa asignada',
      'Elegí dónde vas a trabajar': 'falta elegir playa (definí HUMO_PLAYA_ID)',
      'Failed to find Server Action': 'error de versión de acciones de servidor',
    };
    for (const [texto, motivo] of Object.entries(fallas)) exigir(!html.includes(texto), motivo);
    return `${Math.round(html.length / 1024)} KB`;
  });
}

for (const r of resultados) console.log(`${r.ok ? 'OK   ' : 'FALLA'} ${r.nombre} (${r.ms} ms) — ${r.detalle}`);
if (!USUARIO) console.log('Sin HUMO_USUARIO/HUMO_CLAVE: no se probaron autenticación, empresa/playas ni Tickets.');
process.exit(resultados.every((r) => r.ok) ? 0 : 1);
