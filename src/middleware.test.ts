import type { NextRequest } from 'next/server';

// El middleware se prueba solo: la sesión la decide cada test y NextResponse devuelve algo fácil
// de comparar ('next' o la ruta del redirect) en lugar de una Response de verdad.
let mockSession: { user: { role: string; id: string }; token: string } | null = null;
jest.mock('./auth', () => ({ auth: async () => mockSession }));
jest.mock('next/server', () => ({
  NextResponse: { next: () => 'next', redirect: (url: URL) => url.pathname },
}));

import middleware from './middleware';

const visit = (route: string, role?: string, selection?: string) => {
  mockSession = role ? { user: { role, id: 'test-user' }, token: 'test-token' } : null;
  return middleware({ nextUrl: new URL(route, 'http://localhost'), cookies: { get: () => selection ? { value: selection } : undefined } } as unknown as NextRequest) as unknown as Promise<string>;
};

test('SUPER_ADMIN debe elegir destino antes de entrar, también por URL directa', async () => {
  for (const route of ['/tickets', '/admin/tickets', '/admin/caja', '/notes', '/', '/auth/login', '/admin/users']) {
    expect(await visit(route, 'SUPER_ADMIN')).toBe('/seleccionar-acceso');
  }
  expect(await visit('/admin/empresas', 'SUPER_ADMIN')).toBe('/seleccionar-acceso');
  expect(await visit('/seleccionar-acceso', 'SUPER_ADMIN')).toBe('next');
  expect(await visit('/api/auth/signout', 'SUPER_ADMIN')).toBe('next');
});

test('SUPER_ADMIN navega según el ámbito elegido y puede volver al selector', async () => {
  const playa = 'test-user:11111111-1111-4111-8111-111111111111';
  for (const route of ['/tickets', '/admin/caja', '/notes', '/admin/users']) {
    expect(await visit(route, 'SUPER_ADMIN', playa)).toBe('next');
    expect(await visit(route, 'SUPER_ADMIN', 'test-user:platform')).toBe('/admin/empresas');
  }
  expect(await visit('/admin/empresas', 'SUPER_ADMIN', 'test-user:platform')).toBe('next');
  expect(await visit('/admin/empresas', 'SUPER_ADMIN', playa)).toBe('/tickets');
  expect(await visit('/seleccionar-acceso', 'SUPER_ADMIN', playa)).toBe('next');
  expect(await visit('/tickets', 'SUPER_ADMIN', 'otro:platform')).toBe('/seleccionar-acceso');
  expect(await visit('/tickets', 'SUPER_ADMIN', 'test-user:invalido')).toBe('/seleccionar-acceso');
});

test('el selector de superadministrador requiere sesión y rol', async () => {
  expect(await visit('/seleccionar-acceso')).toBe('/auth/login');
  expect(await visit('/seleccionar-acceso', 'ADMIN')).toBe('/tickets');
  expect(await visit('/seleccionar-acceso', 'USER')).toBe('/tickets');
});

test('administración de plataforma no admite operadores ni administradores de empresa', async () => {
  for (const role of ['USER', 'ADMIN']) expect(await visit('/admin/empresas', role)).toBe('/403');
  expect(await visit('/admin/empresas')).toBe('/auth/login');
  expect(await visit('/admin/tickets', 'ADMIN')).toBe('next');
  expect(await visit('/admin/tickets', 'USER')).toBe('/403');
  expect(await visit('/tickets', 'USER')).toBe('next');
});
