import { SignJWT, jwtVerify } from 'jose';
import type { JWT } from 'next-auth/jwt';

// Se prueban los callbacks de NextAuth tal como quedan configurados en auth.ts: NextAuth se
// reemplaza por una función que guarda la configuración, y el backend por `mockCurrent`.
const secret = 'isolated-session-test-secret-only';
process.env.NEXTAUTH_SECRET = secret;
process.env.API_SECRET_TOKEN = 'test-internal';

type Usuario = { id: string; email?: string; username?: string; firstName?: string; lastName?: string; role: string; authVersion: number } | null;
type Config = { callbacks: { jwt: (params: Record<string, unknown>) => Promise<JWT | null> } };
let mockCurrent: Usuario = null;
let mockConfig: Config | undefined;

jest.mock('next-auth', () => ({ __esModule: true, default: (options: Config) => { mockConfig = options; return {}; } }));
jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: (options: unknown) => options }));
// auth.ts lo importa solo por sus tipos; el paquete es ESM y Jest no lo carga sin transformar.
jest.mock('next-auth/jwt', () => ({}));
jest.mock('./schemas/auth/login.schema', () => ({ loginSchema: { safeParse: (data: unknown) => ({ success: true, data }) } }));
jest.mock('./services/auth.service', () => ({ loginUser: async () => mockCurrent }));
jest.mock('./services/users.service', () => ({ getUserById: async (id: string) => (mockCurrent?.id === id ? mockCurrent : null) }));

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
