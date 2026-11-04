export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { modalidadActual } from '@/lib/modalidad.server';

// Configuración: cada opción es una página y la barra lateral las despliega debajo de la sección.
export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) redirect('/tickets');
  const gratuita = (await modalidadActual()) === 'GRATUITO';
  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <PageHeader
        title="Configuración"
        breadcrumb={['Administración', 'Configuración']}
        description={gratuita ? 'Las opciones de trabajo de esta playa.' : <>Las opciones de trabajo de esta playa. Los importes y la forma de cobrar están en <Link href="/admin/tarifas" className="font-semibold text-gm-yellow underline underline-offset-4">Tarifas</Link>.</>}
      />
      {children}
    </div>
  );
}
