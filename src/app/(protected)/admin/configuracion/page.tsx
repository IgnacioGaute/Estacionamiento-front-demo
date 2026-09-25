export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, CreditCard } from 'lucide-react';
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

    {/* La cuenta de cobro es de la empresa, no de la playa: por eso vive en su propia pantalla
        y no entre los interruptores de arriba. */}
    <Link
      href="/admin/configuracion/mercadopago"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30 sm:p-6"
    >
      <CreditCard className="size-5 shrink-0 text-gm-yellow" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Cobro con MercadoPago</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá la cuenta donde entra el dinero de los cobros con QR. Vale para todas las playas de la empresa.
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  </div>;
}
