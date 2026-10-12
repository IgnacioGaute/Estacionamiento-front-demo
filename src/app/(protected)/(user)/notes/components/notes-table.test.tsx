/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { listNotesAction } from '@/actions/notes/list-notes.action';
import { readNoteAction } from '@/actions/notes/note-read.action';
import { Note } from '@/types/note.type';
import { NotesTable } from './notes-table';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'yo', role: 'USER' } } }) }));
jest.mock('@/hooks/use-notification', () => ({ useNotifications: () => ({ unreadIds: ['auto'], loaded: true }) }));
jest.mock('@/actions/notes/list-notes.action', () => ({ listNotesAction: jest.fn() }));
jest.mock('@/actions/notes/note-read.action', () => ({ readNoteAction: jest.fn() }));
jest.mock('./create-note-dialog', () => ({ CreateNoteDialog: () => <button>Nuevo aviso</button> }));
jest.mock('./update-note-dialog', () => ({ UpdateNoteDialog: () => <button>Editar</button> }));
jest.mock('./delete-note-dialog', () => ({ DeleteNoteDialog: () => <button>Eliminar</button> }));

beforeEach(() => jest.clearAllMocks());

test('muestra el origen de las notas automáticas y permite leerlas, manteniendo las acciones manuales', async () => {
  const data = [
    { id: 'auto', sourceKey: 'cierre:turno', origin: 'Cierre de turno', context: 'Caja principal · Andrés Gaute', description: 'Se perdió plata. Revisar los cobros del turno.', user: { id: 'otro', firstName: 'Andrés', lastName: 'Gaute' }, createdAt: new Date('2026-10-12T13:58:00Z') },
    { id: 'manual', description: 'Mañana revisamos las luces de la entrada.', user: { id: 'yo' }, createdAt: new Date('2026-10-12T13:00:00Z') },
    { id: 'historico', sourceKey: 'cliente:anterior', origin: 'Comentario de inquilino', context: 'Pérez Juan', description: 'Llamar antes de renovar el abono.', user: null, createdAt: new Date('2026-10-10T12:00:00Z') },
  ] as unknown as Note[];
  jest.mocked(listNotesAction).mockResolvedValue({ data, meta: { totalPages: 1 } } as Awaited<ReturnType<typeof listNotesAction>>);
  jest.mocked(readNoteAction).mockResolvedValue(undefined);
  render(<NotesTable columns={[]} data={data} />);
  const origin = await screen.findByText('Cierre de turno');
  const automatic = origin.closest('article')!;
  expect(within(automatic).queryByLabelText('Acciones del aviso')).not.toBeInTheDocument();
  expect(within(automatic).getByText('Caja principal · Andrés Gaute')).toBeInTheDocument();
  expect(screen.getAllByLabelText('Acciones del aviso')).toHaveLength(1);
  expect(screen.getByText('Autor no registrado')).toBeInTheDocument();
  if (process.env.AVISOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/avisos.html', document.body.innerHTML);
  fireEvent.click(within(automatic).getByRole('button', { name: 'Marcar como leído' }));
  await waitFor(() => expect(readNoteAction).toHaveBeenCalledWith('auto'));
});


test('un aviso nuevo devuelve la lista a la primera página para mostrarlo al principio', async () => {
  const newest = { id: 'auto', description: 'Aviso reciente para el equipo', createdAt: new Date('2026-10-12T12:00:00Z'), user: { id: 'otro' } } as unknown as Note;
  const old = { ...newest, id: 'viejo', description: 'Aviso anterior de la segunda página' };
  jest.mocked(listNotesAction).mockImplementation(async page => ({ data: page === 1 ? [newest] : [old], meta: { totalPages: 2 } } as Awaited<ReturnType<typeof listNotesAction>>));
  render(<NotesTable columns={[]} data={[newest]} />);
  await screen.findByText(newest.description);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await screen.findByText(old.description);
  expect(listNotesAction).toHaveBeenLastCalledWith(2, '');
  act(() => { window.dispatchEvent(new Event('notes-notification')); });
  await screen.findByText(newest.description);
  expect(listNotesAction).toHaveBeenLastCalledWith(1, '');
  expect(screen.queryByText(old.description)).not.toBeInTheDocument();
});
