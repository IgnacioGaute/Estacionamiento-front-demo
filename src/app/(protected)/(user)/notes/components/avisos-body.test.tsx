/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { listNotesAction } from '@/actions/notes/list-notes.action';
import { readAllNotesAction, readNoteAction } from '@/actions/notes/note-read.action';
import type { ListaAvisos, Note } from '@/types/note.type';
import { AvisosBody } from './avisos-body';

const sesion = { role: 'USER' };
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'yo', role: sesion.role } } }) }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ cobroHabilitado: true }) }));
jest.mock('@/actions/notes/list-notes.action', () => ({ listNotesAction: jest.fn() }));
jest.mock('@/actions/notes/note-read.action', () => ({ readNoteAction: jest.fn(), readAllNotesAction: jest.fn() }));
jest.mock('@/components/app-date-picker', () => ({ AppDatePicker: () => null }));
jest.mock('@/app/(protected)/admin/tarifas/tariff-select', () => ({
  TariffSelect: ({ name, value, onValueChange, options }: { name: string; value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <select aria-label={name} value={value} onChange={(e) => onValueChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
  ),
}));
jest.mock('./update-note-dialog', () => ({ UpdateNoteDialog: () => <button>Editar aviso</button> }));
jest.mock('./delete-note-dialog', () => ({ DeleteNoteDialog: () => <button>Eliminar aviso</button> }));

const avisos = [
  { id: 'auto', sourceKey: 'cierre:turno', sourceType: 'TURNO', origin: 'Cierre de turno', context: 'Caja principal · Andrés Gaute', description: 'Se perdió plata. Revisar los cobros del turno.', user: { id: 'otro', firstName: 'Andrés', lastName: 'Gaute' }, date: '2026-10-12', createdAt: new Date('2026-10-12T13:58:00Z') },
  { id: 'equipo', description: 'Mañana revisamos las luces de la entrada.', user: { id: 'otro', firstName: 'Andrés', lastName: 'Gaute' }, date: '2026-10-12', createdAt: new Date('2026-10-12T13:30:00Z') },
  { id: 'propio', description: 'Dejé las llaves en la caja.', user: { id: 'yo' }, date: '2026-10-12', createdAt: new Date('2026-10-12T13:00:00Z') },
  { id: 'historico', sourceKey: 'cliente:anterior', sourceType: 'RENTER', origin: 'Comentario de inquilino', context: 'Pérez Juan', description: 'Llamar antes de renovar el abono.', user: null, date: '2026-10-10', createdAt: new Date('2026-10-10T12:00:00Z') },
] as unknown as Note[];
const lista = (cambios: Partial<ListaAvisos> = {}): ListaAvisos => ({
  data: avisos, meta: { totalItems: 4, totalPages: 1, itemsPerPage: 20, currentPage: 1, sortBy: [] }, links: { first: '', current: '', last: '' },
  pendientes: ['auto', 'equipo'], conteos: { todos: 4, sinLeer: 2, leidos: 2 }, resumen: { total: 4, sinLeer: 2, hoy: 3 },
  autores: [{ id: 'otro', nombre: 'Andrés Gaute' }, { id: 'yo', nombre: 'Yo Mismo' }], ...cambios,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listNotesAction).mockResolvedValue(lista());
  jest.mocked(readNoteAction).mockResolvedValue(undefined);
  jest.mocked(readAllNotesAction).mockResolvedValue(undefined);
});

const tarjeta = (texto: string) => screen.getByText(texto).closest('article')!;

test('tocar cualquier parte de un aviso pendiente lo marca como leído al instante; editar no cuenta como leer', async () => {
  render(<AvisosBody inicial={lista()} />);
  const pendiente = tarjeta('Mañana revisamos las luces de la entrada.');
  expect(pendiente).toHaveAttribute('data-pendiente');
  expect(within(screen.getByRole('radiogroup', { name: 'Estado de lectura' })).getByRole('radio', { name: /Para revisar\s*2/ })).toBeInTheDocument();

  // Los avisos automáticos muestran su origen y contexto, y no se editan desde acá.
  const automatico = tarjeta('Se perdió plata. Revisar los cobros del turno.');
  expect(within(automatico).getByText('Cierre de turno')).toBeInTheDocument();
  expect(within(automatico).getByText('Caja principal · Andrés Gaute')).toBeInTheDocument();
  expect(within(automatico).queryByRole('button', { name: 'Editar aviso' })).not.toBeInTheDocument();
  expect(screen.getByText('Autor no registrado')).toBeInTheDocument();
  expect(within(tarjeta('Dejé las llaves en la caja.')).getByText('Vos')).toBeInTheDocument();

  fireEvent.click(within(pendiente).getByRole('button', { name: 'Editar aviso' }));
  expect(readNoteAction).not.toHaveBeenCalled();

  fireEvent.click(within(pendiente).getByText('Andrés Gaute'));
  expect(pendiente).not.toHaveAttribute('data-pendiente');
  await waitFor(() => expect(readNoteAction).toHaveBeenCalledWith('equipo'));
  expect(within(screen.getByRole('radiogroup', { name: 'Estado de lectura' })).getByRole('radio', { name: /Para revisar\s*1/ })).toBeInTheDocument();

  // Con teclado: Enter sobre el aviso enfocado.
  fireEvent.keyDown(automatico, { key: 'Enter' });
  await waitFor(() => expect(readNoteAction).toHaveBeenCalledWith('auto'));
  expect(screen.queryByRole('button', { name: /Marcar todo como leído/ })).not.toBeInTheDocument();
});

test('si no se puede guardar la lectura, el aviso vuelve a quedar pendiente y se avisa', async () => {
  jest.mocked(readNoteAction).mockRejectedValue(new Error('sin red'));
  render(<AvisosBody inicial={lista()} />);
  const pendiente = tarjeta('Mañana revisamos las luces de la entrada.');
  fireEvent.click(pendiente);
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar la lectura');
  expect(pendiente).toHaveAttribute('data-pendiente');
});

test('los filtros piden al backend y «Marcar todo como leído» recarga la lista', async () => {
  render(<AvisosBody inicial={lista()} />);
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Estado de lectura' })).getByRole('radio', { name: /Para revisar/ }));
  await waitFor(() => expect(listNotesAction).toHaveBeenLastCalledWith(1, '', expect.objectContaining({ estado: 'SIN_LEER' })));
  fireEvent.change(screen.getByLabelText('Origen'), { target: { value: 'VEHICULOS' } });
  await waitFor(() => expect(listNotesAction).toHaveBeenLastCalledWith(1, '', expect.objectContaining({ estado: 'SIN_LEER', origen: 'VEHICULOS' })));
  fireEvent.change(screen.getByLabelText('Autor'), { target: { value: 'otro' } });
  await waitFor(() => expect(listNotesAction).toHaveBeenLastCalledWith(1, '', expect.objectContaining({ autor: 'otro' })));
  fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
  await waitFor(() => expect(jest.mocked(listNotesAction).mock.lastCall?.[2]?.desde).toBeTruthy());
  fireEvent.change(screen.getByPlaceholderText('Palabra, patente o cliente'), { target: { value: 'llaves' } });
  await waitFor(() => expect(listNotesAction).toHaveBeenLastCalledWith(1, 'llaves', expect.anything()));

  fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }));
  await waitFor(() => expect(listNotesAction).toHaveBeenLastCalledWith(1, '', { estado: 'TODOS', origen: 'TODOS', desde: '', hasta: '', autor: '' }));

  const llamadas = jest.mocked(listNotesAction).mock.calls.length;
  fireEvent.click(await screen.findByRole('button', { name: /Marcar todo como leído/ }));
  await waitFor(() => expect(readAllNotesAction).toHaveBeenCalled());
  await waitFor(() => expect(jest.mocked(listNotesAction).mock.calls.length).toBeGreaterThan(llamadas));
});

test('el número es lo para revisar y explica qué cuenta; ya no hay filtro «Leídos»', () => {
  render(<AvisosBody inicial={lista()} />);
  const resumen = screen.getByRole('region', { name: 'Resumen' });
  expect(resumen).toHaveTextContent('2 para revisar');
  expect(resumen).toHaveTextContent(/últimos 7 días/);
  expect(screen.getByRole('region', { name: 'Para revisar' })).toBeInTheDocument();
  expect(within(screen.getByRole('radiogroup', { name: 'Estado de lectura' })).queryByRole('radio', { name: /Leídos/ })).not.toBeInTheDocument();
});

test('los avisos de una misma persona en un día van juntos y plegados; uno solo va suelto', () => {
  const franco = { id: 'franco', firstName: 'Franco', lastName: 'Pizarro' };
  const del = (id: string, origin: string, hora: string) => ({ id, sourceKey: 'movimiento:' + id, sourceType: 'TICKET', origin, description: 'Detalle ' + id, user: franco, date: '2026-10-11', createdAt: new Date('2026-10-11T' + hora + ':00Z'), paraRevisar: false });
  const datos = [
    del('d1', 'Descuento de vehículo', '15:00'), { ...avisos[1], id: 'suelto', date: '2026-10-11', createdAt: new Date('2026-10-11T14:30:00Z') },
    del('d2', 'Descuento de vehículo', '14:00'), del('c1', 'Cierre de turno', '13:00'),
  ] as unknown as Note[];
  render(<AvisosBody inicial={lista({ data: datos, pendientes: [], conteos: { todos: 4, sinLeer: 0, leidos: 4 }, resumen: { total: 4, sinLeer: 0, hoy: 0 } })} />);
  const grupo = screen.getByText('3 avisos').closest('details')!;
  expect(grupo).not.toHaveAttribute('open');
  expect(within(grupo).getByText('Franco Pizarro')).toBeInTheDocument();
  expect(within(grupo).getByText('2 Descuento de vehículo · 1 Cierre de turno')).toBeInTheDocument();
  expect(within(grupo).getAllByRole('article', { hidden: true })).toHaveLength(3);
  // El de otra persona queda suelto, fuera del grupo.
  expect(tarjeta('Mañana revisamos las luces de la entrada.').closest('details')).toBeNull();
  expect(screen.getByRole('region', { name: 'Resumen' })).toHaveTextContent('Estás al día');
});

test('cada aviso automático dice qué pasó y qué es el texto; los del equipo no', () => {
  render(<AvisosBody inicial={lista()} />);
  const cierre = tarjeta('Se perdió plata. Revisar los cobros del turno.');
  expect(within(cierre).getByText('Cerró su turno con una diferencia de caja, un conteo corregido o por administración.')).toBeInTheDocument();
  expect(within(cierre).getByText('Explicación:')).toBeInTheDocument();
  const comentario = tarjeta('Llamar antes de renovar el abono.');
  expect(within(comentario).getByText('Dejó un comentario en la ficha del inquilino.')).toBeInTheDocument();
  expect(within(comentario).getByText('Comentario:')).toBeInTheDocument();
  const equipo = tarjeta('Mañana revisamos las luces de la entrada.');
  expect(within(equipo).queryByText(/:$/)).toBeNull();
  // El operador no entra a la cuenta ni al historial de turnos: sin «Ver».
  expect(screen.queryByRole('link', { name: /Ver/ })).toBeNull();
});

test('para la administración, «Ver» lleva al inquilino o a los turnos', () => {
  sesion.role = 'ADMIN';
  try {
    const informativo = { id: 'info', sourceKey: 'cierre:ok', sourceType: 'TURNO', sourceId: 't1', origin: 'Cierre de turno', description: 'Todo bien.', user: null, date: '2026-10-12', createdAt: new Date('2026-10-12T10:00:00Z'), paraRevisar: false } as unknown as Note;
    const inquilino = { ...avisos[3], sourceId: 'c9' } as Note;
    render(<AvisosBody inicial={lista({ data: [informativo, inquilino], pendientes: [] })} />);
    expect(within(tarjeta('Todo bien.')).getByText('Cerró su turno con la caja correcta y dejó una nota.')).toBeInTheDocument();
    expect(within(tarjeta('Todo bien.')).getByRole('link', { name: /Ver turnos/ })).toHaveAttribute('href', '/admin/caja/turnos');
    expect(within(tarjeta('Llamar antes de renovar el abono.')).getByRole('link', { name: /Ver inquilino/ })).toHaveAttribute('href', '/renters/c9');
  } finally { sesion.role = 'USER'; }
});
