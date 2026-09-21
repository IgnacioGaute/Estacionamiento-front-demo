export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NotesTable } from './components/notes-table';
import { noteColumns } from './components/note-columns';
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
    title: 'Buscar un aviso',
    desc: 'Para encontrar un aviso viejo sin recorrer toda la lista.',
    radius: 8,
  },
  {
    key: 'tabla',
    selector: '[data-tour="avisos-tabla"]',
    title: 'Los avisos del equipo',
    desc: 'Cada tarjeta muestra el mensaje completo, autor y fecha. Marcá los avisos como leídos: esto solo cambia tu cuenta, no la del resto del equipo.',
    radius: 8,
  },
];

export default async function NotePage() {
  const notes = await getNotes();
  const count = notes?.meta?.totalItems ?? 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Avisos']}
        title="Avisos"
        description={
          count > 0
            ? `${count} avisos · información compartida del equipo del día a día.`
            : 'Creá el primer aviso para que todos en el turno lo vean.'
        }
        actions={<PageTour steps={TOUR_STEPS} />}
      />

      <div className="mt-2">
        <NotesTable columns={noteColumns} data={notes?.data || []} />
      </div>
    </div>
  );
}
