"use client";

// El historial de una empresa: qué se cambió, quién y cuándo. Cubre la administración de la
// plataforma (empresas, playas, usuarios) y los cambios que hace el admin dentro de cada playa
// (tarifas, franjas, configuración, tipos de vehículo, clientes y cocheras).
//
// La operación del día no entra a propósito: entradas, salidas, cobros y turnos ya tienen su
// propio rastro en caja y movimientos, y acá taparían lo que importa, que es quién cambió las
// reglas.

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Building2,
  Car,
  ClipboardList,
  Settings,
  Tag,
  Ticket,
  Trash2,
  UserCog,
} from "lucide-react";
import { ActividadEmpresa } from "@/types/tenancy.type";

type Categoria =
  | "tarifas"
  | "configuracion"
  | "cuentas"
  | "plataforma"
  | "clientes";

const plata = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const ACCIONES: Record<
  string,
  { texto: string; categoria: Categoria; Icono: typeof Tag; destructiva?: boolean }
> = {
  EMPRESA_CREADA: { texto: "Creó la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_EDITADA: { texto: "Editó los datos de la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_SUSPENDIDA: { texto: "Suspendió la empresa", categoria: "plataforma", Icono: Building2, destructiva: true },
  EMPRESA_ACTIVA: { texto: "Reactivó la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_BAJA: { texto: "Dio de baja la empresa", categoria: "plataforma", Icono: Building2, destructiva: true },
  EMPRESA_ELIMINADA: { texto: "Eliminó la empresa", categoria: "plataforma", Icono: Trash2, destructiva: true },
  PLAYA_CREADA: { texto: "Creó la playa", categoria: "plataforma", Icono: Building2 },
  PLAYA_EDITADA: { texto: "Editó la playa", categoria: "plataforma", Icono: Building2 },
  PLAYA_ELIMINADA: { texto: "Eliminó la playa", categoria: "plataforma", Icono: Trash2, destructiva: true },
  USUARIO_CREADO: { texto: "Dio de alta un usuario", categoria: "cuentas", Icono: UserCog },
  USUARIO_EDITADO: { texto: "Editó un usuario", categoria: "cuentas", Icono: UserCog },
  USUARIO_CONTRASENA: { texto: "Cambió una contraseña", categoria: "cuentas", Icono: UserCog },
  USUARIO_BAJA: { texto: "Dio de baja un usuario", categoria: "cuentas", Icono: UserCog, destructiva: true },
  USUARIO_PLAYAS: { texto: "Cambió las playas asignadas", categoria: "cuentas", Icono: UserCog },
  TARIFA_DIA_CREADA: { texto: "Creó una tarifa por día/semana", categoria: "tarifas", Icono: Tag },
  TARIFA_DIA_EDITADA: { texto: "Cambió una tarifa por día/semana", categoria: "tarifas", Icono: Tag },
  TARIFA_DIA_ELIMINADA: { texto: "Eliminó una tarifa por día/semana", categoria: "tarifas", Icono: Trash2, destructiva: true },
  FRANJA_CREADA: { texto: "Creó una franja de precio", categoria: "tarifas", Icono: Tag },
  FRANJA_EDITADA: { texto: "Cambió una franja de precio", categoria: "tarifas", Icono: Tag },
  FRANJA_ELIMINADA: { texto: "Eliminó una franja de precio", categoria: "tarifas", Icono: Trash2, destructiva: true },
  CONFIGURACION_CAMBIADA: { texto: "Cambió la configuración", categoria: "configuracion", Icono: Settings },
  VEHICULO_CREADO: { texto: "Agregó un tipo de vehículo", categoria: "configuracion", Icono: Car },
  VEHICULO_EDITADO: { texto: "Editó un tipo de vehículo", categoria: "configuracion", Icono: Car },
  TICKET_CREADO: { texto: "Agregó una tarjeta de código de barras", categoria: "configuracion", Icono: Ticket },
  TICKET_EDITADO: { texto: "Editó una tarjeta", categoria: "configuracion", Icono: Ticket },
  TICKET_ELIMINADO: { texto: "Eliminó una tarjeta", categoria: "configuracion", Icono: Trash2, destructiva: true },
  CLIENTE_CREADO: { texto: "Dio de alta un cliente", categoria: "clientes", Icono: ClipboardList },
  CLIENTE_EDITADO: { texto: "Editó un cliente", categoria: "clientes", Icono: ClipboardList },
  CLIENTE_ELIMINADO: { texto: "Eliminó un cliente", categoria: "clientes", Icono: Trash2, destructiva: true },
  CLIENTE_DESACTIVADO: { texto: "Desactivó un cliente", categoria: "clientes", Icono: ClipboardList },
  CLIENTE_REACTIVADO: { texto: "Reactivó un cliente", categoria: "clientes", Icono: ClipboardList },
  INTERES_CAMBIADO: { texto: "Cambió el interés por mora", categoria: "clientes", Icono: Tag },
  COCHERA_TIPO_CREADO: { texto: "Creó un tipo de cochera", categoria: "clientes", Icono: Tag },
  COCHERA_TIPO_EDITADO: { texto: "Cambió un tipo de cochera", categoria: "clientes", Icono: Tag },
  COCHERA_TIPO_ELIMINADO: { texto: "Eliminó un tipo de cochera", categoria: "clientes", Icono: Trash2, destructiva: true },
  INQUILINO_TIPO_CREADO: { texto: "Creó un tipo de alquiler", categoria: "clientes", Icono: Tag },
  INQUILINO_TIPO_EDITADO: { texto: "Cambió un tipo de alquiler", categoria: "clientes", Icono: Tag },
  INQUILINO_TIPO_ELIMINADO: { texto: "Eliminó un tipo de alquiler", categoria: "clientes", Icono: Trash2, destructiva: true },
  MONTOS_ACTUALIZADOS: { texto: "Actualizó los montos de los clientes", categoria: "clientes", Icono: Tag },
};

const CATEGORIAS: { id: Categoria | "todo"; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "tarifas", label: "Tarifas" },
  { id: "configuracion", label: "Configuración" },
  { id: "cuentas", label: "Usuarios" },
  { id: "clientes", label: "Clientes y cocheras" },
  { id: "plataforma", label: "Plataforma" },
];

// Los nombres de campo del backend no se muestran crudos. La clave es la última parte de la ruta
// (`pricingOptions.stay.capMinutes` → `capMinutes`) más el contexto de la sección.
const CAMPOS: Record<string, string> = {
  shiftsEnabled: "los turnos de caja",
  barcodeTicketsEnabled: "los tickets por código de barras",
  pricingDayTypeBasis: "el criterio de día/noche",
  toleranceMinutes: "la tolerancia",
  qr: "el QR",
  print: "la impresión",
  whatsapp: "el envío por WhatsApp",
  paperWidth: "el ancho de papel",
  enabled: "la opción",
  capEnabled: "el tope",
  capMinutes: "los minutos del tope",
  freeMinutes: "los minutos sin cargo",
  minimumMinutes: "el mínimo",
  mode: "el modo",
  dayPrice: "el precio de día",
  nightPrice: "el precio de noche",
  unitMinutes: "la unidad",
  vehicleType: "el vehículo",
  ticketDayType: "el horario",
  ticketTimeType: "el período",
  uptoMinutes: "el tope de la franja",
  recurringUnitMinutes: "la unidad recurrente",
  recurringPriceMode: "el modo de precio",
  price: "el precio",
  label: "el nombre",
  code: "el código",
  name: "el nombre",
  role: "el rol",
  email: "el email",
  username: "el usuario",
  customerType: "el tipo",
  interest: "el interés",
  percentage: "el porcentaje",
  amount: "el importe",
  codeBar: "el código",
};

const SECCIONES: Record<string, string> = {
  receiptDelivery: "los comprobantes",
  pricingOptions: "las opciones de cobro",
  stay: "las reglas de permanencia",
  charging: "la forma de cobro",
  crossing: "los cruces de horario",
  caps: "los topes",
  rates: "las tarifas",
};

function texto(campo: string, dato: unknown): string {
  if (typeof dato === "boolean") return dato ? "activado" : "desactivado";
  if (dato === null || dato === undefined || dato === "") return "vacío";
  if (Array.isArray(dato))
    return dato.length ? `${dato.length} elementos` : "ninguno";
  if (campo === "price" || campo === "amount" || campo.endsWith("Price"))
    return plata.format(Number(dato));
  if (campo.endsWith("Minutes")) return `${dato} min`;
  return String(dato);
}

function esCambio(dato: unknown): dato is { de: unknown; a: unknown } {
  return (
    !!dato &&
    typeof dato === "object" &&
    !Array.isArray(dato) &&
    "a" in (dato as Record<string, unknown>)
  );
}

// El backend ya guarda una hoja por cambio, pero los registros anteriores a esa comparación
// —y las altas, que no tienen contra qué comparar— traen el objeto entero. Se abre acá también,
// o la pantalla mostraría «[object Object]».
function aplanar(
  detalle: Record<string, unknown> | null,
): [string, unknown][] {
  const salida: [string, unknown][] = [];
  const recorrer = (valor: unknown, ruta: string) => {
    if (esCambio(valor)) {
      salida.push([ruta, valor]);
      return;
    }
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      for (const [clave, dentro] of Object.entries(valor))
        recorrer(dentro, ruta ? `${ruta}.${clave}` : clave);
      return;
    }
    // Un alta no informa de sus campos vacíos: sería ruido en cada línea.
    if (valor === null || valor === undefined || valor === "") return;
    salida.push([ruta, valor]);
  };
  for (const [campo, valor] of Object.entries(detalle ?? {}))
    recorrer(valor, campo);
  return salida;
}

// «pricingOptions.stay.capEnabled» → { que: "el tope", donde: "las opciones de cobro · las
// reglas de permanencia" }. Es lo que convierte el detalle en una frase que se lee.
function nombrar(ruta: string) {
  const partes = ruta.split(".");
  const hoja = partes[partes.length - 1];
  const contexto = partes
    .slice(0, -1)
    .map((p) => SECCIONES[p])
    .filter(Boolean);
  return {
    que: CAMPOS[hoja] ?? hoja,
    donde: contexto.length ? contexto[contexto.length - 1] : "",
  };
}

// Cada cambio, contado como una oración: «Desactivó el QR en los comprobantes».
function frase(ruta: string, dato: unknown) {
  const { que, donde } = nombrar(ruta);
  const en = donde ? ` en ${donde}` : "";
  if (esCambio(dato)) {
    if (typeof dato.a === "boolean")
      return {
        verbo: dato.a ? "Activó" : "Desactivó",
        resto: `${que}${en}`,
        de: null,
        a: null,
      };
    return {
      verbo: "Cambió",
      resto: `${que}${en}`,
      de: texto(ruta, dato.de),
      a: texto(ruta, dato.a),
    };
  }
  if (typeof dato === "boolean")
    return { verbo: dato ? "Activó" : "Desactivó", resto: `${que}${en}`, de: null, a: null };
  return { verbo: "Definió", resto: `${que}${en}`, de: null, a: texto(ruta, dato) };
}

function dia(iso: string) {
  const fecha = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const mismo = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismo(fecha, hoy)) return "Hoy";
  if (mismo(fecha, ayer)) return "Ayer";
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ActividadDeEmpresa({
  actividad,
  desdeQue,
}: {
  actividad: ActividadEmpresa[];
  // Fecha de la última visita: lo posterior se marca como nuevo.
  desdeQue?: string | null;
}) {
  const [categoria, setCategoria] = useState<Categoria | "todo">("todo");

  const visibles = useMemo(
    () =>
      actividad.filter(
        (a) => categoria === "todo" || ACCIONES[a.accion]?.categoria === categoria,
      ),
    [actividad, categoria],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, ActividadEmpresa[]>();
    for (const a of visibles) {
      const clave = dia(a.fecha);
      mapa.set(clave, [...(mapa.get(clave) ?? []), a]);
    }
    return [...mapa.entries()];
  }, [visibles]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIAS.map((c) => {
          const cuantas =
            c.id === "todo"
              ? actividad.length
              : actividad.filter((a) => ACCIONES[a.accion]?.categoria === c.id)
                  .length;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              disabled={!cuantas}
              className={`h-9 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
                categoria === c.id
                  ? "border-gm-yellow bg-gm-yellow text-gm-ink"
                  : "border-border text-foreground hover:bg-gm-surface-2"
              }`}
            >
              {c.label}
              {cuantas > 0 && (
                <span
                  className={`ml-2 tabular-nums ${categoria === c.id ? "text-gm-ink/60" : "text-muted-foreground"}`}
                >
                  {cuantas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!visibles.length && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {actividad.length
              ? "No hay movimientos de ese tipo."
              : "Todavía no hay movimientos. Se anota cada cambio de tarifas, configuración, usuarios y clientes."}
          </p>
        </div>
      )}

      {grupos.map(([fecha, entradas]) => (
        <section key={fecha}>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {fecha}
            </h3>
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-xs tabular-nums text-muted-foreground">
              {entradas.length}
            </span>
          </div>

          {/* Línea de tiempo: el hilo vertical sale del ícono de cada entrada. */}
          <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-border">
            {entradas.map((a, i) => {
              const info = ACCIONES[a.accion];
              const Icono = info?.Icono ?? ClipboardList;
              const cambios = aplanar(a.detalle);
              const nueva = !!desdeQue && a.fecha > desdeQue;
              return (
                <li
                  key={`${a.fecha}-${i}`}
                  className={`relative rounded-2xl border transition-colors ${
                    nueva
                      ? "border-gm-yellow/40 bg-gm-yellow/[0.04]"
                      : "border-border bg-gm-surface-2"
                  }`}
                >
                  {/* Cerrado por defecto; los movimientos sin ver arrancan abiertos, que son
                      los que se vienen a mirar. `details` da el plegado y el foco de teclado
                      sin estado propio. */}
                  <details open={nueva} className="group">
                    <summary
                      className={`flex list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden ${
                        cambios.length ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span
                        className={`z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                          info?.destructiva
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-gm-surface text-gm-yellow"
                        }`}
                      >
                        <Icono className="size-[18px]" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-semibold">
                          {info?.texto ?? a.accion}
                        </span>
                        {nueva && (
                          <span className="rounded-full bg-gm-yellow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gm-ink">
                            Nuevo
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {a.usuario ?? "Sistema"}
                          {a.playa ? ` · ${a.playa}` : ""}
                        </span>
                      </span>

                      {!!cambios.length && (
                        <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                          {cambios.length}{" "}
                          {cambios.length === 1 ? "cambio" : "cambios"}
                        </span>
                      )}
                      <time
                        dateTime={a.fecha}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {new Date(a.fecha).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      {!!cambios.length && (
                        <ChevronDown
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      )}
                    </summary>

                    {!!cambios.length && (
                      <ul className="space-y-1.5 px-4 pb-4 pl-[72px]">
                        {cambios.map(([ruta, dato]) => {
                          const f = frase(ruta, dato);
                          return (
                            <li
                              key={ruta}
                              className="flex flex-wrap items-baseline gap-x-2 text-sm"
                            >
                              <span
                                className={`font-semibold ${
                                  f.verbo === "Desactivó"
                                    ? "text-gm-orange"
                                    : f.verbo === "Activó"
                                      ? "text-emerald-400"
                                      : "text-foreground"
                                }`}
                              >
                                {f.verbo}
                              </span>
                              <span className="text-muted-foreground">
                                {f.resto}
                              </span>
                              {f.a !== null && (
                                <span className="flex items-baseline gap-1.5">
                                  {f.de !== null && (
                                    <>
                                      <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                                        {f.de}
                                      </span>
                                      <span aria-hidden className="text-muted-foreground">
                                        →
                                      </span>
                                    </>
                                  )}
                                  <span className="font-semibold tabular-nums text-gm-yellow">
                                    {f.a}
                                  </span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
