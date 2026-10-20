export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { AvisosBody } from './components/avisos-body';
import { CreateNoteDialog } from './components/create-note-dialog';
import { getNotes } from '@/services/notes.service';
import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';

const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'crear',
    selector: '[data-tour="avisos-crear"]',
    title: 'Dejar un aviso',
    desc: 'Lo que escribas acá lo ve todo el equipo, en cualquier turno y desde cualquier dispositivo. Sirve para lo que se pasa de boca en boca y se termina perdiendo.',
    radius: 8,
  },
  {
    key: 'filtro',
    selector: '[data-tour="avisos-filtro"]',
    title: 'Encontrar un aviso',
    desc: 'Mirá solo los que te faltan leer, los de un período, los de un origen (del equipo, vehículos, caja o clientes) o los de una persona. También podés buscar una palabra o una patente.',
    radius: 10,
  },
  {
    key: 'tabla',
    selector: '[data-tour="avisos-tabla"]',
    title: 'Los avisos del equipo',
    desc: 'Arriba quedan los que no leíste. Tocá un aviso para marcarlo como leído, o usá «Marcar todo como leído». La lectura es solo tuya: no cambia la del resto del equipo.',
    radius: 10,
  },
];

export default async function NotePage() {
  const inicial = await getNotes();

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Avisos']}
        title="Avisos"
        description="Lo que el equipo tiene que saber: avisos propios y los que deja la operación."
        actions={<><PageTour steps={TOUR_STEPS} /><span data-tour="avisos-crear"><CreateNoteDialog /></span></>}
      />
      <AvisosBody inicial={inicial} />
    </div>
  );
}
