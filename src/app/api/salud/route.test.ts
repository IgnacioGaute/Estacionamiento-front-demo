import { GET } from './route';

const antes = { pub: process.env.NEXT_PUBLIC_API_URL, int: process.env.API_INTERNAL_URL };
let mockFetch: jest.SpyInstance;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  mockFetch = jest.spyOn(globalThis, 'fetch');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  process.env.NEXT_PUBLIC_API_URL = antes.pub;
  if (antes.int === undefined) delete process.env.API_INTERNAL_URL;
  else process.env.API_INTERNAL_URL = antes.int;
});

test('responde listo con la versión, sin cachear y sin consultar el backend', async () => {
  const r = await GET(new Request('https://front.example.test/api/salud'));
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('no-store');
  expect(await r.json()).toEqual({ estado: 'listo', version: expect.any(String) });
  expect(mockFetch).not.toHaveBeenCalled();
});

test('con backend=1 consulta /salud del backend por la red privada', async () => {
  mockFetch.mockResolvedValue(Response.json({ estado: 'listo', version: 'abc123' }));
  const r = await GET(new Request('https://front.example.test/api/salud?backend=1'));
  expect(String(mockFetch.mock.calls[0][0])).toBe('http://api.railway.internal:3030/salud');
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ backend: { estado: 'listo', version: 'abc123', redPrivada: true } });
});

test.each([
  ['un 503 del backend', () => mockFetch.mockResolvedValue(Response.json({ code: 'BASE_NO_DISPONIBLE' }, { status: 503 })), 'con-problemas'],
  ['un 429 en texto', () => mockFetch.mockResolvedValue(new Response('rate limited', { status: 429 })), 'con-problemas'],
  ['sin conexión', () => mockFetch.mockRejectedValue(new TypeError('fetch failed')), 'sin-respuesta'],
])('con backend=1, %s devuelve 503 con el detalle', async (_caso, preparar, estado) => {
  preparar();
  const r = await GET(new Request('https://front.example.test/api/salud?backend=1'));
  expect(r.status).toBe(503);
  expect(await r.json()).toMatchObject({ estado: 'listo', backend: { estado } });
});
