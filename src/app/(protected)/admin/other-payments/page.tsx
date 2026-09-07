export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { expenseColumns } from './components/other-payment-columns';
import { ExpenseTable } from './components/other-payment-table';
import { getExpenses } from '@/services/expenses.service';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';

const TOUR_STEPS = [
  {
    key: 'create',
    selector: '[data-tour="varios-create"]',
    title: 'Registrar un ingreso o egreso',
    desc: 'Cargá un movimiento suelto de caja: elegí si es Ingreso o Egreso, si se cobró en Efectivo o Transferencia, una descripción y el monto.',
    radius: 6,
  },
  {
    key: 'transfer',
    selector: '[data-tour="varios-table"]',
    title: 'Efectivo vs. Transferencia',
    desc: 'La forma de pago se ve como badge (EF/TR) en cada fila. Los movimientos por transferencia no afectan el total de efectivo físico de la caja, igual que en los recibos.',
    radius: 10,
  },
  {
    key: 'filter',
    selector: '[data-tour="varios-filter"]',
    title: 'Buscar un movimiento',
    desc: 'Filtrá la lista escribiendo parte de la descripción del ingreso o egreso.',
    radius: 6,
  },
];

export default async function OtherPaymentPage() {
  const expenses = await getExpenses()
  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Varios']}
        title="Varios"
        description="Registra ingresos y egresos de caja."
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      <div className="mt-2">
        <ExpenseTable
          columns={expenseColumns}
          data={expenses|| []}
        />
      </div>
    </div>
  );
}
