let mockSession: { user: { id: string; role: string }; token: string } | null;
const mockSet = jest.fn();
jest.mock('@/auth', () => ({ auth: async () => mockSession }));
jest.mock('next/headers', () => ({ cookies: async () => ({ set: mockSet }) }));
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

import { selectPlayaAction, selectPlatformAction } from './context.action';

const playa = '11111111-1111-4111-8111-111111111111';
const mockFetch = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: 'super', role: 'SUPER_ADMIN' }, token: 'session-token' };
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ role: mockSession?.user.role, empresa: null, playas: [{ id: playa }] }) });
});
afterAll(() => { global.fetch = originalFetch; });

test('plataforma guarda una selección privada asociada al superadministrador', async () => {
  expect(await selectPlatformAction()).toEqual({ ok: true });
  expect(mockSet).toHaveBeenCalledWith('parking-playa', 'super:platform', expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }));
  expect(mockFetch).not.toHaveBeenCalled();
});

test.each(['ADMIN', 'USER', null])('plataforma rechaza una sesión sin rol de superadministrador: %s', async role => {
  mockSession = role ? { user: { id: 'otro', role }, token: 'token' } : null;
  expect(await selectPlatformAction()).toHaveProperty('error');
  expect(mockSet).not.toHaveBeenCalled();
});

test('elegir playa revalida el acceso actual con el backend', async () => {
  expect(await selectPlayaAction(playa)).toEqual({ ok: true });
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/tenant/context'), expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer session-token' } }));
  expect(mockSet).toHaveBeenCalledWith('parking-playa', `super:${playa}`, expect.objectContaining({ httpOnly: true }));
});

test('una playa ajena o revocada no modifica la selección', async () => {
  expect(await selectPlayaAction('otra-playa')).toHaveProperty('error');
  expect(mockSet).not.toHaveBeenCalled();
});

test('el operador no puede elegir otra playa', async () => {
  mockSession!.user.role = 'USER';
  expect(await selectPlayaAction(playa)).toHaveProperty('error');
  expect(mockSet).not.toHaveBeenCalled();
});
