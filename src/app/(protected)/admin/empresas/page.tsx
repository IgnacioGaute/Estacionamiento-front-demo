export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { EmpresasPanel } from './components/empresas-panel';

// Los pasos que dependen de que exista al menos una empresa se saltean solos si
// todavía no hay ninguna: PageTour pasa al siguiente cuando no encuentra el elemento.
const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'resumen',
    selector: '[data-tour="empresas-resumen"]',
    title: 'El pulso de la plataforma',
    desc: 'Empresas, playas y usuarios con lo que falta resolver de cada uno, más lo cobrado en los últimos 30 días.',
    radius: 22,
  },
  {
    key: 'atencion',
    selector: '[data-tour="empresas-atencion"]',
    title: 'Lo que hay que resolver',
    desc: 'Playas sin tarifas, operadores sin playa, empresas suspendidas o quietas. Cada aviso lleva directo a donde se arregla.',
    radius: 10,
  },
  {
    key: 'crear',
    selector: '[data-tour="empresas-crear"]',
    title: 'Dar de alta una empresa',
    desc: 'Una empresa nace vacía: después se le agregan sus playas y sus usuarios. Sus registros quedan separados del resto desde el primer día.',
    radius: 12,
  },
  {
    key: 'buscar',
    selector: '[data-tour="empresas-buscar"]',
    title: 'Buscar',
    desc: 'Filtra por nombre de empresa, de playa o de usuario, todo junto. Se combina con el filtro de estado.',
    radius: 12,
  },
  {
    key: 'filtro',
    selector: '[data-tour="empresas-filtro"]',
    title: 'Filtrar por estado',
    desc: '«Con alertas» deja solo las empresas que tienen algo pendiente en la lista de arriba.',
    radius: 13,
  },
  {
    key: 'ficha',
    selector: '[data-tour="empresas-ficha"]',
    title: 'La ficha de cada empresa',
    desc: 'Cada fila muestra su estado, lo cobrado con su tendencia, cuándo fue su última operación y si cobra con QR. La ficha tiene sus playas, usuarios y actividad.',
    radius: 8,
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
      <EmpresasPanel tour={<PageTour steps={TOUR_STEPS} />} />
    </div>
  );
}
