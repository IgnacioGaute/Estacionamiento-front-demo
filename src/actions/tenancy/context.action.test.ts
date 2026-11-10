let mockSession: { user: { id: string; role: string }; token: string } | null;
const mockSet = jest.fn();
jest.mock('@/auth', () => ({ auth: async () => mockSession }));
jest.mock('next/headers', () => ({ cookies: async () => ({ set: mockSet }) }));
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

import { getOperationalContext, selectPlayaAction, selectPlatformAction } from './context.action';

const playa = '11111111-1111-4111-8111-111111111111';
const mockFetch = jest.fn();
const originalFetch = global.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalInternalUrl = process.env.API_INTERNAL_URL;
beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: 'super', role: 'SUPER_ADMIN' }, token: 'session-token' };
  global.fetch = mockFetch;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  delete process.env.API_INTERNAL_URL;
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ role: mockSession?.user.role, empresa: null, playas: [{ id: playa }] }) });
});
afterAll(() => {
  global.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  if (originalInternalUrl === undefined) delete process.env.API_INTERNAL_URL;
  else process.env.API_INTERNAL_URL = originalInternalUrl;
});

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

test('la lista de playas usa la red privada con la sesión actual y sin caché', async () => {
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  const context = await getOperationalContext();
  expect(context.playas).toEqual([{ id: playa }]);
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/tenant/context');
  expect(mockFetch.mock.calls[0][1]).toEqual({
    headers: { Authorization: 'Bearer session-token' }, cache: 'no-store', next: undefined,
  });
});

test('una playa revocada también se rechaza al consultar por red privada', async () => {
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ role: 'SUPER_ADMIN', empresa: null, playas: [] }) });
  expect(await selectPlayaAction(playa)).toHaveProperty('error');
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/tenant/context');
  expect(mockSet).not.toHaveBeenCalled();
});

test('un fallo del backend no se convierte en una lista de playas vacía ni cambia la selección', async () => {
  mockFetch.mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
  await expect(selectPlayaAction(playa)).rejects.toThrow('No se pudo cargar tu empresa.');
  expect(mockSet).not.toHaveBeenCalled();
});

test('sin sesión no se consulta el contexto', async () => {
  mockSession = null;
  await expect(getOperationalContext()).rejects.toThrow('Iniciá sesión para continuar.');
  expect(mockFetch).not.toHaveBeenCalled();
});
