import { openOperations, saveOperations, finishOperations } from './offline-vault.js';
import { calculateStayPrice, assertPricingCoverage } from './offline-stay-pricing.js';
const $ = id => document.getElementById(id);
let state = null, revision = 0, password = '', busy = false, exit = null, timer;
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const normalize = p => p.toUpperCase().replace(/[^A-Z0-9]/g, '');
const timestamp = () => new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
function message(text) { $('status').textContent = text; }
function controls() { document.querySelectorAll('button').forEach(b => b.disabled = busy || b.dataset.ineligible === 'true'); if (state) $('finish').disabled = busy || state.pending.length > 0; }
function lock() { if (busy) return; state = null; password = ''; exit = null; clearTimeout(timer); $('workspace').hidden = true; $('unlock').hidden = false; $('exit').hidden = true; for (const id of ['rows','queue','stamp','pending','amount']) $(id).replaceChildren(); $('plate').value = ''; }
async function persist(next) { revision = await saveOperations(next, password, revision); state = next; render(); }
async function api(action, body) {
  const response = await fetch('/api/offline/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Iniciá sesión con el mismo usuario y playa. Las operaciones siguen guardadas.');
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo sincronizar.');
  return data;
}
function allowedTime() {
  if (Date.now() > state.expiresAt || Date.now() < Date.parse(state.capturedAt) - 120000) throw new Error('Venció la autorización o cambió el reloj. Sincronizá las operaciones guardadas y prepará una nueva jornada.');
}
function row(title, detail) { const el = document.createElement('div'); el.className = 'row'; const strong = document.createElement('strong'); strong.textContent = title; const p = document.createElement('p'); p.textContent = detail; el.append(strong, p); return el; }
function render() {
  if (!state) return;
  $('stamp').textContent = 'Datos preparados el ' + new Date(state.capturedAt).toLocaleString('es-AR') + '. Operaciones autorizadas hasta ' + new Date(state.expiresAt).toLocaleString('es-AR') + '.';
  $('pending').textContent = state.pending.length + ' operaciones pendientes de sincronizar';
  const q = normalize($('search').value);
  const vehicles = state.vehicles.filter(v => !v.departed && (!q || normalize(v.plate).includes(q)));
  $('rows').replaceChildren(...vehicles.map(v => {
    const el = row(v.plate, v.vehicleType + ' · Entrada: ' + new Date(v.entry).toLocaleString('es-AR'));
    const button = document.createElement('button'); button.type = 'button'; button.dataset.ineligible = String(!v.eligible); button.textContent = v.eligible ? 'Registrar salida' : 'Requiere revisión online: tarifa histórica no disponible'; button.disabled = busy || !v.eligible;
    button.onclick = () => {
      try {
        allowedTime();
        const occurredAt = timestamp();
        const preview = calculateStayPrice(v.pricing, v.vehicleType, new Date(v.entry), new Date(occurredAt));
        if (v.collected > preview.price) throw new Error('Hay un anticipo excedente. La devolución requiere revisión online.');
        exit = { id: crypto.randomUUID(), registrationId: v.id, kind: 'EXIT', occurredAt, expectedPrice: preview.price, expectedCollected: v.collected };
        $('amount').textContent = v.plate + ' · Total: ' + money(preview.price) + ' · Anticipos: ' + money(v.collected) + ' · A cobrar: ' + money(preview.price - v.collected);
        $('exit').hidden = false; $('exit').scrollIntoView({ block: 'center' });
      } catch (e) { message(e.message); }
    }; el.append(button); return el;
  }));
  if (!vehicles.length) $('rows').textContent = 'No hay vehículos activos en esta búsqueda.';
  $('queue').replaceChildren(...state.pending.map(op => row((op.kind === 'ENTRY' ? 'Entrada' : 'Salida') + ' · ' + (op.plate || state.vehicles.find(v => v.id === op.registrationId)?.plate || op.registrationId), new Date(op.occurredAt).toLocaleString('es-AR') + (op.kind === 'EXIT' ? ' · Cobrado: ' + money(op.expectedPrice - op.expectedCollected) : '') + (op.error ? ' · REVISAR: ' + op.error : ' · Pendiente'))));
  controls();
}
async function sync() {
  if (!state || busy || !navigator.onLine || !state.pending.length) return;
  busy = true; controls();
  try {
    while (state.pending.length) {
      const op = state.pending[0];
      const { error, ...payload } = op;
      try { await api('sync', { ...payload, sessionId: state.sessionId, deviceId: state.deviceId }); }
      catch (e) { const next = structuredClone(state); next.pending[0].error = e.message; await persist(next); throw e; }
      const next = structuredClone(state); next.pending.shift(); next.syncedCount = (next.syncedCount || 0) + 1; await persist(next);
    }
    message('Todas las operaciones fueron confirmadas por el servidor.');
  } catch (e) { message(e.message + ' No se borró la operación pendiente.'); }
  finally { busy = false; render(); }
}
$('unlock').onsubmit = async event => {
  event.preventDefault(); if (busy) return; busy = true; controls(); message('Abriendo datos…');
  try {
    password = $('password').value; $('password').value = '';
    const opened = await openOperations(password); state = opened.state; revision = opened.revision;
    $('vehicle').replaceChildren(...state.types.map(t => { const o = document.createElement('option'); o.value = t.code; o.textContent = t.name; return o; }));
    $('workspace').hidden = false; $('unlock').hidden = true; message('Modo operativo listo. Cada operación se guarda antes de confirmarse en pantalla.'); render();
    timer = setTimeout(lock, 15 * 60 * 1000);
  } catch (e) { password = ''; message(e.message); }
  finally { busy = false; controls(); }
  await sync();
};
$('entry').onsubmit = async event => {
  event.preventDefault(); if (!state || busy) return;
  busy = true; controls();
  try {
    allowedTime();
    const plate = normalize($('plate').value);
    if (!plate) throw new Error('Ingresá una patente válida.');
    if (state.vehicles.some(v => !v.departed && normalize(v.plate) === plate)) throw new Error('Ya hay un vehículo activo con esa patente.');
    const vehicleType = $('vehicle').value;
    assertPricingCoverage(state.pricing, vehicleType, 'DAY'); assertPricingCoverage(state.pricing, vehicleType, 'NIGHT');
    const occurredAt = timestamp();
    calculateStayPrice(state.pricing, vehicleType, new Date(occurredAt), new Date(Date.parse(occurredAt) + 3600000));
    const op = { id: crypto.randomUUID(), registrationId: crypto.randomUUID(), kind: 'ENTRY', occurredAt, plate, vehicleType };
    const next = structuredClone(state); next.pending.push(op); next.vehicles.push({ id: op.registrationId, plate, vehicleType, entry: occurredAt, pricing: state.pricing, collected: 0, eligible: true });
    await persist(next); $('plate').value = ''; message('Entrada guardada en este dispositivo. Pendiente de sincronizar.');
  } catch (e) { message(e.message); }
  finally { busy = false; render(); }
  await sync();
};
$('confirm-exit').onclick = async () => {
  if (!exit || busy || !state) return; busy = true; controls();
  try {
    allowedTime();
    const next = structuredClone(state);
    const vehicle = next.vehicles.find(v => v.id === exit.registrationId);
    if (!vehicle || vehicle.departed) throw new Error('La salida ya fue registrada.');
    next.pending.push({ ...exit, method: $('method').value }); vehicle.departed = true;
    await persist(next); exit = null; $('exit').hidden = true; message('Salida y cobro guardados. Pendientes de sincronizar.');
  } catch (e) { message(e.message); }
  finally { busy = false; render(); }
  await sync();
};
$('cancel-exit').onclick = () => { exit = null; $('exit').hidden = true; };
$('search').oninput = render; $('sync').onclick = sync; $('lock').onclick = lock;
$('export').onclick = () => { if (!state) return; const url = URL.createObjectURL(new Blob([JSON.stringify({ sessionId: state.sessionId, playaId: state.playaId, userId: state.userId, pending: state.pending }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'operaciones-pendientes.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('finish').onclick = async () => {
  if (!state || busy || state.pending.length || !confirm('¿Finalizar la contingencia de este equipo? Todos los movimientos deben estar sincronizados.')) return;
  busy = true; controls();
  try { await api('finish', { sessionId: state.sessionId, deviceId: state.deviceId }); await finishOperations(revision); busy = false; lock(); message('Contingencia finalizada. Podés preparar una nueva jornada desde el sistema.'); }
  catch (e) { message(e.message); } finally { busy = false; controls(); }
};
function connection() { $('connection').textContent = navigator.onLine ? 'Con conexión disponible · contingencia activa' : 'Sin conexión · guardando en este equipo'; }
window.addEventListener('online', () => { connection(); sync(); }); window.addEventListener('offline', connection); connection();
setInterval(() => { if (state && state.pending.length) sync(); }, 30000);
document.addEventListener('visibilitychange', () => { if (document.hidden) lock(); });
