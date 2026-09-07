export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NotesTable } from './components/notes-table';
import { noteColumns } from './components/note-columns';
import { getNotes } from '@/services/notes.service';
import { PageHeader } from '@/components/page-header';

export default async function NotePage() {
  const notes = await getNotes();
  const count = notes?.data?.length ?? 0;

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
      />

      <div className="mt-2">
        <NotesTable columns={noteColumns} data={notes?.data || []} />
      </div>
    </div>
  );
}
