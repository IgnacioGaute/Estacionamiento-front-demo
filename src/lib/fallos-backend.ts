import { VERSION_APP } from './version-app';

// Qué clase de problema fue. La interfaz decide con esto si vale la pena reintentar y qué decir:
// un corte o un 429 del proxy no es lo mismo que una sesión revocada, un permiso o una regla de
// negocio. «version» es una página de un despliegue anterior hablando con uno nuevo.
export type CategoriaFallo =
  | 'transporte'
  | 'tiempo'
  | 'limite'
  | 'servidor'
  | 'respuesta-invalida'
  | 'autenticacion'
  | 'permiso'
  | 'negocio'
  | 'version';

const TRANSITORIAS: CategoriaFallo[] = ['transporte', 'tiempo', 'limite', 'servidor', 'respuesta-invalida'];

export const esTransitoria = (categoria: CategoriaFallo | undefined | null) => !!categoria && TRANSITORIAS.includes(categoria);

export function categoriaDeEstado(estado: number): CategoriaFallo {
  if (estado === 429) return 'limite';
  if (estado === 401) return 'autenticacion';
  if (estado === 403) return 'permiso';
  if (estado >= 500) return 'servidor';
  return 'negocio';
}

// Retry-After puede venir en segundos o como fecha HTTP. Se acota a 5 minutos: un valor absurdo
// del proxy no puede dejar la pantalla esperando media hora.
export function retryAfterMs(valor: string | null | undefined, ahora = Date.now()): number | null {
  if (!valor) return null;
  const segundos = Number(valor);
  const ms = Number.isFinite(segundos) ? segundos * 1000 : Date.parse(valor) - ahora;
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, 5 * 60_000) : null;
}

/** Un fallo al hablar con el backend, con lo necesario para decidir y para el diagnóstico. */
export class FalloBackend extends Error {
  readonly categoria: CategoriaFallo;
  readonly estado: number | null;
  readonly reintentarEnMs: number | null;
  readonly requestId: string | null;
  constructor(
    mensaje: string,
    datos: { categoria: CategoriaFallo; estado?: number | null; reintentarEnMs?: number | null; requestId?: string | null; cause?: unknown },
  ) {
    super(mensaje, datos.cause === undefined ? undefined : { cause: datos.cause });
    this.name = 'FalloBackend';
    this.categoria = datos.categoria;
    this.estado = datos.estado ?? null;
    this.reintentarEnMs = datos.reintentarEnMs ?? null;
    this.requestId = datos.requestId ?? null;
  }
}

/** Lo que cruza de una acción de servidor al navegador: datos planos, sin la pila. */
export type FalloSerializado = { categoria: CategoriaFallo; transitorio: boolean; reintentarEnMs: number | null };

export function serializarFallo(error: unknown): FalloSerializado {
  const categoria: CategoriaFallo = error instanceof FalloBackend ? error.categoria : 'transporte';
  return { categoria, transitorio: esTransitoria(categoria), reintentarEnMs: error instanceof FalloBackend ? error.reintentarEnMs : null };
}

// El mensaje para la persona: el del backend en un rechazo de negocio o de permisos; uno propio en
// una falla temporal o desconocida (nunca el texto de un proxy ni un error interno).
export function mensajeDeFallo(error: unknown, porDefecto: string) {
  return error instanceof FalloBackend && !esTransitoria(error.categoria) && error.message ? error.message : porDefecto;
}

// Ids, tokens y patentes no van al log: solo la forma de la ruta.
export function rutaSanitizada(ruta: string) {
  return (ruta.split('?')[0] || '/')
    .split('/')
    .map((parte) =>
      /^[0-9a-f-]{20,}$/i.test(parte) || /^\d{3,}$/.test(parte) || parte.length > 40
        ? ':id'
        : /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/i.test(parte)
          ? ':patente'
          : parte,
    )
    .join('/');
}

export type DiagnosticoFallo = {
  operacion: string;
  categoria: CategoriaFallo;
  estado?: number | null;
  ms?: number;
  requestId?: string | null;
  railwayRequestId?: string | null;
  retryAfter?: string | null;
  contentType?: string | null;
};

// El mismo fallo periódico (la consulta de un cobro cada 4 s con el backend caído) se registra una
// vez por minuto con la cantidad de repeticiones, en vez de una línea cada vez.
const VENTANA_MS = 60_000;
const recientes = new Map<string, { desde: number; omitidos: number }>();

export function registrarFallo(diagnostico: DiagnosticoFallo, ahora = Date.now()) {
  const clave = `${diagnostico.categoria}|${diagnostico.operacion}|${diagnostico.estado ?? ''}`;
  const previo = recientes.get(clave);
  if (previo && ahora - previo.desde < VENTANA_MS) {
    previo.omitidos++;
    return false;
  }
  if (recientes.size > 200) recientes.clear();
  recientes.set(clave, { desde: ahora, omitidos: 0 });
  // Solo metadatos: nunca encabezados de autorización, cookies, cuerpos ni datos de la cuenta.
  console.warn(
    '[fallo-backend]',
    JSON.stringify({
      ...diagnostico,
      version: VERSION_APP.slice(0, 12),
      repeticionesOmitidas: previo?.omitidos || undefined,
    }),
  );
  return true;
}

export function _reiniciarRegistroDeFallos() {
  recientes.clear();
}

/**
 * Lee una respuesta del backend sin suponer que es JSON: el proxy de Railway contesta 429 con el
 * texto «rate limited» y una página HTML en un 502. Devuelve los datos o lanza un FalloBackend
 * con el mensaje del backend ({ code, message }) cuando lo hay.
 */
export async function leerRespuesta<T>(respuesta: Response, operacion: string, mensajePorDefecto: string): Promise<T> {
  const texto = await respuesta.text().catch(() => '');
  let datos: any = null;
  let jsonValido = true;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    jsonValido = false;
  }
  const requestId = respuesta.headers.get('x-request-id');
  if (!respuesta.ok) {
    const categoria = categoriaDeEstado(respuesta.status);
    const mensaje = Array.isArray(datos?.message) ? datos.message.join('. ') : typeof datos?.message === 'string' ? datos.message : null;
    // Un texto del proxy no se muestra: no es un mensaje para el cajero. Tampoco el «Unauthorized»
    // genérico de un 401: solo los rechazos de negocio y de permisos traen un mensaje propio.
    throw new FalloBackend(esTransitoria(categoria) || categoria === 'autenticacion' ? mensajePorDefecto : mensaje || mensajePorDefecto, {
      categoria,
      estado: respuesta.status,
      reintentarEnMs: retryAfterMs(respuesta.headers.get('retry-after')),
      requestId,
    });
  }
  if (!jsonValido) {
    registrarFallo({ operacion, categoria: 'respuesta-invalida', estado: respuesta.status, requestId, contentType: respuesta.headers.get('content-type') });
    throw new FalloBackend(mensajePorDefecto, { categoria: 'respuesta-invalida', estado: respuesta.status, requestId });
  }
  return datos as T;
}
