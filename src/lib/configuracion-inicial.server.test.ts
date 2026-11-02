// A quién lleva la configuración inicial y desde qué pantallas. Sesión, cookies, encabezados y
// contexto los decide cada test; redirect se registra en lugar de cortar el render.
let session: { user: { id: string; role: string } } | null = null;
let ruta = '/tickets';
let playas: { id: string; configuracionPendiente?: boolean }[] = [];
const redirect = jest.fn();

jest.mock('@/auth', () => ({ auth: async () => session }));
jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => ({ get: (nombre: string) => (nombre === 'x-ruta' ? ruta : null) }),
}));
jest.mock('next/navigation', () => ({ redirect: (destino: string) => redirect(destino) }));
jest.mock('@/actions/tenancy/context.action', () => ({
  getOperationalContext: async () => ({ role: session?.user.role, empresa: { id: 'e', nombre: 'Empresa' }, playas }),
}));

import { llevarAConfiguracionInicial } from './configuracion-inicial.server';

const visitar = async (rol: string, desde: string, pendiente: boolean) => {
  session = { user: { id: 'u', role: rol } };
  ruta = desde;
  playas = [{ id: 'p', configuracionPendiente: pendiente }];
  redirect.mockClear();
  await llevarAConfiguracionInicial();
  return redirect.mock.calls.map(([destino]) => destino);
};

test('el administrador de una playa pendiente va a la configuración inicial desde cualquier pantalla', async () => {
  expect(await visitar('ADMIN', '/tickets', true)).toEqual(['/configuracion-inicial']);
  expect(await visitar('ADMIN', '/admin/tarifas', true)).toEqual(['/configuracion-inicial']);
});

test('la vuelta de MercadoPago y la configuración misma no se cortan', async () => {
  expect(await visitar('ADMIN', '/admin/configuracion/mercadopago', true)).toEqual([]);
  expect(await visitar('ADMIN', '/configuracion-inicial', true)).toEqual([]);
});

test('operadores, super admin y playas terminadas entran directo', async () => {
  expect(await visitar('USER', '/tickets', true)).toEqual([]);
  expect(await visitar('SUPER_ADMIN', '/tickets', true)).toEqual([]);
  expect(await visitar('ADMIN', '/tickets', false)).toEqual([]);
});
