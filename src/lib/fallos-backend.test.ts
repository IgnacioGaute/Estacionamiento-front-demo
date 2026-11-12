import {
  FalloBackend,
  _reiniciarRegistroDeFallos,
  categoriaDeEstado,
  esTransitoria,
  leerRespuesta,
  mensajeDeFallo,
  registrarFallo,
  retryAfterMs,
  rutaSanitizada,
  serializarFallo,
} from './fallos-backend';
import { esperaReintento } from './reintentos';

let mockWarn: jest.SpyInstance;
beforeEach(() => {
  _reiniciarRegistroDeFallos();
  mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('un 429 con cuerpo de texto no se interpreta como JSON ni se muestra el texto del proxy', async () => {
  const respuesta = new Response('rate limited', { status: 429, headers: { 'retry-after': '12', 'x-request-id': 'req-1' } });
  const error = await leerRespuesta(respuesta, 'GET /tickets', 'No pudimos cargar las estadías.').catch((e) => e);
  expect(error).toBeInstanceOf(FalloBackend);
  expect(error).toMatchObject({ categoria: 'limite', estado: 429, reintentarEnMs: 12_000, requestId: 'req-1', message: 'No pudimos cargar las estadías.' });
});

test.each([
  [new Response('<html>502 Bad Gateway</html>', { status: 502 }), 'servidor'],
  [new Response('', { status: 503 }), 'servidor'],
  [Response.json({ message: 'Internal server error' }, { status: 500 }), 'servidor'],
])('un 5xx es transitorio y no muestra el cuerpo', async (respuesta, categoria) => {
  const error = (await leerRespuesta(respuesta, 'GET /x', 'Mensaje propio.').catch((e) => e)) as FalloBackend;
  expect(error).toMatchObject({ categoria, message: 'Mensaje propio.' });
  expect(esTransitoria(error.categoria)).toBe(true);
});

test('un rechazo de negocio conserva el mensaje estructurado del backend', async () => {
  const error = await leerRespuesta(Response.json({ code: 'TRANSFERENCIA_USADA', message: ['La transferencia ya se usó', 'Elegí otra'] }, { status: 409 }), 'POST /x', 'x').catch((e) => e);
  expect(error).toMatchObject({ categoria: 'negocio', message: 'La transferencia ya se usó. Elegí otra' });
  expect(mensajeDeFallo(error, 'Por defecto')).toBe('La transferencia ya se usó. Elegí otra');
});

test('un 200 que no es JSON es una respuesta inválida (y se registra), un cuerpo vacío es null', async () => {
  await expect(leerRespuesta(new Response('rate limited', { status: 200, headers: { 'content-type': 'text/plain' } }), 'GET /x', 'x')).rejects.toMatchObject({ categoria: 'respuesta-invalida' });
  expect(JSON.parse(mockWarn.mock.calls[0][1])).toMatchObject({ categoria: 'respuesta-invalida', contentType: 'text/plain' });
  await expect(leerRespuesta(new Response('', { status: 200 }), 'GET /x', 'x')).resolves.toBeNull();
});

test('un 401 no muestra el «Unauthorized» genérico del backend', async () => {
  const error = await leerRespuesta(Response.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }), 'GET /x', 'No pudimos cargar los datos.').catch((e) => e);
  expect(error).toMatchObject({ categoria: 'autenticacion', message: 'No pudimos cargar los datos.' });
});

test('categorías por estado HTTP', () => {
  expect([429, 401, 403, 404, 409, 500, 502, 503].map(categoriaDeEstado)).toEqual(['limite', 'autenticacion', 'permiso', 'negocio', 'negocio', 'servidor', 'servidor', 'servidor']);
  expect(['autenticacion', 'permiso', 'negocio'].some((c) => esTransitoria(c as never))).toBe(false);
});

test('Retry-After en segundos o fecha, acotado a 5 minutos', () => {
  const ahora = Date.parse('2026-11-11T12:00:00Z');
  expect(retryAfterMs('30', ahora)).toBe(30_000);
  expect(retryAfterMs('Wed, 11 Nov 2026 12:01:00 GMT', ahora)).toBe(60_000);
  expect(retryAfterMs('99999', ahora)).toBe(300_000);
  expect(retryAfterMs('basura', ahora)).toBeNull();
  expect(retryAfterMs(null, ahora)).toBeNull();
});

test('lo que cruza al navegador es plano y sin pila; un error desconocido se trata como transporte', () => {
  expect(serializarFallo(new FalloBackend('x', { categoria: 'limite', reintentarEnMs: 5_000 }))).toEqual({ categoria: 'limite', transitorio: true, reintentarEnMs: 5_000 });
  expect(serializarFallo(new Error('raro'))).toEqual({ categoria: 'transporte', transitorio: true, reintentarEnMs: null });
  expect(mensajeDeFallo(new Error('detalle interno'), 'Mensaje para la persona')).toBe('Mensaje para la persona');
});

test('rutas sin ids, tokens ni patentes', () => {
  expect(rutaSanitizada('/tickets/registrations/0b9c6a0e-1c4f-4a65-9f52-1f8e2f3e0a11/receipt?token=abc')).toBe('/tickets/registrations/:id/receipt');
  expect(rutaSanitizada('/tickets/plate/AB123CD')).toBe('/tickets/plate/:patente');
  expect(rutaSanitizada('/mercadopago/cobros/123456789')).toBe('/mercadopago/cobros/:id');
});

test('el mismo fallo se registra una vez por minuto y cuenta las repeticiones', () => {
  const t = Date.parse('2026-11-11T12:00:00Z');
  const d = { operacion: 'GET /tenant/context', categoria: 'servidor' as const, estado: 502 };
  expect(registrarFallo(d, t)).toBe(true);
  expect(registrarFallo(d, t + 1_000)).toBe(false);
  expect(registrarFallo(d, t + 2_000)).toBe(false);
  expect(registrarFallo({ ...d, estado: 503 }, t + 2_000)).toBe(true);
  expect(registrarFallo(d, t + 61_000)).toBe(true);
  expect(JSON.parse(mockWarn.mock.calls[2][1])).toMatchObject({ repeticionesOmitidas: 2 });
});

test('espera progresiva con variación, tope y Retry-After', () => {
  const sinAzar = { azar: () => 1 };
  expect([1, 2, 3, 4, 5, 6, 7].map((n) => esperaReintento(n, sinAzar))).toEqual([2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
  // La variación nunca baja de la mitad: muchos celulares no vuelven en el mismo segundo.
  expect(esperaReintento(3, { azar: () => 0 })).toBe(4_000);
  expect(esperaReintento(1, { azar: () => 0.5, retryAfterMs: 20_000 })).toBe(20_000);
});
