import { getAuthHeaders } from '@/lib/auth';

// El navegador no tiene el token de sesión: las llamadas al backend salen del
// servidor. Para poder mostrar la respuesta a medida que se genera, esta ruta
// hace de puente — recibe el pedido del widget, lo reenvía con las cabeceras de
// autenticación y devuelve el mismo stream tal cual, sin juntarlo en memoria.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let cuerpo: unknown;
  try { cuerpo = await request.json(); } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }); }

  const mensaje = (cuerpo as { message?: unknown })?.message;
  if (typeof mensaje !== 'string' || !mensaje.trim() || mensaje.length > 1500) {
    return Response.json({ error: 'Escribí una pregunta de hasta 1500 caracteres.' }, { status: 400 });
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assistant/chat/stream`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(cuerpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    return Response.json({ error: 'No pudimos conectar con el asistente.' }, { status: 502 });
  }

  if (!respuesta.ok || !respuesta.body) {
    return Response.json({ error: 'No se pudo consultar el asistente.' }, { status: respuesta.status || 502 });
  }

  return new Response(respuesta.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
