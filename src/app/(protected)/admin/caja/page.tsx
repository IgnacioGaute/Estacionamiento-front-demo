export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { modalidadActual } from '@/lib/modalidad.server';
import { ModalidadGratuitaAviso } from '@/components/solo-con-cobro';
import { CajaActions } from './components/caja-actions';
import { PlanillaButton } from './components/planilla-button';
import { getTicketSchedule } from '@/services/tickets.service';
import { CajaSecciones } from './components/caja-secciones';
import { getExpenses } from '@/services/expenses.service';
import { ExpenseTable } from '../other-payments/components/other-payment-table';
import { expenseColumns } from '../other-payments/components/other-payment-columns';

export default async function CajaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')) redirect('/tickets');
  // En una playa gratuita no hay caja ni historial de cobros para mostrar. Lo cobrado antes se
  // conserva en la base y vuelve a verse si la playa vuelve a cobrar.
  if ((await modalidadActual()) === 'GRATUITO') return <ModalidadGratuitaAviso seccion="Caja" />;
  const query = await searchParams;
  const schedule = await getTicketSchedule();
  const shiftsEnabled = schedule?.shiftsEnabled === true;
  // Con turnos activos, Caja abre en Turnos: es lo que el administrador revisa a diario. Las dos
  // secciones se cargan juntas y se cambian en la misma página (CajaSecciones).
  const tab = shiftsEnabled && query.tab !== 'movimientos' ? 'turnos' : 'movimientos';
  const params = Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'tab'));
  const expenses = await getExpenses(undefined, params);
  return <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-8">
    <PageHeader breadcrumb={['Estacionamiento', 'Administración', 'Caja']} title="Caja" description={shiftsEnabled ? 'Consultá la planilla diaria, registrá ingresos y gastos y revisá los turnos.' : 'Consultá la planilla diaria y registrá ingresos y gastos.'} actions={<PlanillaButton />} />
    <CajaSecciones
      inicial={tab}
      turnos={shiftsEnabled ? <CajaActions shiftsEnabled /> : null}
      movimientos={<section className="space-y-4"><div><h2 className="text-lg font-semibold">Ingresos y gastos adicionales</h2><p className="mt-1 text-sm text-muted-foreground">Los movimientos que antes cargabas en «Varios». Los cobros de estacionamiento se consultan en la planilla diaria.</p></div>{expenses ? <ExpenseTable columns={expenseColumns} data={expenses.data || []} total={expenses.meta.totalItems || 0} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudieron cargar los movimientos. Recargá para intentar nuevamente.</p>}</section>}
    />
  </div>;
}
