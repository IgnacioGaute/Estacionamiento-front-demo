jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 'cuenta-1', email: 'persona@example.test', role: 'USER' } }) }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'cuenta-1:playa-1' }) }) }));

import { POST } from './route';

let mockError: jest.SpyInstance;
beforeEach(() => { mockError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

const enviar = (datos: Record<string, unknown>) => POST(new Request('https://front.example.test/api/errores', { method: 'POST', body: JSON.stringify(datos) }));

test('registra el error con la cuenta por id, sin el email, y la categoría de versión', async () => {
  await enviar({ nombre: 'UnrecognizedActionError', mensaje: 'Server Action "x" was not found on the server.', ruta: '/tickets', version: 'abc' });
  const registro = JSON.parse(mockError.mock.calls[0][1]);
  expect(registro).toMatchObject({ usuario: 'cuenta-1', playa: 'playa-1', categoria: 'version', ruta: '/tickets' });
  expect(JSON.stringify(registro)).not.toContain('persona@example.test');
});

test('el mismo error repetido se registra una vez por minuto', async () => {
  for (let i = 0; i < 4; i++) await enviar({ nombre: 'TypeError', mensaje: 'x is undefined', ruta: '/caja' });
  expect(mockError).toHaveBeenCalledTimes(1);
});
