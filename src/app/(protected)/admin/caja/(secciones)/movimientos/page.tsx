export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { getExpenses } from '@/services/expenses.service';
import { EncabezadoSeccion } from '@/components/encabezado-seccion';
import { ExpenseTable } from '../../../other-payments/components/other-payment-table';
import { expenseColumns } from '../../../other-payments/components/other-payment-columns';

export default async function CajaMovimientosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const params = Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const expenses = await getExpenses(undefined, params);
  return <section className="space-y-4">
    <EncabezadoSeccion title="Ingresos y gastos adicionales" description="Los movimientos que antes cargabas en «Varios». Los cobros de estacionamiento se consultan en la planilla diaria." />
    {expenses
      ? <ExpenseTable columns={expenseColumns} data={expenses.data || []} total={expenses.meta.totalItems || 0} />
      : <p role="alert" className="rounded-xl border border-destructive p-4">No se pudieron cargar los movimientos. Recargá para intentar nuevamente.</p>}
  </section>;
}
