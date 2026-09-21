export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { CajaActions } from './components/caja-actions';

const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'turno',
    selector: '[data-tour="caja-turno"]',
    title: 'El turno de ahora',
    desc: 'Desde acá se abre y se cierra el turno de caja. Muestra el efectivo esperado según el fondo inicial más todo lo cobrado desde la apertura.',
    radius: 10,
  },
  {
    key: 'planilla',
    selector: '[data-tour="caja-planilla"]',
    title: 'Planilla diaria',
    desc: 'La caja del día por fecha, con el detalle de los movimientos. Un turno que cruza la medianoche aparece en la planilla de cada día, con la parte del efectivo que le corresponde.',
    radius: 8,
  },
  {
    key: 'rangos',
    selector: '[data-tour="caja-rangos"]',
    title: 'Períodos rápidos',
    desc: 'Hoy, ayer, los últimos 7 días o todo, según la fecha de cierre. Si empezó ayer y cerró hoy, aparece en Hoy.',
    radius: 10,
  },
  {
    key: 'fechas',
    selector: '[data-tour="caja-fechas"]',
    title: 'Cualquier fecha y cualquier operador',
    desc: 'Abrí Más filtros para elegir fechas de cierre o el operador que abrió el turno.',
    radius: 10,
  },
  {
    key: 'totales',
    selector: '[data-tour="caja-totales"]',
    title: 'El resumen del período',
    desc: 'Cantidad de cierres del período, cuántos tuvieron diferencias y cuántos no registraron conteo de efectivo.',
    radius: 10,
  },
  {
    key: 'tabla',
    selector: '[data-tour="caja-tabla"]',
    title: 'Turno por turno',
    desc: 'Abrí una tarjeta para ver el efectivo inicial, esperado, contado, retirado y dejado para el siguiente turno, las observaciones y quién cerró. Se muestran cinco cierres por página.',
    radius: 8,
  },
];

export default async function CajaHistorialPage() {
  // El arqueo de cada operador es información sensible entre compañeros: ocultar el ítem del
  // menú no alcanza, la ruta se puede escribir a mano. El rol se normaliza igual que en
  // AdminNavbarSidebar — llega con mayúsculas inconsistentes y comparar exacto rebota al admin.
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'ADMIN') redirect('/tickets');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Historial de turnos']}
        title="Historial de turnos"
        description="Revisá cuánto se contó, cuánto se retiró y cuánto quedó para el siguiente operador. La planilla diaria agrupa los movimientos por fecha."
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      <div className="mt-2">
        <CajaActions />
      </div>
    </div>
  );
}
