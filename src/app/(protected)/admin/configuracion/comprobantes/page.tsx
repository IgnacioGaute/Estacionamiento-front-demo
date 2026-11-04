export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getTicketSchedule } from '@/services/tickets.service';
import { EncabezadoSeccion } from '@/components/encabezado-seccion';
import { ReceiptDeliveryCard } from '../../tickets/components/receipt-delivery-card';

export default async function ReceiptSettingsPage() {
  const user = await currentUser();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) redirect('/tickets');
  const schedule = await getTicketSchedule();
  return <>
    <EncabezadoSeccion title="Comprobantes" description="Elegí cómo entregar los comprobantes de entrada y salida y los recibos de pago de los inquilinos de esta playa." />
    {schedule ? <ReceiptDeliveryCard initial={schedule.receiptDelivery} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo cargar la configuración. Recargá antes de modificarla.</p>}
  </>;
}
