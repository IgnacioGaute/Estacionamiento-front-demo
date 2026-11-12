// Qué dibuja el layout protegido según lo que pasó con la sesión y con el contexto operativo. Una
// consulta fallida no puede terminar en «Asignación pendiente» ni dejar Cerrar sesión como única
// salida; una sesión que no se pudo validar no abre la aplicación.
import type { ReactElement } from 'react';

type Sesion = { user: { id: string; role: string }; token: string; validacionPendiente?: boolean } | null;
let mockSession: Sesion;
let mockContexto: () => Promise<unknown>;
const mockRedirect = jest.fn((ruta: string) => { throw new Error(`redirect ${ruta}`); });
let mockCookie: string | undefined;

jest.mock('@/auth', () => ({ auth: async () => mockSession }));
jest.mock('@/services/tickets.service', () => ({ getTicketSchedule: async () => ({ shiftsEnabled: false }) }));
jest.mock('next-auth/react', () => ({ SessionProvider: ({ children }: { children: unknown }) => children }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => (mockCookie ? { value: mockCookie } : undefined) }) }));
jest.mock('next/navigation', () => ({ redirect: (ruta: string) => mockRedirect(ruta) }));
jest.mock('@/lib/configuracion-inicial.server', () => ({ contextoOperativo: () => mockContexto() }));
jest.mock('@/components/tenant-provider', () => ({ TenantProvider: ({ children }: { children: unknown }) => children, NoPlaya: () => null }));
jest.mock('@/components/estado-de-acceso', () => ({ EstadoDeAcceso: () => null }));

import ProtectedLayout from './layout';
import { EstadoDeAcceso } from '@/components/estado-de-acceso';
import { NoPlaya } from '@/components/tenant-provider';
import { FalloBackend } from '@/lib/fallos-backend';

const hijos = <main>app</main>;
const dibujar = async () => (await ProtectedLayout({ children: hijos })) as ReactElement | null;
// Busca en el árbol devuelto el primer elemento de ese tipo (los providers están mockeados).
function buscar(nodo: unknown, tipo: unknown): ReactElement | null {
  if (!nodo || typeof nodo !== 'object') return null;
  const el = nodo as ReactElement<{ children?: unknown }>;
  if (el.type === tipo) return el;
  const hijosDe = el.props?.children;
  for (const h of Array.isArray(hijosDe) ? hijosDe : [hijosDe]) {
    const encontrado = buscar(h, tipo);
    if (encontrado) return encontrado;
  }
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCookie = undefined;
  mockSession = { user: { id: 'op', role: 'USER' }, token: 'token' };
  mockContexto = async () => ({ role: 'USER', empresa: { id: 'e', nombre: 'Empresa' }, playas: [{ id: 'p1', nombre: 'Playa' }] });
});

test('con empresa y playa abre la aplicación', async () => {
  const arbol = await dibujar();
  expect(buscar(arbol, 'main')).toBeTruthy();
  expect(buscar(arbol, EstadoDeAcceso)).toBeNull();
});

test('una sesión con validación pendiente no consulta el contexto ni abre la aplicación', async () => {
  mockSession = { ...mockSession!, validacionPendiente: true };
  const consultado = jest.fn();
  mockContexto = async () => { consultado(); return {}; };
  const arbol = await dibujar();
  expect(buscar(arbol, EstadoDeAcceso)?.props).toMatchObject({ motivo: 'sesion-pendiente' });
  expect(buscar(arbol, 'main')).toBeNull();
  expect(consultado).not.toHaveBeenCalled();
});

test.each([
  ['429 del proxy', 'limite', 30_000],
  ['502', 'servidor', null],
  ['timeout', 'tiempo', null],
  ['sin conexión', 'transporte', null],
  ['respuesta inválida', 'respuesta-invalida', null],
])('un fallo al cargar empresa y playas (%s) se muestra como tal, con reintento', async (_caso, categoria, reintentarEnMs) => {
  mockContexto = async () => { throw new FalloBackend('No pudimos cargar tu empresa y tus playas.', { categoria: categoria as never, reintentarEnMs }); };
  const arbol = await dibujar();
  expect(buscar(arbol, EstadoDeAcceso)?.props).toMatchObject({ motivo: 'contexto-no-disponible', reintentarEnMs });
  expect(buscar(arbol, NoPlaya)).toBeNull();
  expect(buscar(arbol, 'main')).toBeNull();
});

test('un error inesperado también se trata como temporal, nunca como «sin asignación»', async () => {
  mockContexto = async () => { throw new Error('algo raro'); };
  expect(buscar(await dibujar(), EstadoDeAcceso)?.props).toMatchObject({ motivo: 'contexto-no-disponible' });
});

test('una asignación realmente vacía sigue mostrando «sin playa»', async () => {
  mockContexto = async () => ({ role: 'USER', empresa: { id: 'e', nombre: 'Empresa' }, playas: [] });
  const arbol = await dibujar();
  expect(buscar(arbol, NoPlaya)).toBeTruthy();
  expect(buscar(arbol, EstadoDeAcceso)).toBeNull();
});

test('sin empresa activa (403) muestra el mensaje del backend', async () => {
  mockContexto = async () => { throw new FalloBackend('Tu cuenta no tiene una empresa activa.', { categoria: 'permiso' }); };
  expect(buscar(await dibujar(), EstadoDeAcceso)?.props).toMatchObject({ motivo: 'sin-empresa', mensaje: 'Tu cuenta no tiene una empresa activa.' });
});

test('una sesión revocada (401) pide iniciar sesión de nuevo', async () => {
  mockContexto = async () => { throw new FalloBackend('Iniciá sesión.', { categoria: 'autenticacion' }); };
  expect(buscar(await dibujar(), EstadoDeAcceso)?.props).toMatchObject({ motivo: 'sesion-invalida' });
});

test('el super admin con un fallo temporal no rebota al selector de acceso', async () => {
  mockSession = { user: { id: 'super', role: 'SUPER_ADMIN' }, token: 'token' };
  mockCookie = 'super:p1';
  mockContexto = async () => { throw new FalloBackend('x', { categoria: 'servidor' }); };
  expect(buscar(await dibujar(), EstadoDeAcceso)?.props).toMatchObject({ motivo: 'contexto-no-disponible' });
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('cada render lleva un intento distinto (la pantalla cuenta los fallos seguidos)', async () => {
  mockContexto = async () => { throw new FalloBackend('x', { categoria: 'servidor' }); };
  const a = buscar(await dibujar(), EstadoDeAcceso)?.props as { intento: string };
  const b = buscar(await dibujar(), EstadoDeAcceso)?.props as { intento: string };
  expect(a.intento).not.toBe(b.intento);
});
