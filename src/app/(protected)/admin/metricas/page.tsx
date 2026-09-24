export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { MetricasPanel } from './components/metricas-panel';

export default async function MetricasPage() {
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'SUPER_ADMIN')
    redirect('/tickets');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Plataforma', 'Administración', 'Métricas']}
        title="Cómo viene el mes"
        description="Lo cobrado, las estadías y las horas de mayor movimiento en todas las playas."
      />
      <div className="mt-2">
        <MetricasPanel />
      </div>
    </div>
  );
}
