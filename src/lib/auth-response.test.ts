import { AuthBackendError, readAuthResponse } from './auth-response';

test.each(['login', 'session'] as const)('un 429 en texto conserva el diagnóstico HTTP (%s)', async operation => {
  const response = new Response('rate limited', { status: 429, headers: {
    server: 'railway-hikari', 'retry-after': '60', 'x-railway-request-id': 'test-request',
  } });
  const parse = jest.spyOn(response, 'json');
  await expect(readAuthResponse(response, operation)).rejects.toMatchObject({
    name: 'AuthBackendError', details: { operation, status: 429, server: 'railway-hikari', requestId: 'test-request', retryAfter: '60' },
  });
  expect(parse).not.toHaveBeenCalled();
});

test.each([400, 401, 403, 404])('un rechazo de acceso %s no habilita la sesión', async status => {
  expect(await readAuthResponse(new Response('rechazado', { status }), 'session')).toBeNull();
});

test.each([
  new Response('<html>Bad Gateway</html>', { status: 502 }),
  new Response('rate limited', { status: 200 }),
  Response.json({ error: 'sin usuario' }),
  Response.json(null),
])('una respuesta inesperada no se confunde con credenciales incorrectas', async response => {
  await expect(readAuthResponse(response, 'login')).rejects.toBeInstanceOf(AuthBackendError);
});

test('el usuario válido conserva su versión de autenticación', async () => {
  const user = { id: 'test-user', role: 'ADMIN', authVersion: 3 };
  expect(await readAuthResponse(Response.json(user), 'session')).toEqual(user);
});
