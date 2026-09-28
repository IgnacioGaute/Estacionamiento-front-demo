export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getTicketSchedule, getTickets } from '@/services/tickets.service';
import { PageHeader } from '@/components/page-header';
import { OperationSettings } from '../operation-settings';
import { VehicleTypesCard } from '../../tickets/components/vehicle-types-card';
import { TicketsTable } from '../../tickets/components/tickets-table';
import { ticketColumns } from '../../tickets/components/ticket-columns';
import { ExportTicketsExcel } from '../../components/export-ticket-excel';

export default async function OperationPage() {
  const user = await currentUser();
  if (user?.role?.toUpperCase() !== 'ADMIN') redirect('/tickets');
  const schedule = await getTicketSchedule();
  const tickets = schedule?.barcodeTicketsEnabled ? await getTickets() : null;
  const sortedTickets = [...(tickets?.data ?? [])].sort((a, b) => a.codeBar.localeCompare(b.codeBar, 'es', { numeric: true }));
  return <div className="container mx-auto max-w-5xl space-y-7 px-4 py-6">
    <Link href="/admin/configuracion" className="inline-flex items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft className="size-4" />Configuración</Link>
    <PageHeader title="Operación" breadcrumb={['Administración', 'Configuración', 'Operación']} description="Trabajá por patente y activá las opciones que necesite esta playa." />
    {schedule ? <OperationSettings shiftsEnabled={schedule.shiftsEnabled ?? false} barcodeTicketsEnabled={schedule.barcodeTicketsEnabled ?? false} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo cargar la configuración. Recargá la página antes de modificarla.</p>}
    <section id="vehiculos" className="scroll-mt-24"><VehicleTypesCard /></section>
    <section id="tarjetas" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Tarjetas físicas</h2><p className="mt-1 text-sm text-muted-foreground">El código identifica la tarjeta. Los importes se configuran en Tarifas.</p></div>{schedule?.barcodeTicketsEnabled && tickets && <div><ExportTicketsExcel tickets={sortedTickets} /></div>}</div>
      {!schedule ? <p className="text-sm text-muted-foreground">No se pudo consultar si las tarjetas están habilitadas.</p> : schedule.barcodeTicketsEnabled ? tickets ? <TicketsTable columns={ticketColumns} data={sortedTickets} /> : <p role="alert">No se pudieron cargar las tarjetas. Recargá para intentar nuevamente.</p> : <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Están desactivadas. Podés seguir trabajando por patente. Para administrar tarjetas, activá «Tickets por código de barras» arriba.</p>}
    </section>
  </div>;
}
