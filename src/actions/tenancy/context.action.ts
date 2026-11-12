"use server";
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { PLATFORM_SELECTION } from '@/lib/access-scope';
import type { SituacionCuenta } from "@/types/suscripcion.type";
import type { Modalidad } from "@/lib/modalidad";
import { FalloBackend, leerRespuesta, registrarFallo } from "@/lib/fallos-backend";
export type OperationalContext = {
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
  empresa: { id: string; nombre: string } | null;
  playas: {
    id: string;
    nombre: string;
    empresaId: string;
    // Secciones opcionales que el super admin prendió en la playa.
    modulos?: { inquilinos?: boolean };
    // Con cobro o gratuita; la define el super admin. Ausente (backend anterior) = con cobro.
    modalidad?: Modalidad;
    // Motor disponible: token propio de Plate Recognizer o fast-alpr de la plataforma.
    reconocimientoPatentes?: boolean;
    // Playa nueva que todavía no terminó la configuración inicial: a su administrador se le muestran
    // los pasos antes de entrar. Ausente (backend anterior) = terminada.
    configuracionPendiente?: boolean;
  }[];
  // Estado de la cuenta con la plataforma (prueba, vencida, suspendida), para los avisos.
  cuenta?: SituacionCuenta | null;
};
// Lanza FalloBackend con la categoría: autenticacion (401, la cuenta ya no vale), permiso (403,
// sin empresa activa) o una transitoria (red, timeout, 429, 5xx, respuesta inválida). Una
// consulta fallida nunca se devuelve como una lista vacía: eso diría «sin asignación».
export async function getOperationalContext(): Promise<OperationalContext> {
  const session = await auth();
  if (!session?.token) throw new FalloBackend("Iniciá sesión para continuar.", { categoria: "autenticacion" });
  if (session.validacionPendiente)
    throw new FalloBackend("No pudimos validar tu sesión.", { categoria: "transporte" });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tenant/context`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    },
  );
  const context = await leerRespuesta<OperationalContext>(response, "GET /tenant/context", "No pudimos cargar tu empresa y tus playas.");
  if (!context || !Array.isArray(context.playas)) {
    registrarFallo({ operacion: "GET /tenant/context", categoria: "respuesta-invalida", estado: response.status });
    throw new FalloBackend("No pudimos cargar tu empresa y tus playas.", { categoria: "respuesta-invalida" });
  }
  return context;
}
export async function selectPlayaAction(playaId: string) {
  const session = await auth();
  let context: OperationalContext;
  try {
    context = await getOperationalContext();
  } catch {
    // Sin el contexto no se puede validar la elección: no se guarda nada.
    return { error: "No pudimos comprobar tus playas. Revisá la conexión y probá de nuevo." };
  }
  if (context.role === "USER")
    return { error: "La playa la asigna el administrador." };
  if (!context.playas.some((p) => p.id === playaId))
    return { error: "No tenés acceso a esa playa." };
  (await cookies()).set("parking-playa", `${session!.user.id}:${playaId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { ok: true };
}

export async function selectPlatformAction() {
  const session = await auth();
  if (!session?.token || session.user.role !== 'SUPER_ADMIN')
    return { error: 'Solo el superadministrador puede entrar a la plataforma.' };
  (await cookies()).set('parking-playa', `${session.user.id}:${PLATFORM_SELECTION}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return { ok: true };
}

export async function operatorPlayaAction(
  userId: string,
  playaId?: string,
): Promise<{
  playas?: { id: string; nombre: string }[];
  playaId?: string | null;
  error?: string;
}> {
  const session = await auth();
  if (!session?.token) return { error: "Iniciá sesión para continuar." };
  if (session.validacionPendiente) return { error: "No pudimos validar tu sesión. Reintentá en unos segundos." };
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tenant/operators/${encodeURIComponent(userId)}/playa`,
      {
        method: playaId ? "PATCH" : "GET",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        ...(playaId ? { body: JSON.stringify({ playaId }) } : {}),
        cache: "no-store",
      },
    );
    const result = await response.json();
    if (!response.ok)
      return { error: result.message || "No se pudo guardar la asignación." };
    if (playaId) revalidateTag('users');
    return result;
  } catch {
    return { error: "No se pudo conectar. Intentá nuevamente." };
  }
}

export async function operatorAssignmentsAction(): Promise<Record<string, { id: string; nombre: string } | null> | null> {
  const session = await auth();
  if (!session?.token || session.validacionPendiente) return null;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenant/operators/assignments`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
