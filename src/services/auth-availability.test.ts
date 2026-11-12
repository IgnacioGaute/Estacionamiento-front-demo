jest.mock('@/lib/auth', () => ({ getAuthHeaders: async () => ({ Authorization: 'Bearer test-internal' }) }));
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));

import { loginUser } from './auth.service';
import { getUserById } from './users.service';
import { AuthBackendError } from '@/lib/auth-response';

let mockFetch: jest.SpyInstance;
let mockLog: jest.SpyInstance;
beforeEach(() => {
  mockFetch = jest.spyOn(globalThis, 'fetch');
  mockLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('un 429 del proxy no devuelve credenciales inválidas ni registra el cuerpo', async () => {
  mockFetch.mockResolvedValue(new Response('rate limited: private-test-body', { status: 429, headers: { server: 'railway-hikari' } }));
  await expect(loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).rejects.toBeInstanceOf(AuthBackendError);
  expect(mockLog).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 429, server: 'railway-hikari' }));
  expect(JSON.stringify(mockLog.mock.calls)).not.toContain('private-test-body');
});

test('el rechazo de credenciales sigue devolviendo null', async () => {
  mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
  expect(await loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).toBeNull();
});

test('un error de red en login no se presenta como contraseña incorrecta', async () => {
  const error = new TypeError('fetch failed');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockFetch.mockRejectedValue(error);
  // Rechaza (no devuelve null = credenciales incorrectas). Con la URL de la API configurada,
  // tenantFetch lo envuelve en un FalloBackend de transporte (ver tenant-fetch.test.ts).
  await expect(loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).rejects.toThrow();
});

test.each([401, 403, 404])('una cuenta rechazada por el backend (%s) devuelve null: la sesión se cierra', async status => {
  mockFetch.mockResolvedValue(new Response('error', { status }));
  expect(await getUserById('test-user', 'test-internal')).toBeNull();
});

// Una falla transitoria lanza: el callback jwt la distingue de una cuenta revocada y no habilita
// la sesión, pero tampoco la destruye (ver auth.test.ts).
test.each([429, 502, 503])('una cuenta que no se puede validar por un %s lanza en vez de parecer revocada', async status => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockFetch.mockResolvedValue(new Response('rate limited', { status }));
  await expect(getUserById('test-user', 'test-internal')).rejects.toBeInstanceOf(AuthBackendError);
});

test('sin conexión la validación de la cuenta lanza', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockFetch.mockRejectedValue(new TypeError('fetch failed'));
  await expect(getUserById('test-user', 'test-internal')).rejects.toThrow();
});

test('login y sesión conservan el usuario devuelto por el backend', async () => {
  const user = { id: 'test-user', authVersion: 2, role: 'USER' };
  mockFetch.mockImplementation(async () => Response.json(user));
  expect(await loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).toEqual(user);
  expect(await getUserById('test-user', 'test-internal')).toEqual(user);
});
