import { tenantFetch } from './tenant-fetch';
import { FalloBackend, _reiniciarRegistroDeFallos } from './fallos-backend';

const originalEnv = { public: process.env.NEXT_PUBLIC_API_URL, internal: process.env.API_INTERNAL_URL };
let mockFetch: jest.SpyInstance;
let mockWarn: jest.SpyInstance;
const enviado = (llamada = 0) => ({ init: mockFetch.mock.calls[llamada][1] as RequestInit, headers: new Headers((mockFetch.mock.calls[llamada][1] as RequestInit).headers) });
beforeEach(() => {
  _reiniciarRegistroDeFallos();
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  mockFetch = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}'));
  mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of [['NEXT_PUBLIC_API_URL', originalEnv.public], ['API_INTERNAL_URL', originalEnv.internal]]) {
    if (value === undefined) delete process.env[key!];
    else process.env[key!] = value;
  }
});

test('el login usa red privada, conserva credenciales y no reintenta ni cachea', async () => {
  mockFetch.mockImplementation(async () => new Response('rate limited', { status: 429 }));
  const headers = { Authorization: 'Bearer internal-test', 'X-Playa-Id': 'playa-test' };
  const body = JSON.stringify({ identifier: 'usuario-test', password: 'password-test' });
  const response = await tenantFetch('https://api.example.test/auth/login', { method: 'POST', headers, body, cache: 'force-cache', next: { revalidate: 60 } });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/auth/login');
  const { init, headers: sent } = enviado();
  expect(init).toMatchObject({ method: 'POST', body, cache: 'no-store', next: undefined });
  expect(sent.get('authorization')).toBe('Bearer internal-test');
  expect(sent.get('x-playa-id')).toBe('playa-test');
  // Una escritura no se corta por tiempo: su resultado quedaría desconocido.
  expect(init.signal).toBeUndefined();
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

test.each(['https://api.example.test.ajeno.test/users', 'https://otro.example.test/users', 'http://api.example.test/users'])('no redirige consultas ajenas ni les agrega cabeceras: %s', async url => {
  await tenantFetch(url, { headers: { Authorization: 'Bearer ajeno' } });
  expect(mockFetch.mock.calls[0][0]).toBe(url);
  expect(mockFetch.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer ajeno' }, cache: 'no-store', next: undefined });
});

test('un Request conserva método, cabeceras y cuerpo al cambiar de red', async () => {
  const request = new Request('https://api.example.test/tickets', { method: 'POST', headers: { Authorization: 'Bearer test', 'X-Playa-Id': 'playa-a' }, body: 'test-body' });
  await tenantFetch(request);
  const sent = mockFetch.mock.calls[0][0] as Request;
  expect(sent.url).toBe('http://api.railway.internal:3030/tickets');
  expect(sent.method).toBe('POST');
  expect(await sent.text()).toBe('test-body');
  const { headers } = enviado();
  expect(headers.get('authorization')).toBe('Bearer test');
  expect(headers.get('x-playa-id')).toBe('playa-a');
});

test('cada pedido a la API lleva su propio X-Request-Id y respeta uno existente', async () => {
  await tenantFetch('https://api.example.test/tickets');
  await tenantFetch('https://api.example.test/tickets');
  await tenantFetch('https://api.example.test/tickets', { headers: { 'X-Request-Id': 'propio-123456' } });
  const ids = [0, 1, 2].map((i) => enviado(i).headers.get('x-request-id'));
  expect(ids[0]).toBeTruthy();
  expect(ids[0]).not.toBe(ids[1]);
  expect(ids[2]).toBe('propio-123456');
});

test('las lecturas tienen límite de tiempo y conservan la cancelación de quien llama', async () => {
  const controller = new AbortController();
  await tenantFetch('https://api.example.test/tickets', { signal: controller.signal });
  const { signal } = enviado().init;
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(signal!.aborted).toBe(false);
  controller.abort();
  expect(signal!.aborted).toBe(true);
});

test('una cancelación de quien llama se propaga tal cual, sin convertirse en fallo de red', async () => {
  const controller = new AbortController();
  controller.abort();
  const abortado = new DOMException('Abortado', 'AbortError');
  mockFetch.mockRejectedValueOnce(abortado);
  await expect(tenantFetch('https://api.example.test/tickets', { signal: controller.signal })).rejects.toBe(abortado);
  expect(mockWarn).not.toHaveBeenCalled();
});

test('sin conexión lanza un fallo de transporte y lo registra sin secretos', async () => {
  mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
  const error = await tenantFetch('https://api.example.test/users/0b9c6a0e-1c4f-4a65-9f52-1f8e2f3e0a11?token=secreto', {
    headers: { Authorization: 'Bearer secreto-de-sesion', Cookie: 'authjs.session-token=secreto' },
  }).catch((e) => e);
  expect(error).toBeInstanceOf(FalloBackend);
  expect(error.categoria).toBe('transporte');
  const linea = JSON.stringify(mockWarn.mock.calls);
  expect(linea).toContain('GET /users/:id');
  expect(linea).not.toMatch(/secreto|token=|0b9c6a0e/);
});

test.each([
  [429, 'limite', { 'retry-after': '30', 'x-railway-request-id': 'railway-1' }],
  [502, 'servidor', {}],
  [503, 'servidor', {}],
  [401, 'autenticacion', {}],
  [403, 'permiso', {}],
])('registra un %s con su categoría, Retry-After y request id de Railway', async (status, categoria, extra) => {
  mockFetch.mockImplementation(async () => new Response('rate limited: cuerpo-privado', { status, headers: { 'content-type': 'text/plain', ...extra } }));
  const respuesta = await tenantFetch('https://api.example.test/tickets/vehicle-types');
  expect(respuesta.status).toBe(status);
  const registro = JSON.parse(mockWarn.mock.calls[0][1]);
  expect(registro).toMatchObject({ operacion: 'GET /tickets/vehicle-types', categoria, estado: status, contentType: 'text/plain' });
  expect(registro.requestId).toBeTruthy();
  expect(registro.version).toBeTruthy();
  if (status === 429) expect(registro).toMatchObject({ retryAfter: '30', railwayRequestId: 'railway-1' });
  expect(JSON.stringify(mockWarn.mock.calls)).not.toContain('cuerpo-privado');
});

test('el mismo fallo periódico se registra una vez y cuenta las repeticiones', async () => {
  mockFetch.mockImplementation(async () => new Response('', { status: 502 }));
  for (let i = 0; i < 5; i++) await tenantFetch('https://api.example.test/mercadopago/alias/cobros/12345678');
  expect(mockWarn).toHaveBeenCalledTimes(1);
});

test('no registra respuestas correctas ni rechazos de negocio', async () => {
  for (const status of [200, 400, 404, 409]) {
    mockFetch.mockImplementationOnce(async () => new Response('{}', { status }));
    await tenantFetch('https://api.example.test/tickets');
  }
  expect(mockWarn).not.toHaveBeenCalled();
});
