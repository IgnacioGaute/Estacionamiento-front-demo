import { io } from 'socket.io-client';
import { subscribeTenantEvent } from './tenant-socket-client';
jest.mock('socket.io-client', () => ({ io: jest.fn() }));

function socket() {
  const listeners = new Map<string, ((data?: unknown) => void)[]>();
  const client = {
    connected: false,
    on: jest.fn((event: string, fn: () => void) => { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event)!.push(fn); }),
    off: jest.fn((event: string, fn: () => void) => { const list = listeners.get(event); const index = list?.indexOf(fn) ?? -1; if (list && index >= 0) list.splice(index, 1); }),
    connect: jest.fn(), disconnect: jest.fn(),
    emitServer: (event: string, data?: unknown) => listeners.get(event)?.forEach(fn => fn(data)),
  };
  return client;
}
const releases: (() => void)[] = [];
afterEach(() => { releases.splice(0).forEach(release => release()); jest.clearAllMocks(); });

test('vehículos, avisos y modalidad comparten una conexión y cada uno recibe sus eventos', () => {
  const client = socket(); jest.mocked(io).mockReturnValue(client as never);
  const registrations = jest.fn(), notes = jest.fn(), mode = jest.fn(), connected = jest.fn();
  releases.push(subscribeTenantEvent('token', 'playa', 'new-registration', registrations, connected));
  releases.push(subscribeTenantEvent('token', 'playa', 'notification', notes, connected));
  releases.push(subscribeTenantEvent('token', 'playa', 'playa-modalidad', mode, connected));
  expect(io).toHaveBeenCalledTimes(1); expect(client.connect).toHaveBeenCalledTimes(1);
  client.emitServer('connect'); expect(connected).toHaveBeenCalledTimes(3);
  client.emitServer('new-registration', { id: 'entrada-de-otro-operador' });
  expect(registrations).toHaveBeenCalledWith({ id: 'entrada-de-otro-operador' }); expect(notes).not.toHaveBeenCalled();
  client.emitServer('notification', { type: 'NEW_NOTE' }); expect(notes).toHaveBeenCalledTimes(1);
  releases.shift()!(); expect(client.disconnect).not.toHaveBeenCalled();
  client.emitServer('new-registration', { id: 'otra' }); expect(registrations).toHaveBeenCalledTimes(1);
  releases.splice(0).forEach(release => release()); expect(client.disconnect).toHaveBeenCalledTimes(1);
});

test('otra cuenta, token o playa usan conexiones separadas y recuperan eventos al reconectar', () => {
  const a = socket(), b = socket(), c = socket();
  jest.mocked(io).mockReturnValueOnce(a as never).mockReturnValueOnce(b as never).mockReturnValueOnce(c as never);
  const sync = jest.fn();
  releases.push(subscribeTenantEvent('a', 'playa', 'new-registration', jest.fn(), sync));
  releases.push(subscribeTenantEvent('b', 'playa', 'new-registration', jest.fn(), jest.fn()));
  releases.push(subscribeTenantEvent('a', 'otra-playa', 'new-registration', jest.fn(), jest.fn()));
  expect(io).toHaveBeenCalledTimes(3);
  a.emitServer('connect'); a.emitServer('connect'); expect(sync).toHaveBeenCalledTimes(2);
});
