import { tenantFetch } from './tenant-fetch';

const originalEnv = { public: process.env.NEXT_PUBLIC_API_URL, internal: process.env.API_INTERNAL_URL };
let mockFetch: jest.SpyInstance;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
});
afterEach(() => {
  mockFetch.mockRestore();
  for (const [key, value] of [['NEXT_PUBLIC_API_URL', originalEnv.public], ['API_INTERNAL_URL', originalEnv.internal]]) {
    if (value === undefined) delete process.env[key!];
    else process.env[key!] = value;
  }
});

test('el login usa red privada, conserva credenciales y no reintenta ni cachea', async () => {
  mockFetch.mockResolvedValue(new Response('rate limited', { status: 429 }));
  const headers = { Authorization: 'Bearer internal-test', 'X-Playa-Id': 'playa-test' };
  const body = JSON.stringify({ identifier: 'usuario-test', password: 'password-test' });
  const response = await tenantFetch('https://api.example.test/auth/login', { method: 'POST', headers, body, cache: 'force-cache', next: { revalidate: 60 } });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/auth/login');
  expect(mockFetch.mock.calls[0][1]).toEqual({ method: 'POST', headers, body, cache: 'no-store', next: undefined });
  expect(response.status).toBe(429);
});

test('sin URL privada conserva el destino público', async () => {
  delete process.env.API_INTERNAL_URL;
  await tenantFetch('https://api.example.test/users/test-user');
  expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.test/users/test-user');
});

test('mantiene filtros y reconoce el prefijo completo de la API', async () => {
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test/api/';
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030/internal/';
  await tenantFetch(new URL('https://api.example.test/api/users?limit=100'));
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/internal/users?limit=100');
  await tenantFetch('https://api.example.test/api-ajena/users');
  expect(mockFetch.mock.calls[1][0]).toBe('https://api.example.test/api-ajena/users');
});

test.each(['https://api.example.test.ajeno.test/users', 'https://otro.example.test/users', 'http://api.example.test/users'])('no redirige consultas ajenas: %s', async url => {
  await tenantFetch(url);
  expect(mockFetch.mock.calls[0][0]).toBe(url);
});

test('un Request conserva método, cabeceras y cuerpo al cambiar de red', async () => {
  const request = new Request('https://api.example.test/tickets', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: 'test-body' });
  await tenantFetch(request);
  const sent = mockFetch.mock.calls[0][0] as Request;
  expect(sent.url).toBe('http://api.railway.internal:3030/tickets');
  expect(sent.method).toBe('POST');
  expect(sent.headers.get('Authorization')).toBe('Bearer test');
  expect(await sent.text()).toBe('test-body');
});
