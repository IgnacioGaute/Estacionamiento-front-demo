import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from './types/user.type';
import type { JWT } from 'next-auth/jwt';
import { cache } from 'react';
import { loginSchema } from './schemas/auth/login.schema';
import { loginUser } from './services/auth.service';
import { getUserById } from './services/users.service';

declare module 'next-auth' {
  interface User {
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    authVersion?: number;
    accessToken?: string;
  }
  interface Session {
    user: { id: string; email: string; username: string; firstName: string; lastName: string; role: UserRole } & DefaultSession['user'];
    token: string;
    // La cuenta no se pudo volver a validar por un fallo transitorio: no habilita operar.
    validacionPendiente?: boolean;
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    firstName?: string;
    lastName?: string;
    accessToken?: string;
    role?: UserRole;
    validacionPendiente?: boolean;
    pendienteDesde?: number;
  }
}

// Cuánto puede seguir abierta, sin habilitar, una sesión que no se pudo volver a validar.
const MAX_SIN_VALIDAR_MS = 12 * 60 * 60_000;
const secreto = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

// Una consulta de la cuenta por render del servidor: el layout, la página y cada servicio llaman a
// auth(). cache() de React dura un solo pedido; no se comparte entre usuarios ni entre pedidos.
const cuentaVigente = cache((id: string) => getUserById(id, process.env.API_SECRET_TOKEN!));

function conCuenta(token: JWT, cuenta: { id: string; email?: string | null; username: string; firstName: string; lastName: string; role: UserRole }) {
  token.sub = cuenta.id;
  token.email = cuenta.email;
  token.username = cuenta.username;
  token.firstName = cuenta.firstName;
  token.lastName = cuenta.lastName;
  token.role = cuenta.role;
  delete token.validacionPendiente;
  delete token.pendienteDesde;
  return token;
}

export const { unstable_update, auth, handlers, signIn, signOut } = NextAuth({
  pages: { signIn: '/auth/login', error: '/auth/error' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [Credentials({
    credentials: { identifier: { type: 'text' }, password: { type: 'password' } },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      return loginUser(parsed.data, process.env.API_SECRET_TOKEN!);
    },
  })],
  callbacks: {
    // NextAuth borra la cookie tanto si esto devuelve null como si lanza (@auth/core, actions/session).
    // Por eso un fallo transitorio al consultar la cuenta no lanza: devuelve el token marcado como
    // validación pendiente, que no habilita operar (ver getAuthHeaders y (protected)/layout).
    async jwt({ token, user }) {
      try {
        // Browser session updates never determine identity, role or profile.
        if (user) {
          const id = user.id;
          if (!id) return null;
          token.accessToken = await new SignJWT({ id, authVersion: user.authVersion ?? 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secreto());
          return conCuenta(token, { ...user, id });
        }
        if (!token.sub || !token.accessToken) return null;
        // Primero lo que se comprueba sin red: firma, vencimiento y que el token sea de esta cuenta.
        // Un token inválido o vencido se rechaza igual aunque el backend no conteste.
        const { payload } = await jwtVerify(token.accessToken, secreto(), { algorithms: ['HS256'] });
        if (!payload.exp || payload.id !== token.sub) return null;
        let current: Awaited<ReturnType<typeof getUserById>>;
        try {
          current = await cuentaVigente(token.sub);
        } catch {
          // Red, timeout, 429, 5xx o respuesta inválida: no se sabe si la cuenta sigue vigente.
          // Se conserva la sesión sin habilitarla, con un límite: pasado, se cierra.
          const desde = typeof token.pendienteDesde === 'number' ? token.pendienteDesde : Date.now();
          if (Date.now() - desde > MAX_SIN_VALIDAR_MS) return null;
          token.validacionPendiente = true;
          token.pendienteDesde = desde;
          return token;
        }
        // Rechazo definitivo (no existe, revocada) o contraseña cambiada (authVersion).
        if (!current?.id || current.id !== token.sub || (payload.authVersion ?? 0) !== (current.authVersion ?? 0)) return null;
        return conCuenta(token, current);
      } catch { return null; }
    },
    async session({ token, session }) {
      session.user = { ...session.user, id: token.sub!, email: token.email!, username: token.username!, firstName: token.firstName!, lastName: token.lastName!, role: token.role! };
      session.token = token.accessToken!;
      session.validacionPendiente = token.validacionPendiente === true;
      return session;
    },
  },
});
