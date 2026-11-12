import { SignJWT, jwtVerify } from 'jose';
import type { JWT } from 'next-auth/jwt';

// Se prueban los callbacks de NextAuth tal como quedan configurados en auth.ts: NextAuth se
// reemplaza por una función que guarda la configuración, y el backend por `mockCurrent`.
const secret = 'isolated-session-test-secret-only';
process.env.NEXTAUTH_SECRET = secret;
process.env.API_SECRET_TOKEN = 'test-internal';

type Usuario = { id: string; email?: string; username?: string; firstName?: string; lastName?: string; role: string; authVersion: number } | null;
type Config = { callbacks: { jwt: (params: Record<string, unknown>) => Promise<JWT | null>; session: (params: Record<string, unknown>) => Promise<Record<string, unknown>> } };
let mockCurrent: Usuario = null;
// Una falla transitoria del backend al validar la cuenta (red, 429, 5xx): getUserById lanza.
let mockFalla: Error | null = null;
let mockConfig: Config | undefined;

jest.mock('next-auth', () => ({ __esModule: true, default: (options: Config) => { mockConfig = options; return {}; } }));
jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: (options: unknown) => options }));
// auth.ts lo importa solo por sus tipos; el paquete es ESM y Jest no lo carga sin transformar.
jest.mock('next-auth/jwt', () => ({}));
jest.mock('./schemas/auth/login.schema', () => ({ loginSchema: { safeParse: (data: unknown) => ({ success: true, data }) } }));
jest.mock('./services/auth.service', () => ({ loginUser: async () => mockCurrent }));
jest.mock('./services/users.service', () => ({ getUserById: async (id: string) => { if (mockFalla) throw mockFalla; return mockCurrent?.id === id ? mockCurrent : null; } }));

// Se importa acá y no arriba: los import suben por encima de los `let` y NextAuth escribiría
// `mockConfig` antes de que exista.
beforeAll(async () => { await import('./auth'); });

const jwt = (params: Record<string, unknown>) => mockConfig!.callbacks.jwt(params);

test('sesión consulta permisos actuales e ignora identidad y rol enviados por el navegador', async () => {
  mockCurrent = { id: 'user-a', email: 'a@example.test', username: 'a', firstName: 'A', lastName: 'Test', role: 'ADMIN', authVersion: 0 };
  const issued = await jwt({ token: {}, user: mockCurrent });
  expect(issued?.accessToken).toBeTruthy();
  const { payload } = await jwtVerify(issued!.accessToken!, new TextEncoder().encode(secret));
  expect(payload.id).toBe(mockCurrent.id);
  expect(payload.authVersion).toBe(0);
  expect(payload.role).toBeUndefined();
  mockCurrent = { ...mockCurrent, role: 'USER' };
  const refreshed = await jwt({ token: issued, trigger: 'update', session: { user: { id: 'root', role: 'SUPER_ADMIN', firstName: 'Injected' } } });
  expect(refreshed?.sub).toBe('user-a');
  expect(refreshed?.role).toBe('USER');
  expect(refreshed?.firstName).toBe('A');
  mockCurrent = { ...mockCurrent, authVersion: 1 };
  expect(await jwt({ token: issued })).toBeNull();
  mockCurrent = null;
  expect(await jwt({ token: issued })).toBeNull();
});

test('sin token válido no se renueva una sesión automáticamente', async () => {
  mockCurrent = { id: 'user-a', role: 'USER', authVersion: 0 };
  const otherUser = await new SignJWT({ id: 'other', authVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  for (const accessToken of [undefined, 'invalid', otherUser]) {
    expect(await jwt({ token: { sub: mockCurrent.id, accessToken } })).toBeNull();
  }
});

describe('sesión que no se puede validar por una falla transitoria', () => {
  const cuenta = { id: 'user-a', email: 'a@example.test', username: 'a', firstName: 'A', lastName: 'Test', role: 'ADMIN', authVersion: 2 };
  const emitir = async () => { mockFalla = null; mockCurrent = cuenta; return (await jwt({ token: {}, user: cuenta }))!; };
  afterEach(() => { mockFalla = null; jest.useRealTimers(); });

  test.each(['429 rate limited', '502 Bad Gateway', 'timeout', 'fetch failed'])('%s: conserva la sesión sin habilitarla y sin cambiar identidad ni rol', async (motivo) => {
    const emitido = await emitir();
    mockFalla = new Error(motivo);
    // Lo que mande el navegador no cambia nada, ni siquiera en una sesión pendiente.
    const pendiente = await jwt({ token: { ...emitido }, trigger: 'update', session: { user: { id: 'root', role: 'SUPER_ADMIN' } } });
    expect(pendiente).not.toBeNull();
    expect(pendiente).toMatchObject({ sub: 'user-a', role: 'ADMIN', validacionPendiente: true, accessToken: emitido.accessToken });
    const sesion = await mockConfig!.callbacks.session({ token: pendiente, session: { user: {} } });
    expect(sesion).toMatchObject({ validacionPendiente: true });
  });

  test('al volver el backend se valida de nuevo y deja de estar pendiente', async () => {
    const emitido = await emitir();
    mockFalla = new Error('502');
    const pendiente = await jwt({ token: { ...emitido } });
    mockFalla = null;
    const validada = await jwt({ token: { ...pendiente } });
    expect(validada?.validacionPendiente).toBeUndefined();
    expect(validada?.pendienteDesde).toBeUndefined();
  });

  test('una cuenta revocada mientras estaba pendiente se cierra al poder validarla', async () => {
    const emitido = await emitir();
    mockFalla = new Error('502');
    const pendiente = await jwt({ token: { ...emitido } });
    mockFalla = null;
    mockCurrent = null;
    expect(await jwt({ token: { ...pendiente } })).toBeNull();
  });

  test('una contraseña cambiada (authVersion) se cierra aunque antes estuviera pendiente', async () => {
    const emitido = await emitir();
    mockFalla = new Error('429');
    const pendiente = await jwt({ token: { ...emitido } });
    mockFalla = null;
    mockCurrent = { ...cuenta, authVersion: 3 };
    expect(await jwt({ token: { ...pendiente } })).toBeNull();
  });

  test('un token inválido o de otra cuenta se rechaza aunque el backend no conteste', async () => {
    await emitir();
    mockFalla = new Error('502');
    const ajeno = await new SignJWT({ id: 'otra', authVersion: 2 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    const vencido = await new SignJWT({ id: 'user-a', authVersion: 2 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(secret));
    const otroSecreto = await new SignJWT({ id: 'user-a', authVersion: 2 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode('otro-secreto-de-prueba-aislado'));
    for (const accessToken of [undefined, 'invalid', ajeno, vencido, otroSecreto]) {
      expect(await jwt({ token: { sub: 'user-a', accessToken, role: 'ADMIN' } })).toBeNull();
    }
  });

  test('pasadas 12 horas sin poder validarla, la sesión se cierra', async () => {
    const emitido = await emitir();
    mockFalla = new Error('502');
    const pendiente = await jwt({ token: { ...emitido } });
    expect(pendiente?.pendienteDesde).toEqual(expect.any(Number));
    const viejo = { ...pendiente, pendienteDesde: Date.now() - 12 * 60 * 60_000 - 1 };
    expect(await jwt({ token: viejo })).toBeNull();
  });
});
