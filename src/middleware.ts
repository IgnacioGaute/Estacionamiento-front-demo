import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicApiRoutes,
  publicRoutes,
} from "./routes";

export default async function middleware(req: NextRequest) {
  if (/^\/comprobantes\/[a-f0-9]{64}\/?$/.test(req.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
  const session = await auth();
  const { nextUrl } = req;

  const isLoggedIn = !!session?.user?.id && !!session?.token;
  const role = session?.user?.role?.toUpperCase() ?? "USER";

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname as never);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname as never);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname as never);

  // 🔓 Permitir rutas públicas o de autenticación
  if (isApiAuthRoute || isPublicApiRoute) return NextResponse.next();

  if (nextUrl.pathname === '/' && !isLoggedIn) return NextResponse.redirect(new URL('/auth/login', nextUrl));

  const platformHome = "/admin/empresas";
  if (isLoggedIn && role === "SUPER_ADMIN") {
    if (
      nextUrl.pathname === platformHome ||
      nextUrl.pathname.startsWith(platformHome + "/")
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(platformHome, nextUrl));
  }
  if (
    nextUrl.pathname === platformHome ||
    nextUrl.pathname.startsWith(platformHome + "/")
  ) {
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
