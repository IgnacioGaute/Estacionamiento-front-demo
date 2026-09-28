import { redirect } from 'next/navigation';

// Conserva los enlaces guardados mientras cada tarea pasa a su sección propia.
export default async function TicketsAdminRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (params.crear === 'ticket' || params.tab === 'tickets') redirect('/admin/configuracion/operacion#tarjetas');
  if (params.tab === 'vehiculos') redirect('/admin/configuracion/operacion#vehiculos');
  if (params.tab === 'comprobantes') redirect('/admin/configuracion/comprobantes');
  redirect(params.tab === 'tarifasDiaSemanaMes' ? '/admin/tarifas?tab=pases' : '/admin/tarifas');
}
