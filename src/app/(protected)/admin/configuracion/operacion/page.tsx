export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getTicketSchedule } from '@/services/tickets.service';
import { PageHeader } from '@/components/page-header';
import { OperationSettings } from '../operation-settings';
import { OperationTabs } from './operation-tabs';
import { VehicleTypesCard } from '../../tickets/components/vehicle-types-card';

export default async function OperationPage() {
  const user = await currentUser();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) redirect('/tickets');
  const schedule = await getTicketSchedule();
  return <div className="container mx-auto max-w-4xl space-y-7 px-4 py-6">
    <Link href="/admin/configuracion" className="inline-flex items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft className="size-4" />Configuración</Link>
    <PageHeader title="Operación" breadcrumb={['Administración', 'Configuración', 'Operación']} description="Trabajá por patente y activá las opciones que necesite esta playa." />
    <OperationTabs panels={{
      turnos: schedule ? <OperationSettings sueldoAutomatico={schedule.sueldoAutomatico} sueldosPorUsuario={schedule.sueldosPorUsuario} shiftsEnabled={schedule.shiftsEnabled ?? false} multipleShiftsEnabled={schedule.multipleShiftsEnabled ?? false} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo cargar la configuración. Recargá la página antes de modificarla.</p>,
      vehiculos: <VehicleTypesCard />,
    }} />
  </div>;
}
