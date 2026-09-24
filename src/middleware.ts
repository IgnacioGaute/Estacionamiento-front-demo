import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
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
  if (isApiAuthRoute || isPublicApiRoute) return NextResponse.next();

  if (nextUrl.pathname === '/' && !isLoggedIn) return NextResponse.redirect(new URL('/auth/login', nextUrl));

  // Las secciones de plataforma: solo el super admin entra, y solo a estas. Agregar una ruta
  // nueva de administración de la plataforma exige sumarla acá, o el super admin rebota a su
  // pantalla inicial.
  const platformHome = "/admin/empresas";
  const platformRoutes = [platformHome, "/admin/metricas"];
  const enPlataforma = platformRoutes.some(
    (ruta) =>
      nextUrl.pathname === ruta || nextUrl.pathname.startsWith(ruta + "/"),
  );
  if (isLoggedIn && role === "SUPER_ADMIN") {
    if (enPlataforma) return NextResponse.next();
    return NextResponse.redirect(new URL(platformHome, nextUrl));
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
