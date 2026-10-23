"use client";
import { createContext, useContext, useState } from "react";
import {
  OperationalContext,
  selectPlayaAction,
} from "@/actions/tenancy/context.action";
import { signOut } from "next-auth/react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { esGratuita, type Modalidad } from "@/lib/modalidad";
import { useTenantEvent } from "@/hooks/use-tenant-event";
const TenantContext = createContext<{
  playaId: string;
  context: OperationalContext;
  shiftsEnabled: boolean;
  // La sección de inquilinos la prende el super admin por playa.
  inquilinosEnabled: boolean;
  // Escanear con el motor disponible de la playa: token propio o reconocimiento de la plataforma.
  reconocimientoPatentes: boolean;
  // Modalidad de la playa (la define el super admin). Gratuita: sin tarifas, cobros ni caja.
  modalidad: Modalidad;
  cobroHabilitado: boolean;
}>({ playaId: "", context: { empresa: null, playas: [] }, shiftsEnabled: false, inquilinosEnabled: false, reconocimientoPatentes: false, modalidad: "CON_COBRO", cobroHabilitado: true });
export const useTenant = () => useContext(TenantContext);
// El super admin cambió la modalidad con la pantalla abierta: se recarga entera, como al cambiar de
// playa, para no seguir mostrando cobros (o esconderlos) con la configuración anterior.
function RecargarAlCambiarModalidad({ modalidad }: { modalidad: Modalidad }) {
  useTenantEvent("playa-modalidad", (data: { modalidad?: string }) => {
    if (data?.modalidad && data.modalidad !== modalidad) window.location.reload();
  });
  return null;
}
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
  const modalidad: Modalidad = esGratuita(playa?.modalidad) ? "GRATUITO" : "CON_COBRO";
  const cobroHabilitado = modalidad === "CON_COBRO";
  // Turnos de caja e inquilinos son dinero: en una playa gratuita no existen, aunque su
  // configuración quede guardada para cuando vuelva a cobrar.
  const inquilinosEnabled = cobroHabilitado && !!playa?.modulos?.inquilinos;
  const reconocimientoPatentes = !!playa?.reconocimientoPatentes;
  return (
    <TenantContext.Provider value={{ context, playaId, shiftsEnabled: cobroHabilitado && shiftsEnabled, inquilinosEnabled, reconocimientoPatentes, modalidad, cobroHabilitado }}>
      {playaId && <RecargarAlCambiarModalidad modalidad={modalidad} />}
      {children}
    </TenantContext.Provider>
  );
}
export function PlayaSelector() {
  const { context, playaId } = useTenant();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  if ((!context.empresa && context.role !== 'SUPER_ADMIN') || context.playas.length === 0) return null;
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
  const textos = (
    <div className="min-w-0 text-left leading-tight">
      <p className="truncate text-[14.5px] font-bold text-foreground sm:text-[15px]">{nombre}</p>
      {error ? (
        <p role="alert" className="truncate text-[11.5px] text-destructive">{error}</p>
      ) : varias ? (
        <p className="hidden truncate text-[11.5px] text-muted-foreground sm:block">{pending ? "Cambiando…" : "Cambiar de playa"}</p>
      ) : null}
    </div>
  );
  if (!varias) return <div className="flex h-11 min-w-0 max-w-[300px] items-center gap-2 rounded-xl px-2">{textos}</div>;
  // Con varias, el menú desplegable de la app (el de la cuenta): el <select> nativo dibujaba la
  // lista en blanco y celeste del navegador. Igual se maneja con teclado.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={pending}>
        <button
          type="button"
          aria-label={`Playa en la que estás trabajando: ${nombre}. Cambiar de playa`}
          className="flex h-11 min-w-0 max-w-[300px] items-center gap-2 rounded-xl px-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:cursor-wait data-[state=open]:bg-white/[0.07]"
        >
          {textos}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[min(300px,calc(100vw-24px))] rounded-2xl border border-white/[0.07] bg-[#0B0A08]/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-medium text-muted-foreground">Cambiar de playa</DropdownMenuLabel>
        {context.playas.map((p) => {
          const actual = p.id === playaId;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => { if (!actual) void cambiar(p.id); }}
              aria-current={actual ? "true" : undefined}
              className={`min-h-11 cursor-pointer gap-3 rounded-lg px-2.5 text-[14px] focus:bg-white/[0.08] ${actual ? "font-semibold text-foreground" : "text-[#D9D1C3]"}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${actual ? "bg-gm-yellow text-gm-ink" : "bg-white/[0.05] text-muted-foreground"}`}>
                <MapPin className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
              {actual && <Check className="size-4 shrink-0 text-gm-yellow" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
