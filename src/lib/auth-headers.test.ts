// getAuthHeaders es el único lugar que arma Authorization y X-Playa-Id. Una sesión que no se pudo
// validar no habilita ningún pedido operativo; y por la red privada cada pedido conserva las
// cabeceras de su propia cuenta y playa, sin mezclarse con otro que corre al mismo tiempo.
type Sesion = { user: { id: string; role: string }; token: string; validacionPendiente?: boolean } | null;
let mockSession: Sesion;
let mockCookie: string | undefined;
jest.mock('@/auth', () => ({ auth: async () => mockSession }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => (mockCookie ? { value: mockCookie } : undefined) }) }));

import { getAuthHeaders } from './auth';
import { tenantFetch } from './tenant-fetch';
import { FalloBackend } from './fallos-backend';

const PLAYA_A = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  mockSession = { user: { id: 'admin-a', role: 'ADMIN' }, token: 'token-a' };
  mockCookie = `admin-a:${PLAYA_A}`;
});

test('una sesión validada lleva su token y la playa elegida', async () => {
  expect(await getAuthHeaders()).toMatchObject({ Authorization: 'Bearer token-a', 'X-Playa-Id': PLAYA_A });
});

test('una sesión con validación pendiente no arma cabeceras: no se opera sin verificar', async () => {
  mockSession = { ...mockSession!, validacionPendiente: true };
  await expect(getAuthHeaders()).rejects.toBeInstanceOf(FalloBackend);
  await expect(getAuthHeaders()).rejects.toMatchObject({ categoria: 'transporte' });
});

test('la cookie de playa de otra cuenta no se usa', async () => {
  mockCookie = `otra-cuenta:${PLAYA_A}`;
  expect(await getAuthHeaders()).not.toHaveProperty('X-Playa-Id');
});

test('por la red privada, pedidos simultáneos de cuentas y playas distintas no mezclan cabeceras', async () => {
  const antes = { pub: process.env.NEXT_PUBLIC_API_URL, int: process.env.API_INTERNAL_URL };
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
  process.env.API_INTERNAL_URL = 'http://api.railway.internal:3030';
  const mockFetch = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}'));
  try {
    const pedidos: Record<string, string>[] = [
      { Authorization: 'Bearer token-a', 'X-Playa-Id': 'playa-a' },
      { Authorization: 'Bearer token-b', 'X-Playa-Id': 'playa-b' },
      { Authorization: 'Bearer token-c' },
    ];
    await Promise.all(pedidos.map((headers) => tenantFetch('https://api.example.test/tickets/vehicle-types', { headers })));
    const enviados = mockFetch.mock.calls.map(([, init]) => new Headers((init as RequestInit).headers));
    expect(enviados.map((h) => [h.get('authorization'), h.get('x-playa-id')])).toEqual([
      ['Bearer token-a', 'playa-a'],
      ['Bearer token-b', 'playa-b'],
      ['Bearer token-c', null],
    ]);
    expect(mockFetch.mock.calls.every(([url, init]) => String(url).startsWith('http://api.railway.internal:3030/') && (init as RequestInit).cache === 'no-store')).toBe(true);
  } finally {
    mockFetch.mockRestore();
    process.env.NEXT_PUBLIC_API_URL = antes.pub;
    if (antes.int === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = antes.int;
  }
});
