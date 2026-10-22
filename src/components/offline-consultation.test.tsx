/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OfflineConsultation } from './offline-consultation';
import { loadOfflineVault } from '@/lib/offline-vault-client';

let mockUserId: string | undefined = 'user';
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockUserId ? { user: { id: mockUserId } } : null }) }));
jest.mock('./tenant-provider', () => ({ useTenant: () => ({ playaId: 'playa' }) }));
jest.mock('@/lib/offline-vault-client', () => ({ loadOfflineVault: jest.fn() }));
let hidden = false;
let record: { state: any; revision: number } | null;
const snapshot = () => ({ version: 2, userId: 'user', playaId: 'playa', sessionId: 'session', expiresAt: Date.now() + 86400000, pending: [], vehicles: [], receipts: [] });
const vault = {
  getDeviceAccess: jest.fn(), getOperationsRevision: jest.fn(), openOperations: jest.fn(), saveOperations: jest.fn(), rememberDeviceAccess: jest.fn(),
};
const response = (body: unknown) => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => body }) as unknown as Response;
const request = jest.fn();
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); hidden = false; mockUserId = 'user'; record = null; localStorage.clear();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({}) } });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => 'device' });
  global.fetch = request;
  jest.mocked(loadOfflineVault).mockResolvedValue(vault);
  vault.getDeviceAccess.mockResolvedValue('frase-local-segura');
  vault.getOperationsRevision.mockImplementation(async () => record?.revision ?? null);
  vault.openOperations.mockImplementation(async () => record);
  vault.saveOperations.mockImplementation(async state => { record = { state, revision: (record?.revision ?? 0) + 1 }; return record.revision; });
  request.mockImplementation(async () => response(record ? { unchanged: true, sessionId: record.state.sessionId, expiresAt: record.state.expiresAt } : snapshot()));
});
afterEach(() => jest.useRealTimers());

test('los controles sin cambios no descifran, guardan ni descargan otra copia completa', async () => {
  render(<OfflineConsultation revision={1} />);
  await waitFor(() => expect(vault.saveOperations).toHaveBeenCalledTimes(1));
  expect(vault.saveOperations).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(60000); });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(JSON.parse(request.mock.calls[1][1].body).knownSessionId).toBe('session');
  expect(vault.openOperations).not.toHaveBeenCalled();
  expect(vault.saveOperations).toHaveBeenCalledTimes(1);
});

test('agrupa cambios seguidos, se pausa al bloquear y recupera al volver', async () => {
  const { rerender } = render(<OfflineConsultation revision={1} />);
  await waitFor(() => expect(vault.saveOperations).toHaveBeenCalledTimes(1));
  rerender(<OfflineConsultation revision={2} />); rerender(<OfflineConsultation revision={3} />);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(request).toHaveBeenCalledTimes(2);
  act(() => { hidden = true; fireEvent(document, new Event('visibilitychange')); jest.advanceTimersByTime(600000); });
  expect(request).toHaveBeenCalledTimes(2);
  await act(async () => { hidden = false; fireEvent(document, new Event('visibilitychange')); });
  expect(request).toHaveBeenCalledTimes(3);
});

test('una escritura de otra pestaña invalida la lectura en memoria y conserva sus pendientes', async () => {
  render(<OfflineConsultation />); await waitFor(() => expect(vault.saveOperations).toHaveBeenCalledTimes(1));
  record = { state: { ...snapshot(), pending: [{ id: 'cobro-pendiente' }] }, revision: 2 };
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(vault.openOperations).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1); expect(vault.saveOperations).toHaveBeenCalledTimes(1);
  expect(record.state.pending).toHaveLength(1);
});

test('no declara lista una copia de otra cuenta con pendientes ni la reemplaza', async () => {
  record = { state: { ...snapshot(), userId: 'otra-cuenta', pending: [{ id: 'pendiente' }] }, revision: 1 };
  render(<OfflineConsultation />);
  await screen.findByText(/Hay operaciones pendientes de otra cuenta/);
  expect(request).not.toHaveBeenCalled(); expect(vault.saveOperations).not.toHaveBeenCalled();
});

test('un cambio que llega mientras se prepara la copia produce un control posterior', async () => {
  let finish!: (value: Response) => void;
  request.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  const { rerender } = render(<OfflineConsultation revision={1} />);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  rerender(<OfflineConsultation revision={2} />);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { finish(response(snapshot())); });
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(request).toHaveBeenCalledTimes(2);
});

test('la sesión inválida no bloquea abrir los datos guardados ni los reemplaza', async () => {
  record = { state: snapshot(), revision: 1 };
  request.mockResolvedValue({ ...response({ message: 'Iniciá sesión con el mismo usuario para sincronizar.' }), ok: false, status: 401 });
  render(<OfflineConsultation />);
  await screen.findByText(/Iniciá sesión con conexión para preparar o actualizar/);
  expect(screen.getByRole('link', { name: 'Abrir modo sin conexión' })).toHaveAttribute('href', '/offline.html');
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/auth/login?callbackUrl=%2Ftickets');
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  expect(vault.saveOperations).not.toHaveBeenCalled();
  expect(record.revision).toBe(1);
});

test('sin red o sin sesión sigue disponible la entrada al modo local', async () => {
  mockUserId = undefined;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  render(<OfflineConsultation />);
  expect(screen.getByRole('link', { name: 'Abrir modo sin conexión' })).toHaveAttribute('href', '/offline.html');
  expect(request).not.toHaveBeenCalled(); expect(vault.saveOperations).not.toHaveBeenCalled();
});

test('un fallo de red ofrece reintentar y mantiene la entrada a la copia local', async () => {
  record = { state: snapshot(), revision: 1 };
  request.mockRejectedValue(new Error('No responde el servidor.'));
  render(<OfflineConsultation />);
  await screen.findByText('No responde el servidor.');
  expect(screen.getByRole('link', { name: 'Abrir modo sin conexión' })).toHaveAttribute('href', '/offline.html');
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  expect(vault.saveOperations).not.toHaveBeenCalled();
});
