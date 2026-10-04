import type { NextRequest } from 'next/server';

// El middleware se prueba solo: la sesión la decide cada test y NextResponse devuelve algo fácil
// de comparar ('next' o la ruta del redirect) en lugar de una Response de verdad.
let mockSession: { user: { role: string; id: string }; token: string } | null = null;
jest.mock('./auth', () => ({ auth: async () => mockSession }));
jest.mock('next/server', () => ({
  NextResponse: { next: () => 'next', redirect: (url: URL) => url.pathname },
}));

import middleware from './middleware';

const visit = (route: string, role?: string) => {
  mockSession = role ? { user: { role, id: 'test-user' }, token: 'test-token' } : null;
  return middleware({ nextUrl: new URL(route, 'http://localhost') } as unknown as NextRequest) as unknown as Promise<string>;
};

test('SUPER_ADMIN solo ve administración de plataforma, también al ingresar por URL', async () => {
  for (const route of ['/tickets', '/admin/tickets', '/admin/caja', '/notes', '/', '/auth/login', '/admin/users']) {
    expect(await visit(route, 'SUPER_ADMIN')).toBe('/admin/empresas');
  }
  expect(await visit('/admin/empresas', 'SUPER_ADMIN')).toBe('next');
  expect(await visit('/api/auth/signout', 'SUPER_ADMIN')).toBe('next');
});

test('administración de plataforma no admite operadores ni administradores de empresa', async () => {
  for (const role of ['USER', 'ADMIN']) expect(await visit('/admin/empresas', role)).toBe('/403');
  expect(await visit('/admin/empresas')).toBe('/auth/login');
  expect(await visit('/admin/tickets', 'ADMIN')).toBe('next');
  expect(await visit('/admin/tickets', 'USER')).toBe('/403');
  expect(await visit('/tickets', 'USER')).toBe('next');
});
