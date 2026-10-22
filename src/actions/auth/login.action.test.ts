const mockSignIn = jest.fn();
jest.mock('@/auth', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

import { loginAction } from './login.action';

test('al ingresar pasa por la selección con la sesión nueva y conserva el retorno de otros roles', async () => {
  mockSignIn.mockResolvedValue(undefined);
  const result = await loginAction({ identifier: 'superadmin', password: 'password-test' }, '/admin/caja');
  expect(result.redirectTo).toBe('/seleccionar-acceso?callbackUrl=%2Fadmin%2Fcaja');
  expect(mockSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ redirect: false }));
});

test.each(['https://ajeno.test', '//ajeno.test', '/\\ajeno.test'])('rechaza un destino externo: %s', async callback => {
  const result = await loginAction({ identifier: 'superadmin', password: 'password-test' }, callback);
  expect(result.redirectTo).toBe('/seleccionar-acceso?callbackUrl=%2Ftickets');
});
