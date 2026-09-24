export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmpresaDetalle } from './components/empresa-detalle';

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Misma puerta que el listado: ocultar el menú no alcanza, la ruta se puede escribir a mano.
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'SUPER_ADMIN')
    redirect('/tickets');

  const { id } = await params;
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <EmpresaDetalle empresaId={id} />
    </div>
  );
}
