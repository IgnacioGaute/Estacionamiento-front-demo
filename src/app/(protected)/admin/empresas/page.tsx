export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { EmpresasPanel } from './components/empresas-panel';

// Los pasos que dependen de que exista al menos una empresa se saltean solos si
// todavía no hay ninguna: PageTour pasa al siguiente cuando no encuentra el elemento.
const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'filtro',
    selector: '[data-tour="empresas-filtro"]',
    title: 'Ver una empresa sola',
    desc: 'Al elegir una empresa, las métricas, el gráfico y la lista de abajo pasan a mostrar solo lo suyo.',
    radius: 10,
  },
  {
    key: 'resumen',
    selector: '[data-tour="empresas-resumen"]',
    title: 'El pulso de la plataforma',
    desc: 'Altas, playas y usuarios, más lo cobrado en los últimos 30 días con las estadías y los turnos que siguen abiertos ahora mismo.',
    radius: 12,
  },
  {
    key: 'crear',
    selector: '[data-tour="empresas-crear"]',
    title: 'Dar de alta una empresa',
    desc: 'Una empresa nace vacía: después se le agregan sus playas y sus usuarios. Sus registros quedan separados del resto desde el primer día.',
    radius: 8,
  },
  {
    key: 'buscar',
    selector: '[data-tour="empresas-buscar"]',
    title: 'Buscar',
    desc: 'Filtra por nombre de empresa, de playa o de usuario, todo junto. Se combina con el filtro de empresa.',
    radius: 8,
  },
  {
    key: 'ficha',
    selector: '[data-tour="empresas-ficha"]',
    title: 'La ficha de cada empresa',
    desc: 'Cada fila muestra su estado, lo cobrado y cuándo fue su última operación. Se despliega para administrar sus playas y usuarios.',
    radius: 12,
  },
  {
    key: 'playas',
    selector: '[data-tour="empresas-playas"]',
    title: 'Playas de la empresa',
    desc: 'Acá se agregan las playas. Cada una lleva sus propios tickets, tarifas, caja y turnos, y los usuarios se asignan a una playa concreta.',
    radius: 10,
  },
];

export default async function EmpresasPage() {
  // Administración de la plataforma: solo el super admin. Ocultar el ítem del menú no alcanza,
  // la ruta se puede escribir a mano. El rol se normaliza porque llega con mayúsculas
  // inconsistentes, igual que en el resto del frontend.
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'SUPER_ADMIN') redirect('/tickets');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Plataforma', 'Administración', 'Empresas']}
        title="Empresas"
        description="Cada empresa con sus playas y sus usuarios. Acá se dan de alta y se asignan los accesos."
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      <div className="mt-2">
        <EmpresasPanel />
      </div>
    </div>
  );
}
