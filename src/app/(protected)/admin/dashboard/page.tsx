export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Link from 'next/link';

import { getHourlyActivity } from '@/services/dashboard.service';
import { panelResumen } from '@/services/operaciones.service';
import { getDeudoresAction } from '@/actions/cuentas/cuentas.action';
import { HourlyActivityAreaChart } from './components/hourly-activity-area-chart';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';
import { modalidadActual } from '@/lib/modalidad.server';
import type { CompararPanel, VerPanel } from '@/types/panel.type';
import { PanelCliente } from './panel/panel-cliente';

dayjs.extend(utc);
dayjs.extend(timezone);

const TOUR_STEPS = [
  { key: 'filtros', selector: '[data-tour="panel-filtros"]', title: 'El período', desc: 'Elegí un atajo (Hoy, 7 días, Este mes…) o tus propias fechas, con qué compararlo y si lo querés ver por día, semana o mes. Todo el panel cambia junto.', radius: 16 },
  { key: 'cobrado', selector: '[data-tour="panel-cobrado"]', title: 'Lo cobrado', desc: 'El total del período y cuánto cambió. Pasá el mouse por la curva para ver cada día; la línea gris es el período con el que se compara.', radius: 24 },
  { key: 'adentro', selector: '[data-tour="panel-adentro"]', title: 'Autos adentro', desc: 'Un reloj de hoy: cada barra es una hora y muestra cuántos autos había. No cambia con el período.', radius: 24 },
  { key: 'dias', selector: '[data-tour="panel-dias"]', title: 'Tus días', desc: 'Cada cuadradito es un día de las últimas 20 semanas: más amarillo, más cobrado. Tocá uno para ver ese día.', radius: 24 },
  { key: 'pagos', selector: '[data-tour="panel-pagos"]', title: 'Cómo te pagaron', desc: 'Efectivo, transferencia y QR en el período elegido.', radius: 24 },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; comparar?: string; ver?: string; hourlyDate?: string }>;
}) {
  const params = await searchParams;
  const argentinaNow = dayjs().tz('America/Argentina/Buenos_Aires');

  // Playa gratuita: sin recaudación, ingresos ni medios de pago. Queda el movimiento de vehículos.
  if ((await modalidadActual()) === 'GRATUITO') {
    const hourlyDate = params.hourlyDate ?? argentinaNow.format('YYYY-MM-DD');
    const hourly = await getHourlyActivity(hourlyDate);
    return (
      <div className="gm-noise container mx-auto px-4 py-4 sm:p-6">
        <PageHeader
          breadcrumb={['Estacionamiento', 'Administración', 'Panel']}
          title="Panel"
          description="Playa en modalidad gratuita: entradas y salidas de vehículos, sin importes."
          className="mb-6"
        />
        <div className="mb-4">
          <HourlyActivityAreaChart data={hourly} date={hourlyDate} />
        </div>
        <Link href="/admin/vehiculos" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          Ver la planilla de vehículos
        </Link>
      </div>
    );
  }

  // Por defecto, este mes comparado con los mismos días del período anterior.
  const comparar: CompararPanel = params.comparar === 'anio' || params.comparar === 'no' ? params.comparar : 'anterior';
  const desde = params.desde ?? argentinaNow.startOf('month').format('YYYY-MM-DD');
  const hasta = params.hasta ?? argentinaNow.format('YYYY-MM-DD');
  const [resultado, deudores] = await Promise.all([
    panelResumen({ desde, hasta, comparar }),
    getDeudoresAction().catch(() => null),
  ]);

  return (
    <div className="container mx-auto px-4 py-4 sm:p-6">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Panel']}
        title="Panel"
        description="Así viene tu playa."
        className="mb-5"
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      {resultado.data
        ? <PanelCliente panel={resultado.data} comparar={comparar} ver={params.ver as VerPanel | undefined} deudores={deudores?.data ?? null} />
        : <div role="alert" className="space-y-3 rounded-2xl border border-destructive/40 p-5">
            <p className="font-semibold">{resultado.error}</p>
            <Link href="/admin/dashboard" className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-semibold hover:border-gm-yellow/40">Volver al período de este mes</Link>
          </div>}
    </div>
  );
}
