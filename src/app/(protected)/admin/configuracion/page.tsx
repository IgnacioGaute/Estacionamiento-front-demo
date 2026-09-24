export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getTicketSchedule } from '@/services/tickets.service';
import { PageHeader } from '@/components/page-header';
import { OperationSettings } from './operation-settings';

export default async function ConfigurationPage() {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') redirect('/tickets');
  const schedule = await getTicketSchedule();
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
    <PageHeader title="Configuración" breadcrumb={['Administración', 'Configuración']} description="Elegí cómo trabaja esta playa. Los cambios se aplican a sus operadores." />
    {schedule ? <OperationSettings shiftsEnabled={schedule.shiftsEnabled ?? true} barcodeTicketsEnabled={schedule.barcodeTicketsEnabled} /> : <p role="alert">No se pudo cargar la configuración. Recargá la página antes de modificarla.</p>}
  </div>;
}
