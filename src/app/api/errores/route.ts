import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

// Los errores que llegan a la pantalla «La aplicación tuvo un error». En el celular la consola
// del navegador no se ve, así que la propia pantalla los manda acá y quedan en los logs del
// servicio del front en Railway, en una línea que empieza con [error-cliente].
//
// No se guarda nada: solo se escribe el log. Es pública porque el error puede pasar con la sesión
// vencida; por eso todo se recorta y se ignora lo que no sea texto.
export const dynamic = 'force-dynamic';

const texto = (valor: unknown, max: number) => (typeof valor === 'string' ? valor.slice(0, max) : undefined);

export async function POST(request: Request) {
  let datos: Record<string, unknown> = {};
  try {
    datos = JSON.parse((await request.text()).slice(0, 10_000));
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const session = await auth().catch(() => null);
  const playa = (await cookies()).get('parking-playa')?.value?.split(':')[1];
  console.error(
    '[error-cliente]',
    JSON.stringify({
      cuando: new Date().toISOString(),
      usuario: session?.user?.email ?? null,
      rol: session?.user?.role ?? null,
      playa: playa ?? null,
      ruta: texto(datos.ruta, 300),
      version: texto(datos.version, 60),
      nombre: texto(datos.nombre, 100),
      mensaje: texto(datos.mensaje, 1000),
      digest: texto(datos.digest, 100),
      pila: texto(datos.pila, 2500),
      agente: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    }),
  );
  return new NextResponse(null, { status: 204 });
}
