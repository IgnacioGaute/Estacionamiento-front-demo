import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from './types/user.type';
import 'next-auth/jwt';
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
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    firstName?: string;
    lastName?: string;
    accessToken?: string;
    role?: UserRole;
  }
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
    async jwt({ token, user }) {
      try {
        // Browser session updates never determine identity, role or profile.
        const current = user || (token.sub ? await getUserById(token.sub, process.env.API_SECRET_TOKEN!) : null);
        if (!current?.id) return null;
        if (user) {
          token.accessToken = await new SignJWT({ id: current.id, authVersion: current.authVersion ?? 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET!));
        } else {
          if (!token.accessToken) return null;
          const { payload } = await jwtVerify(token.accessToken, new TextEncoder().encode(process.env.NEXTAUTH_SECRET!), { algorithms: ['HS256'] });
          if (!payload.exp || payload.id !== current.id || (payload.authVersion ?? 0) !== (current.authVersion ?? 0)) return null;
        }
        token.sub = current.id;
        token.email = current.email;
        token.username = current.username;
        token.firstName = current.firstName;
        token.lastName = current.lastName;
        token.role = current.role;
        return token;
      } catch { return null; }
    },
    async session({ token, session }) {
      session.user = { ...session.user, id: token.sub!, email: token.email!, username: token.username!, firstName: token.firstName!, lastName: token.lastName!, role: token.role! };
      session.token = token.accessToken!;
      return session;
    },
  },
});
