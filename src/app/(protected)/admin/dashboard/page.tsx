export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import {
  getCustomersSummary,
  getHourlyActivity,
  getOtherPaymentsSummary,
  getReceiptsSummary,
  getRevenueSummary,
} from '@/services/dashboard.service';
import { DashboardDateRangePicker } from './components/date-range-picker';
import { ActivityRevenueChart } from './components/activity-revenue-chart';
import { HourlyActivityAreaChart } from './components/hourly-activity-area-chart';
import { IncomeExpensesLineChart } from './components/income-expenses-line-chart';
import { ReceiptsGaugeChart } from './components/receipts-gauge-chart';
import { CustomersByTypeChart } from './components/customers-by-type-chart';
import { PaymentTypesBulletChart } from './components/payment-types-bullet-chart';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';

const TOUR_STEPS = [
  {
    key: 'activity',
    selector: '[data-tour="dashboard-activity"]',
    title: 'Actividad de recaudación',
    desc: 'Mapa de calor tipo GitHub con los últimos 140 días: cuanto más intenso el color, más se recaudó ese día. Siempre muestra esta ventana fija, sin importar el rango elegido abajo.',
    radius: 10,
  },
  {
    key: 'hourly-activity',
    selector: '[data-tour="dashboard-hourly-activity"]',
    title: 'Actividad por hora',
    desc: 'Entradas y salidas de tickets hora por hora — se ven los picos según cuándo entra y sale más gente. Tocá "Hoy" para elegir otro día.',
    radius: 10,
  },
  {
    key: 'range',
    selector: '[data-tour="dashboard-range"]',
    title: 'Rango de fechas',
    desc: 'Cambiá el período que se usa en los gráficos de ingresos/egresos, clientes y tipos de pago.',
    radius: 8,
  },
  {
    key: 'income-expenses',
    selector: '[data-tour="dashboard-income-expenses"]',
    title: 'Ingresos y egresos',
    desc: 'Evolución de los ingresos y egresos de "Varios" en el rango seleccionado.',
    radius: 10,
  },
  {
    key: 'receipts',
    selector: '[data-tour="dashboard-receipts"]',
    title: 'Recibos pagados vs. pendientes',
    desc: 'Tiene su propio filtro por mes, independiente del rango global de la página.',
    radius: 10,
  },
  {
    key: 'customers',
    selector: '[data-tour="dashboard-customers"]',
    title: 'Clientes por tipo',
    desc: 'Distribución de clientes entre propietarios, inquilinos y terceros.',
    radius: 10,
  },
  {
    key: 'payment-types',
    selector: '[data-tour="dashboard-payment-types"]',
    title: 'Tipos de pago',
    desc: 'Cómo se distribuyen los cobros entre efectivo, transferencia y otros medios en el rango seleccionado.',
    radius: 10,
  },
];

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; receiptsMonth?: string; hourlyDate?: string }>;
}) {
  const params = await searchParams;
  const argentinaNow = dayjs().tz('America/Argentina/Buenos_Aires');
  const from = params.from ?? argentinaNow.startOf('month').format('YYYY-MM-DD');
  const to = params.to ?? argentinaNow.format('YYYY-MM-DD');
  const hourlyDate = params.hourlyDate ?? argentinaNow.format('YYYY-MM-DD');

  // La actividad de recaudación siempre muestra su propia ventana fija de 140 días
  // (como un heatmap de GitHub) independiente del selector de rango de la página.
  const activityFrom = argentinaNow.subtract(139, 'day').format('YYYY-MM-DD');
  const activityTo = argentinaNow.format('YYYY-MM-DD');

  // Recibos pagados vs pendientes tiene su propio filtro por mes, independiente
  // del rango global de la página.
  const receiptsMonth = params.receiptsMonth ?? argentinaNow.format('YYYY-MM');
  const receiptsMonthFrom = dayjs.tz(receiptsMonth, 'America/Argentina/Buenos_Aires').startOf('month').format('YYYY-MM-DD');
  const receiptsMonthTo = dayjs.tz(receiptsMonth, 'America/Argentina/Buenos_Aires').endOf('month').format('YYYY-MM-DD');

  const [activityRevenue, hourlyActivity, otherPayments, receipts, receiptsForGauge, customers] = await Promise.all([
    getRevenueSummary({ from: activityFrom, to: activityTo }),
    getHourlyActivity(hourlyDate),
    getOtherPaymentsSummary({ from, to }),
    getReceiptsSummary({ from, to }),
    getReceiptsSummary({ from: receiptsMonthFrom, to: receiptsMonthTo }),
    getCustomersSummary({ from, to }),
  ]);

  return (
    <div className="gm-noise container mx-auto px-4 py-4 sm:p-6">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Dashboard']}
        title="Dashboard"
        className="mb-6"
        actions={<PageTour steps={TOUR_STEPS} />}
      />

      <div className="mb-4" data-tour="dashboard-activity">
        <ActivityRevenueChart data={activityRevenue} />
      </div>

      <div className="mb-4" data-tour="dashboard-hourly-activity">
        <HourlyActivityAreaChart data={hourlyActivity} date={hourlyDate} />
      </div>

      <div className="mb-3 flex justify-end" data-tour="dashboard-range">
        <DashboardDateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div data-tour="dashboard-income-expenses">
          <IncomeExpensesLineChart data={otherPayments} />
        </div>
        <div data-tour="dashboard-receipts">
          <ReceiptsGaugeChart data={receiptsForGauge} month={receiptsMonth} />
        </div>
        <div data-tour="dashboard-customers">
          <CustomersByTypeChart data={customers} />
        </div>
        <div data-tour="dashboard-payment-types">
          <PaymentTypesBulletChart data={receipts} />
        </div>
      </div>
    </div>
  );
}
