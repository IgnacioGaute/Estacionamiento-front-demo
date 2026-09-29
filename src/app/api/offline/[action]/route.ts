import { auth } from '@/auth';
import { getAuthHeaders } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const session = await auth();
  if (!session?.token || !session.user?.id) return Response.json({ message: 'Iniciá sesión con el mismo usuario para sincronizar.' }, { status: 401 });
  const { action } = await context.params;
  if (!['prepare', 'sync', 'finish'].includes(action)) return Response.json({ message: 'Acción no encontrada.' }, { status: 404 });
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const requestOrigin = new URL(request.url).origin;
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const sameOrigin = request.headers.get('sec-fetch-site') === 'same-origin';
  // El encabezado propio exige fetch desde la app; un formulario externo no puede enviarlo.
  // Algunos navegadores móviles omiten Origin en solicitudes al mismo sitio.
  if (request.headers.get('x-parking-offline') !== '1' ||
      (!sameOrigin && origin !== null && origin !== requestOrigin && origin !== forwardedOrigin)) {
    return Response.json({ message: 'La solicitud no pertenece a este sistema.' }, { status: 403 });
  }
  try {
    const body = await request.text();
    if (body.length > 10000) return Response.json({ message: 'La operación supera el tamaño permitido.' }, { status: 413 });
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/offline/${action}`, { method: 'POST', headers: await getAuthHeaders(), body, cache: 'no-store', signal: AbortSignal.timeout(25000) });
    const payload = await response.text();
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return Response.json({ message: 'El servidor no pudo preparar el modo sin conexión. Reintentá con la sesión activa.' }, { status: 502 });
    }
    return new Response(payload, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });
  } catch { return Response.json({ message: 'No se pudo conectar. La operación seguirá pendiente.' }, { status: 503 }); }
}
