import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { ACCESS_SELECTION_ROUTE, PLATFORM_HOME, PLATFORM_SELECTION, selectedAccess } from './lib/access-scope';
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicApiRoutes,
  publicRoutes,
} from "./routes";

// Acá no hay ninguna ruta pública: los comprobantes que se entregan al cliente los sirve otro
// servicio, en su propio dominio (repo `estacionamiento-comprobantes-demo`).
export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { nextUrl } = req;

  const isLoggedIn = !!session?.user?.id && !!session?.token;
  const role = session?.user?.role?.toUpperCase() ?? "USER";

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname as never);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname as never);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname as never);

  // 🔓 Permitir rutas públicas o de autenticación
  // La API de contingencia valida la sesión y responde JSON por sí misma. Un redirect
  // del middleware a login devolvía HTML y ocultaba el motivo real del fallo.
  if (isApiAuthRoute || isPublicApiRoute || nextUrl.pathname.startsWith('/api/offline/')) return NextResponse.next();

  if (nextUrl.pathname === '/' && !isLoggedIn) return NextResponse.redirect(new URL('/auth/login', nextUrl));

  // La elección es por cuenta: una sesión nueva no hereda la playa de otra persona.
  const platformHome = PLATFORM_HOME;
  const platformRoutes = [platformHome, "/admin/metricas", "/admin/planes"];
  const enPlataforma = platformRoutes.some(
    (ruta) =>
      nextUrl.pathname === ruta || nextUrl.pathname.startsWith(ruta + "/"),
  );
  if (isLoggedIn && role === "SUPER_ADMIN") {
    if (nextUrl.pathname === ACCESS_SELECTION_ROUTE) return NextResponse.next();
    const access = selectedAccess(req.cookies.get('parking-playa')?.value, session!.user.id);
    if (!access) return NextResponse.redirect(new URL(ACCESS_SELECTION_ROUTE, nextUrl));
    const home = access === PLATFORM_SELECTION ? platformHome : DEFAULT_LOGIN_REDIRECT;
    if (isAuthRoute || nextUrl.pathname === '/' || (access === PLATFORM_SELECTION && !enPlataforma) || (access !== PLATFORM_SELECTION && enPlataforma)) {
      return NextResponse.redirect(new URL(home, nextUrl));
    }
    return NextResponse.next();
  }
  if (nextUrl.pathname === ACCESS_SELECTION_ROUTE) {
    const callback = nextUrl.searchParams.get('callbackUrl');
    const destination = callback?.startsWith('/') && !callback.startsWith('//') && !callback.includes('\\') && callback.split('?')[0].replace(/\/$/, '') !== ACCESS_SELECTION_ROUTE ? callback : DEFAULT_LOGIN_REDIRECT;
    return NextResponse.redirect(new URL(isLoggedIn ? destination : '/auth/login', nextUrl));
  }
  if (enPlataforma) {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/403" : "/auth/login", nextUrl),
    );
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  if (nextUrl.pathname === '/' && isLoggedIn) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));

  // 🚪 Si no está logueado y la ruta no es pública → login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  // 🚨 Protección por rol para /admin/*
  if (nextUrl.pathname.startsWith("/admin")) {
    // ✅ Rutas permitidas para todos los roles

    // 🔒 Si no es ADMIN y la ruta no está en la lista, bloquear acceso
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
