"use client";
import { createContext, useContext, useState } from "react";
import {
  OperationalContext,
  selectPlayaAction,
} from "@/actions/tenancy/context.action";
import { signOut } from "next-auth/react";
import { ChevronDown } from "lucide-react";
const TenantContext = createContext<{
  playaId: string;
  context: OperationalContext;
  shiftsEnabled: boolean;
  // La sección de inquilinos la prende el super admin por playa.
  inquilinosEnabled: boolean;
  // Escanear con el motor disponible de la playa: token propio o reconocimiento de la plataforma.
  reconocimientoPatentes: boolean;
}>({ playaId: "", context: { empresa: null, playas: [] }, shiftsEnabled: false, inquilinosEnabled: false, reconocimientoPatentes: false });
export const useTenant = () => useContext(TenantContext);
export function TenantProvider({
  context,
  playaId,
  children,
  shiftsEnabled = false,
}: {
  context: OperationalContext;
  playaId: string;
  children: React.ReactNode;
  shiftsEnabled?: boolean;
}) {
  const playa = context.playas.find((p) => p.id === playaId);
  const inquilinosEnabled = !!playa?.modulos?.inquilinos;
  const reconocimientoPatentes = !!playa?.reconocimientoPatentes;
  return (
    <TenantContext.Provider value={{ context, playaId, shiftsEnabled, inquilinosEnabled, reconocimientoPatentes }}>
      {children}
    </TenantContext.Provider>
  );
}
export function PlayaSelector() {
  const { context, playaId } = useTenant();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  if (!context.empresa || context.playas.length === 0) return null;
  // El operador trabaja en una sola playa y el administrador puede tener varias: con una, el nombre
  // solo dice dónde estás; con varias, es un selector (el nativo del navegador, invisible encima del
  // nombre, así anda igual con teclado y en el celular).
  const varias = context.role !== "USER" && context.playas.length > 1;
  const nombre = context.playas.find((p) => p.id === playaId)?.nombre ?? (varias ? "Elegí una playa" : context.playas[0].nombre);
  if (context.role === "USER" && !playaId) return null;
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
    <div
      className={`relative flex h-11 min-w-0 max-w-[300px] items-center gap-2 rounded-xl px-2 ${
        varias ? "transition-colors focus-within:ring-2 focus-within:ring-gm-yellow hover:bg-white/[0.05]" : ""
      }`}
    >
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14.5px] font-bold text-foreground sm:text-[15px]">{nombre}</p>
        {error ? (
          <p role="alert" className="truncate text-[11.5px] text-destructive">{error}</p>
        ) : varias ? (
          <p className="hidden truncate text-[11.5px] text-muted-foreground sm:block">{pending ? "Cambiando…" : "Cambiar de playa"}</p>
        ) : null}
      </div>
      {varias && (
        <>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <select
            aria-label="Playa en la que estás trabajando"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xl opacity-0 disabled:cursor-wait"
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
        </>
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
