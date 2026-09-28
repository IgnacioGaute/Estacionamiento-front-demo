export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MetricasPanel } from './components/metricas-panel';

export default async function MetricasPage() {
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'SUPER_ADMIN')
    redirect('/tickets');

  // El encabezado vive en el panel: el rango de fechas y los controles dependen del período.
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <MetricasPanel />
    </div>
  );
}
