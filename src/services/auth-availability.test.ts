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
  mockFetch.mockRejectedValue(error);
  await expect(loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).rejects.toBe(error);
});

test.each([401, 404, 429, 502])('una cuenta que no se puede validar no habilita sesión (%s)', async status => {
  mockFetch.mockResolvedValue(new Response('error', { status }));
  expect(await getUserById('test-user', 'test-internal')).toBeNull();
});

test('login y sesión conservan el usuario devuelto por el backend', async () => {
  const user = { id: 'test-user', authVersion: 2, role: 'USER' };
  mockFetch.mockImplementation(async () => Response.json(user));
  expect(await loginUser({ identifier: 'test-user', password: 'password-test' }, 'test-internal')).toEqual(user);
  expect(await getUserById('test-user', 'test-internal')).toEqual(user);
});
