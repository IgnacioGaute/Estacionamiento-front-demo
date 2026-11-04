export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { modalidadActual } from '@/lib/modalidad.server';
import { seccionesAdmin } from '@/components/navegation/secciones-admin';

// Configuración no tiene portada: abre directo en su primera opción, la misma que despliega la barra
// lateral.
export default async function ConfigurationPage() {
  const user = await currentUser();
  const cobro = (await modalidadActual()) !== 'GRATUITO';
  const configuracion = seccionesAdmin(cobro, user?.role === 'SUPER_ADMIN').find((s) => s.url === '/admin/configuracion');
  redirect(configuracion?.items?.[0]?.url ?? '/admin/configuracion/vehiculos');
}
