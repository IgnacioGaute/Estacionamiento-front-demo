export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getTicketSchedule } from '@/services/tickets.service';
import { modalidadActual } from '@/lib/modalidad.server';
import { EncabezadoSeccion } from '@/components/encabezado-seccion';
import { OperationSettings } from '../operation-settings';

export default async function TurnosConfigPage() {
  // En una playa gratuita no hay caja ni turnos.
  if ((await modalidadActual()) === 'GRATUITO') redirect('/admin/configuracion/vehiculos');
  const schedule = await getTicketSchedule();
  return <>
    <EncabezadoSeccion title="Turnos de caja" description="Cada operador abre su turno y la caja cierra con sus totales. Elegí cómo trabajan con el dinero." />
    {schedule
      ? <OperationSettings sueldoAutomatico={schedule.sueldoAutomatico} sueldosPorUsuario={schedule.sueldosPorUsuario} shiftsEnabled={schedule.shiftsEnabled ?? false} multipleShiftsEnabled={schedule.multipleShiftsEnabled ?? false} />
      : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo cargar la configuración. Recargá la página antes de modificarla.</p>}
  </>;
}
