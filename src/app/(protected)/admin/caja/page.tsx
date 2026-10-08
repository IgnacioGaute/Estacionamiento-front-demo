export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { CajaActions } from './components/caja-actions';
import { PlanillaButton } from './components/planilla-button';
import { getTicketSchedule } from '@/services/tickets.service';
import { getExpenses } from '@/services/expenses.service';
import { ExpenseTable } from '../other-payments/components/other-payment-table';
import { expenseColumns } from '../other-payments/components/other-payment-columns';

export default async function CajaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'ADMIN') redirect('/tickets');
  const query = await searchParams;
  const schedule = await getTicketSchedule();
  const shiftsEnabled = schedule?.shiftsEnabled === true;
  if (query.tab === 'turnos' && !shiftsEnabled) redirect('/admin/caja');
  const tab = query.tab === 'turnos' && shiftsEnabled ? 'turnos' : 'movimientos';
  const params = Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'tab'));
  const expenses = tab === 'movimientos' ? await getExpenses(undefined, params) : null;
  return <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-8">
    <PageHeader breadcrumb={['Estacionamiento', 'Administración', 'Caja']} title="Caja" description={shiftsEnabled ? 'Consultá la planilla diaria, registrá ingresos y gastos y revisá los turnos.' : 'Consultá la planilla diaria y registrá ingresos y gastos.'} actions={tab === 'movimientos' ? <PlanillaButton /> : undefined} />
    <nav aria-label="Secciones de caja" className="flex flex-wrap gap-2 border-b border-border pb-3">
      {[{ value: 'movimientos', label: 'Ingresos y gastos' }, ...(shiftsEnabled ? [{ value: 'turnos', label: 'Turnos' }] : [])].map(item => <Link key={item.value} href={'/admin/caja?tab=' + item.value} aria-current={tab === item.value ? 'page' : undefined} className={'rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ' + (tab === item.value ? 'border-gm-yellow/40 bg-gm-yellow/10 text-gm-yellow' : 'border-border hover:bg-secondary/40')}>{item.label}</Link>)}
    </nav>
    {tab === 'turnos' ? schedule ? <CajaActions shiftsEnabled={schedule.shiftsEnabled === true} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudo consultar la configuración de turnos. Recargá para intentar nuevamente.</p> : <section className="space-y-4"><div><h2 className="text-lg font-semibold">Ingresos y gastos adicionales</h2><p className="mt-1 text-sm text-muted-foreground">Los movimientos que antes cargabas en «Varios». Los cobros de estacionamiento se consultan en la planilla diaria.</p></div>{expenses ? <ExpenseTable columns={expenseColumns} data={expenses.data || []} total={expenses.meta.totalItems || 0} /> : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudieron cargar los movimientos. Recargá para intentar nuevamente.</p>}</section>}
  </div>;
}
