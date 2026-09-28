export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getTicketSchedule } from '@/services/tickets.service';
import { PageHeader } from '@/components/page-header';
import { ReceiptDeliveryCard } from '../../tickets/components/receipt-delivery-card';

export default async function ReceiptSettingsPage() {
  const user = await currentUser();
  if (user?.role?.toUpperCase() !== 'ADMIN') redirect('/tickets');
  const schedule = await getTicketSchedule();
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
    <Link href="/admin/configuracion" className="inline-flex items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft className="size-4" />Configuración</Link>
    <PageHeader title="Comprobantes" breadcrumb={['Administración', 'Configuración', 'Comprobantes']} description="Elegí cómo entregar los comprobantes de entrada y salida y los recibos de pago de los inquilinos de esta playa." />
    {schedule ? <ReceiptDeliveryCard initial={schedule.receiptDelivery} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo cargar la configuración. Recargá antes de modificarla.</p>}
  </div>;
}
