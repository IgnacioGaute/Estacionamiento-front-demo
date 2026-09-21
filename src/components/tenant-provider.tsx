"use client";
import { createContext, useContext, useState } from "react";
import {
  OperationalContext,
  selectPlayaAction,
} from "@/actions/tenancy/context.action";
import { signOut } from "next-auth/react";
const TenantContext = createContext<{
  playaId: string;
  context: OperationalContext;
}>({ playaId: "", context: { empresa: null, playas: [] } });
export const useTenant = () => useContext(TenantContext);
export function TenantProvider({
  context,
  playaId,
  children,
}: {
  context: OperationalContext;
  playaId: string;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ context, playaId }}>
      {children}
    </TenantContext.Provider>
  );
}
export function PlayaSelector() {
  const { context, playaId } = useTenant();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  if (!context.empresa || context.playas.length === 0) return null;
  if (context.role === "USER")
    return playaId ? (
      <div className="min-w-0 max-w-md border-l-2 border-gm-yellow pl-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">
          <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
            Operativo
          </span>
        </div>
        <div className="truncate text-[15px] font-semibold leading-5 tracking-tight text-foreground sm:text-base">
          {context.playas.find((p) => p.id === playaId)?.nombre}
        </div>
      </div>
    ) : null;
  async function cambiar(id: string) {
    setPending(true);
    setError("");
    try {
      const r = await selectPlayaAction(id);
      if (r.error) {
        setError(r.error);
        setPending(false);
      } else window.location.assign("/tickets");
    } catch {
      setError("No se pudo cambiar la playa.");
      setPending(false);
    }
  }
  return (
    <div className="min-w-0 max-w-md border-l-2 border-gm-yellow pl-3">
      <div className="flex min-w-0 items-center gap-2 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">
        <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
          Administración
        </span>
      </div>
      {context.playas.length === 1 ? (
        <div className="truncate text-[15px] font-semibold leading-5 tracking-tight text-foreground sm:text-base">
          {context.playas[0].nombre}
        </div>
      ) : (
        <select
          aria-label="Playa en la que estás trabajando"
          className="mt-0.5 h-8 max-w-full rounded-lg border border-border/70 bg-background px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
          value={playaId}
          disabled={pending}
          onChange={(e) => cambiar(e.target.value)}
        >
          <option value="" disabled>
            Elegí una playa
          </option>
          {context.playas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function NoPlaya({ message }: { message?: string }) {
  const { context } = useTenant();
  if (context.role === "USER")
    return (
      <main className="mx-auto max-w-lg space-y-5 p-8">
        <h1 className="text-2xl font-semibold">Asignación pendiente</h1>
        <p>
          Tu administrador debe asignarte una playa para que puedas empezar a
          trabajar.
        </p>
        <button className="underline" onClick={() => window.location.reload()}>
          Ya me asignaron una playa
        </button>
        <button className="block underline" onClick={() => signOut()}>
          Cerrar sesión
        </button>
      </main>
    );
  return (
    <main className="mx-auto max-w-lg space-y-5 p-8">
      <h1 className="text-2xl font-semibold">
        {context.playas.length
          ? "Elegí dónde vas a trabajar"
          : "Tu acceso a la empresa"}
      </h1>
      <p>
        {message ||
          (context.playas.length
            ? "Los registros y los precios corresponden a la playa que elijas."
            : "Todavía no tenés playas disponibles. Pedile al administrador que te asigne una.")}
      </p>
      <PlayaSelector />
      <button className="underline" onClick={() => signOut()}>
        Cerrar sesión
      </button>
    </main>
  );
}
