import { FalloBackend, categoriaDeEstado, registrarFallo, rutaSanitizada } from './fallos-backend';

// Una lectura que no contesta en este tiempo se da por fallida: sin límite, un backend colgado
// dejaba la pantalla esperando para siempre. Las escrituras no se cortan desde acá: su resultado
// quedaría desconocido, y quien las llama decide (consultar el estado antes de repetir).
const ESPERA_LECTURA_MS = 20_000;

const nuevoId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Operational responses must revalidate access on every request, including after a
// parking-lot assignment is revoked. Do not reuse Next's shared data cache here.
export async function tenantFetch(input: RequestInfo | URL, init?: RequestInit) {
  const servidor = typeof window === 'undefined';
  const internalUrl = servidor && process.env.API_INTERNAL_URL;
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  let target = input;
  let rutaApi: string | null = null;
  if (publicUrl) {
    try {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, publicUrl);
      const base = new URL(publicUrl);
      const prefix = base.pathname.replace(/\/$/, '');
      // Solo la API configurada cambia de destino: nunca reenviar credenciales de otros servicios.
      if (url.origin === base.origin && (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
        rutaApi = url.pathname.slice(prefix.length) || '/';
        if (internalUrl) {
          const internal = new URL(internalUrl);
          internal.pathname = internal.pathname.replace(/\/$/, '') + url.pathname.slice(prefix.length);
          internal.search = url.search;
          target = typeof input === 'string' || input instanceof URL ? internal : new Request(internal, input);
        }
      }
    } catch {
      // Una URL que no se puede interpretar sigue su camino original.
    }
  }
  if (!rutaApi || !servidor) return globalThis.fetch(target, { ...init, cache: 'no-store', next: undefined });

  // Desde acá, solo pedidos del servidor del front a la API propia.
  const metodo = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const operacion = `${metodo} ${rutaSanitizada(rutaApi)}`;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  // Correlación con los logs del backend (src/common/solicitud.middleware.ts).
  if (!headers.has('x-request-id')) headers.set('X-Request-Id', nuevoId());
  const requestId = headers.get('x-request-id');
  const lectura = metodo === 'GET' || metodo === 'HEAD';
  // El middleware corre en el runtime edge: se usan las señales solo si existen.
  const limite = lectura && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ESPERA_LECTURA_MS) : null;
  const signal = limite && init?.signal ? (typeof AbortSignal.any === 'function' ? AbortSignal.any([init.signal, limite]) : init.signal) : (limite ?? init?.signal ?? undefined);
  const inicio = Date.now();
  let respuesta: Response;
  try {
    respuesta = await globalThis.fetch(target, { ...init, headers, signal, cache: 'no-store', next: undefined });
  } catch (error) {
    // Cancelación pedida por quien llama: se respeta tal cual.
    if (init?.signal?.aborted) throw error;
    const categoria = limite?.aborted ? 'tiempo' : 'transporte';
    registrarFallo({ operacion, categoria, ms: Date.now() - inicio, requestId });
    throw new FalloBackend('No se pudo conectar con el servidor.', { categoria, requestId, cause: error });
  }
  if (respuesta.status === 429 || respuesta.status >= 500 || respuesta.status === 401 || respuesta.status === 403) {
    registrarFallo({
      operacion,
      categoria: categoriaDeEstado(respuesta.status),
      estado: respuesta.status,
      ms: Date.now() - inicio,
      requestId: respuesta.headers.get('x-request-id') ?? requestId,
      railwayRequestId: respuesta.headers.get('x-railway-request-id'),
      retryAfter: respuesta.headers.get('retry-after'),
      contentType: respuesta.headers.get('content-type'),
    });
  }
  return respuesta;
}
