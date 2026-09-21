"use server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
export type OperationalContext = {
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
  empresa: { id: string; nombre: string } | null;
  playas: { id: string; nombre: string; empresaId: string }[];
};
export async function getOperationalContext(): Promise<OperationalContext> {
  const session = await auth();
  if (!session?.token) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tenant/context`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "No se pudo cargar tu empresa.");
  }
  return response.json();
}
export async function selectPlayaAction(playaId: string) {
  const session = await auth();
  const context = await getOperationalContext();
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
    return result;
  } catch {
    return { error: "No se pudo conectar. Intentá nuevamente." };
  }
}
