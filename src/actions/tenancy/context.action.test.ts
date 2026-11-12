let mockSession: { user: { id: string; role: string }; token: string; validacionPendiente?: boolean } | null;
const mockSet = jest.fn();
jest.mock('@/auth', () => ({ auth: async () => mockSession }));
jest.mock('next/headers', () => ({ cookies: async () => ({ set: mockSet }) }));
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

import { getOperationalContext, selectPlayaAction, selectPlatformAction } from './context.action';
import { FalloBackend, _reiniciarRegistroDeFallos } from '@/lib/fallos-backend';

const playa = '11111111-1111-4111-8111-111111111111';
const mockFetch = jest.fn();
const originalFetch = global.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalInternalUrl = process.env.API_INTERNAL_URL;
const contexto = (playas: unknown[] = [{ id: playa }]) => Response.json({ role: mockSession?.user.role, empresa: null, playas });
const enviado = (llamada = 0) => ({ url: String(mockFetch.mock.calls[llamada][0]), init: mockFetch.mock.calls[llamada][1] as RequestInit, headers: new Headers((mockFetch.mock.calls[llamada][1] as RequestInit).headers) });
beforeEach(() => {
  jest.clearAllMocks();
  _reiniciarRegistroDeFallos();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockSession = { user: { id: 'super', role: 'SUPER_ADMIN' }, token: 'session-token' };
  global.fetch = mockFetch;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  delete process.env.API_INTERNAL_URL;
  mockFetch.mockImplementation(async () => contexto());
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
  const { url, init, headers } = enviado();
  expect(url).toContain('/tenant/context');
  expect(init.cache).toBe('no-store');
  expect(headers.get('authorization')).toBe('Bearer session-token');
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
  const { url, init, headers } = enviado();
  expect(url).toBe('http://api.railway.internal:3030/tenant/context');
  expect(init).toMatchObject({ cache: 'no-store', next: undefined });
  expect(headers.get('authorization')).toBe('Bearer session-token');
  // El contexto es de la cuenta, no de una playa: no viaja X-Playa-Id.
  expect(headers.has('x-playa-id')).toBe(false);
  expect(headers.get('x-request-id')).toBeTruthy();
});

test('una playa revocada también se rechaza al consultar por red privada', async () => {
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  mockFetch.mockImplementationOnce(async () => contexto([]));
  expect(await selectPlayaAction(playa)).toHaveProperty('error');
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/tenant/context');
  expect(mockSet).not.toHaveBeenCalled();
});

test('una asignación realmente vacía se devuelve como lista vacía', async () => {
  mockFetch.mockImplementationOnce(async () => contexto([]));
  await expect(getOperationalContext()).resolves.toMatchObject({ playas: [] });
});

test.each([
  ['429 en texto del proxy', () => new Response('rate limited', { status: 429, headers: { 'retry-after': '30' } }), 'limite', 30_000],
  ['502 en HTML', () => new Response('<html>Bad Gateway</html>', { status: 502 }), 'servidor', null],
  ['503', () => new Response('', { status: 503 }), 'servidor', null],
  ['200 que no es JSON', () => new Response('rate limited', { status: 200 }), 'respuesta-invalida', null],
  ['200 sin lista de playas', () => Response.json({ empresa: null }), 'respuesta-invalida', null],
])('una consulta fallida (%s) no se convierte en una lista vacía', async (_caso, respuesta, categoria, reintentarEnMs) => {
  mockFetch.mockImplementationOnce(async () => respuesta());
  const error = await getOperationalContext().catch((e) => e);
  expect(error).toBeInstanceOf(FalloBackend);
  expect(error).toMatchObject({ categoria, reintentarEnMs });
  // El texto del proxy no llega a la persona.
  expect(error.message).not.toContain('rate limited');
});

test('sin conexión o timeout la consulta falla como transporte', async () => {
  mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
  await expect(getOperationalContext()).rejects.toMatchObject({ categoria: 'transporte' });
});

test('una cuenta sin empresa activa (403) conserva el mensaje del backend', async () => {
  mockFetch.mockImplementationOnce(async () => Response.json({ message: 'Tu cuenta no tiene una empresa activa.' }, { status: 403 }));
  await expect(getOperationalContext()).rejects.toMatchObject({ categoria: 'permiso', message: 'Tu cuenta no tiene una empresa activa.' });
});

test('una sesión revocada (401) se distingue de una falla temporal', async () => {
  mockFetch.mockImplementationOnce(async () => new Response('Unauthorized', { status: 401 }));
  await expect(getOperationalContext()).rejects.toMatchObject({ categoria: 'autenticacion' });
});

test('un fallo del backend no cambia la selección y se informa sin lanzar', async () => {
  mockFetch.mockImplementationOnce(async () => new Response('rate limited', { status: 429 }));
  expect(await selectPlayaAction(playa)).toEqual({ error: expect.stringContaining('No pudimos comprobar tus playas') });
  expect(mockSet).not.toHaveBeenCalled();
});

test('una sesión con validación pendiente no consulta ni habilita el contexto', async () => {
  mockSession = { user: { id: 'admin', role: 'ADMIN' }, token: 'session-token', validacionPendiente: true };
  await expect(getOperationalContext()).rejects.toMatchObject({ categoria: 'transporte' });
  expect(await selectPlayaAction(playa)).toHaveProperty('error');
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockSet).not.toHaveBeenCalled();
});

test('sin sesión no se consulta el contexto', async () => {
  mockSession = null;
  await expect(getOperationalContext()).rejects.toThrow('Iniciá sesión para continuar.');
  expect(mockFetch).not.toHaveBeenCalled();
});
