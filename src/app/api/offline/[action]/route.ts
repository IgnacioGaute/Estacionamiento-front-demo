import { auth } from '@/auth';
import { getAuthHeaders } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const session = await auth();
  if (!session?.token || !session.user?.id) return Response.json({ message: 'Iniciá sesión con el mismo usuario para sincronizar.' }, { status: 401 });
  const { action } = await context.params;
  if (!['prepare', 'sync', 'finish'].includes(action)) return new Response(null, { status: 404 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 10000) return new Response(null, { status: 413 });
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/offline/${action}`, { method: 'POST', headers: await getAuthHeaders(), body, cache: 'no-store', signal: AbortSignal.timeout(25000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });
  } catch { return Response.json({ message: 'No se pudo conectar. La operación seguirá pendiente.' }, { status: 503 }); }
}
