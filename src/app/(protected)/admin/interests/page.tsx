export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { getinterests } from '@/services/customers.service';
import { getUsers } from '@/services/users.service';
import CardInterest from './components/create-interest-card';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';

const TOUR_STEPS = [
  {
    key: 'owner',
    selector: '[data-tour="interests-owner"]',
    title: 'Interés para propietarios',
    desc: 'El número que cargues acá se suma cada 10 días de atraso, aplicándose a los propietarios que se pasen de esos 10 días después del día 1 de cada mes.',
    radius: 8,
  },
  {
    key: 'renter',
    selector: '[data-tour="interests-renter"]',
    title: 'Interés para inquilinos',
    desc: 'Misma lógica que el de propietarios, pero aplicado a los inquilinos morosos.',
    radius: 8,
  },
  {
    key: 'save',
    selector: '[data-tour="interests-save"]',
    title: 'Guardar cambios',
    desc: 'Confirmá los nuevos valores de interés para que se apliquen a partir de ahora.',
    radius: 8,
  },
];

export default async function InterestPage() {
  const interests = await getinterests();


  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Intereses']}
        title="Administrar Intereses"
        description="Gestiona los intereses de los clientes."
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      <div className="mt-2">
        <CardInterest interests={interests}/>
      </div>
    </div>
  );
}
