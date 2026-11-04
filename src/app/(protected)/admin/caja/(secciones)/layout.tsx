export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { modalidadActual } from '@/lib/modalidad.server';
import { ModalidadGratuitaAviso } from '@/components/solo-con-cobro';
import { getTicketSchedule } from '@/services/tickets.service';
import { PlanillaButton } from '../components/planilla-button';

// Caja: Turnos e Ingresos y gastos, cada una en su página (la barra lateral las despliega debajo de
// Caja). La planilla diaria es un diálogo y queda arriba, a mano desde las dos. /admin/caja (que sólo
// redirige) queda fuera de este grupo: redirigir con el layout ya enviado rompe el router en desarrollo.
export default async function CajaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')) redirect('/tickets');
  // En una playa gratuita no hay caja ni historial de cobros para mostrar. Lo cobrado antes se
  // conserva en la base y vuelve a verse si la playa vuelve a cobrar.
  if ((await modalidadActual()) === 'GRATUITO') return <ModalidadGratuitaAviso seccion="Caja" />;
  const shiftsEnabled = (await getTicketSchedule())?.shiftsEnabled === true;
  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Caja']}
        title="Caja"
        description={shiftsEnabled ? 'Consultá la planilla diaria, registrá ingresos y gastos y revisá los turnos.' : 'Consultá la planilla diaria y registrá ingresos y gastos.'}
        actions={<PlanillaButton />}
      />
      {children}
    </div>
  );
}
