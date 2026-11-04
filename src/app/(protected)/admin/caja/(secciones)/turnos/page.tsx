export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { redirect } from 'next/navigation';
import { getTicketSchedule } from '@/services/tickets.service';
import { CajaActions } from '../../components/caja-actions';

export default async function CajaTurnosPage() {
  // Sin turnos activos no hay nada que revisar acá.
  if ((await getTicketSchedule())?.shiftsEnabled !== true) redirect('/admin/caja/movimientos');
  return <CajaActions shiftsEnabled />;
}
