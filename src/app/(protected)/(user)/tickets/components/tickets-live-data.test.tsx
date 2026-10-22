/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TicketsLiveData } from './tickets-live-data';
import { getOperationUpdatesAction } from '@/actions/tickets/operation-updates.action';
import type { TicketsOperationSnapshot } from '@/types/tickets-operation.type';
let playaId = 'playa';
const refreshRouter = jest.fn();
const router = { refresh: refreshRouter };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'user' } } }) }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ playaId }) }));
jest.mock('@/actions/tickets/operation-updates.action', () => ({ getOperationUpdatesAction: jest.fn() }));
jest.mock('./ticket.card', () => ({ __esModule: true, default: ({ initialRegistrations, barcodeTicketsEnabled, onResync }: { initialRegistrations: { id: string }[]; barcodeTicketsEnabled: boolean; onResync: () => void }) => <div><span>{initialRegistrations.map(r => r.id).join(',')}</span><span>{barcodeTicketsEnabled ? 'Con tickets' : 'Sin tickets'}</span><button onClick={onResync}>Recuperar cambios</button></div> }));
const initial = (): TicketsOperationSnapshot => ({ data: { initialRegistrations: [], ticketCatalog: [], priceBrackets: [], registrationsForDay: [], schedule: null }, revisions: { initialRegistrations: 'r', ticketCatalog: 't', priceBrackets: 'p', registrationsForDay: 'd', schedule: 's' } });
beforeEach(() => { jest.clearAllMocks(); playaId = 'playa'; });

test('recupera registros y configuración remotos sin refrescar el router ni reemplazar las partes intactas', async () => {
  jest.mocked(getOperationUpdatesAction).mockResolvedValue({ changes: { initialRegistrations: [{ id: 'entrada-remota' }] as never, schedule: { barcodeTicketsEnabled: true } as never }, revisions: { ...initial().revisions, initialRegistrations: 'r2', schedule: 's2' } });
  render(<TicketsLiveData initial={initial()} isAdmin={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar cambios' }));
  await screen.findByText('entrada-remota'); expect(screen.getByText('Con tickets')).toBeInTheDocument();
  jest.mocked(getOperationUpdatesAction).mockResolvedValue({ changes: {}, revisions: { ...initial().revisions, initialRegistrations: 'r2', schedule: 's2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar cambios' }));
  await waitFor(() => expect(getOperationUpdatesAction).toHaveBeenLastCalledWith(expect.objectContaining({ initialRegistrations: 'r2', schedule: 's2' })));
  expect(screen.getByText('entrada-remota')).toBeInTheDocument();
});

test('descarta una respuesta pendiente de la playa anterior', async () => {
  let finish!: (value: Awaited<ReturnType<typeof getOperationUpdatesAction>>) => void;
  jest.mocked(getOperationUpdatesAction).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(<TicketsLiveData initial={initial()} isAdmin={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar cambios' }));
  playaId = 'otra-playa'; rerender(<TicketsLiveData initial={initial()} isAdmin={false} />);
  await act(async () => { finish({ changes: { initialRegistrations: [{ id: 'dato-anterior' }] as never }, revisions: initial().revisions }); });
  expect(screen.queryByText('dato-anterior')).not.toBeInTheDocument();
});

test('un acceso revocado vuelve a comprobar el layout protegido', async () => {
  jest.mocked(getOperationUpdatesAction).mockResolvedValue({ refreshAccess: true });
  render(<TicketsLiveData initial={initial()} isAdmin={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar cambios' }));
  await waitFor(() => expect(refreshRouter).toHaveBeenCalledTimes(1));
});
