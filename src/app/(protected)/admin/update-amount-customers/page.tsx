export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import UpdateAmountCustomerCard from './components/update-amount-customer-card';
import { getRenterParkingTypes } from '@/services/customers.service';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';

const TOUR_STEPS = [
  {
    key: 'owner-type',
    selector: '[data-tour="amount-owner-type"]',
    title: 'Tipo de propietario',
    desc: 'Elegí a qué tipo de propietario pertenecen los inquilinos cuyo monto de abono querés actualizar.',
    radius: 8,
  },
  {
    key: 'negative',
    selector: '[data-tour="amount-negative"]',
    title: 'Sumar o restar',
    desc: 'Con el switch apagado el monto se suma al abono actual; activado, se resta.',
    radius: 8,
  },
  {
    key: 'value',
    selector: '[data-tour="amount-value"]',
    title: 'Monto a aplicar',
    desc: 'El valor a sumar o restar al abono de todos los inquilinos de ese tipo de propietario.',
    radius: 8,
  },
  {
    key: 'save',
    selector: '[data-tour="amount-save"]',
    title: 'Guardar cambios',
    desc: 'Aplica el ajuste a todos los inquilinos del tipo de propietario seleccionado.',
    radius: 8,
  },
];

export default async function OtherPaymentPage() {
  const renterParkingTypes = await getRenterParkingTypes();

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Actualizar Montos']}
        title="Actualizar Montos"
        description="Actualizar Monto Inquilinos."
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      <div className="mt-2">
        <UpdateAmountCustomerCard renterParkingTypes={renterParkingTypes?.data || []} />
      </div>
    </div>
  );
}
