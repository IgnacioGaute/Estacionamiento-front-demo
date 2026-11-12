import { NextResponse } from 'next/server';
import { VERSION_APP } from '@/lib/version-app';
import { tenantFetch } from '@/lib/tenant-fetch';

// Disponibilidad del front para el healthcheck de Railway y las pruebas de humo. Pública y sin
// datos: solo dice que el servidor arrancó con esta compilación (y su versión).
//
// Con ?backend=1 además consulta /salud del backend por el mismo camino que usan las páginas
// (tenantFetch: API_INTERNAL_URL si está configurada). Así se comprueba la red privada sin una
// sesión. No usarlo como healthcheck de Railway: un backend caído no debe impedir desplegar el front.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cuerpo: Record<string, unknown> = { estado: 'listo', version: VERSION_APP };
  let codigo = 200;
  if (new URL(request.url).searchParams.get('backend') === '1') {
    const inicio = Date.now();
    try {
      const respuesta = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/salud`);
      const datos = (await respuesta.json().catch(() => null)) as { estado?: string; version?: string } | null;
      cuerpo.backend = { estado: respuesta.ok && datos?.estado === 'listo' ? 'listo' : 'con-problemas', http: respuesta.status, version: datos?.version ?? null, ms: Date.now() - inicio, redPrivada: !!process.env.API_INTERNAL_URL };
      if (!respuesta.ok) codigo = 503;
    } catch {
      cuerpo.backend = { estado: 'sin-respuesta', ms: Date.now() - inicio, redPrivada: !!process.env.API_INTERNAL_URL };
      codigo = 503;
    }
  }
  return NextResponse.json(cuerpo, { status: codigo, headers: { 'Cache-Control': 'no-store' } });
}
