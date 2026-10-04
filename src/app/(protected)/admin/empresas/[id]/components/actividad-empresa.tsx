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
import { Segmentos } from "@/components/plataforma/mono";

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
  PLAYA_MODULOS: { texto: "Cambió las secciones habilitadas de la playa", categoria: "plataforma", Icono: Building2 },
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

// «hace 12 min», «hace 3 h», «ayer 18:40», «22/09 11:05»: lo reciente se lee en relativo, lo
// viejo con su fecha.
export function cuandoFue(iso: string) {
  const fecha = new Date(iso);
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  const hora = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 6 * 60) return `hace ${Math.floor(minutos / 60)} h`;
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (fecha.toDateString() === new Date().toDateString()) return `hoy ${hora}`;
  if (fecha.toDateString() === ayer.toDateString()) return `ayer ${hora}`;
  return `${fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

// Las entidades genéricas no suman nada a la línea; un email o un nombre sí.
const ENTIDADES_GENERICAS = new Set(["usuario", "empresa", "asignación", "playa"]);

// Una entrada contada en una línea: quién, qué hizo y el primer cambio. La usa el resumen de la
// ficha, que muestra las últimas sin desplegar nada.
export function describirActividad(a: ActividadEmpresa) {
  const info = ACCIONES[a.accion];
  const cambios = aplanar(a.detalle);
  const primero = cambios[0] ? frase(cambios[0][0], cambios[0][1]) : null;
  const resto =
    cambios.length > 1
      ? ` · +${cambios.length - 1} ${cambios.length === 2 ? "cambio" : "cambios"}`
      : "";
  const valor =
    primero && primero.a !== null
      ? `: ${primero.de !== null ? `${primero.de} → ` : ""}${primero.a}`
      : "";
  const detalle = primero
    ? `${primero.verbo} ${primero.resto}${valor}${resto}`
    : a.entidad && !ENTIDADES_GENERICAS.has(a.entidad)
      ? a.entidad
      : "";
  const texto = info?.texto ?? a.accion;
  return {
    quien: a.usuario ?? "Sistema",
    que: texto.charAt(0).toLowerCase() + texto.slice(1),
    detalle,
    cambios,
    Icono: info?.Icono ?? ClipboardList,
    destructiva: !!info?.destructiva,
    categoria: info?.categoria,
  };
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

  // Solo las categorías que tienen algo: un filtro que siempre da vacío es un clic perdido.
  const opciones = CATEGORIAS.map((c) => ({
    id: c.id,
    label: c.label,
    cuenta:
      c.id === "todo"
        ? actividad.length
        : actividad.filter((a) => ACCIONES[a.accion]?.categoria === c.id).length,
  })).filter((c) => c.id === "todo" || c.cuenta > 0);

  return (
    <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2E2A23] px-5 py-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold leading-tight">Actividad</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Cambios de reglas y accesos hechos por personas. Nunca muestra contraseñas ni tokens.
          </p>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Segmentos
            etiqueta="Tipo de cambio"
            className="w-max"
            opciones={opciones}
            valor={categoria}
            onChange={setCategoria}
          />
        </div>
      </div>

      {!visibles.length && (
        <p className="px-5 py-14 text-center text-sm text-muted-foreground">
          {actividad.length
            ? "No hay movimientos de ese tipo."
            : "Todavía no hay movimientos. Se anota cada cambio de tarifas, configuración, usuarios y clientes."}
        </p>
      )}

      <ol className="px-3 pb-3 pt-2 sm:px-5">
        {visibles.map((a, i) => {
          const d = describirActividad(a);
          const nueva = !!desdeQue && a.fecha > desdeQue;
          const Icono = d.Icono;
          const desplegable = d.cambios.length > 1;
          return (
            <li key={`${a.fecha}-${i}`} className="border-b border-[#2B2620] last:border-b-0">
              {/* Cerrado por defecto; los movimientos sin ver arrancan abiertos, que son los que
                  se vienen a mirar. `details` da el plegado y el foco de teclado sin estado. */}
              <details open={nueva && desplegable} className="group">
                <summary
                  className={`grid min-h-16 list-none grid-cols-[40px_minmax(0,1fr)] items-center gap-3.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#1E1A14] sm:grid-cols-[40px_minmax(0,1fr)_190px_140px] [&::-webkit-details-marker]:hidden ${
                    desplegable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-[11px] ${
                      d.destructiva ? "bg-[#FF7A4D]/[0.14]" : "bg-[#221F1A]"
                    }`}
                  >
                    <Icono
                      aria-hidden
                      className={`size-4 ${
                        d.destructiva
                          ? "text-[#FF7A4D]"
                          : nueva
                            ? "text-gm-yellow"
                            : "text-muted-foreground"
                      }`}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-[13.5px]">
                      <span>
                        <span className="font-bold">{d.quien}</span>{" "}
                        <span className="text-[#C9BFB1]">{d.que}</span>
                      </span>
                      {nueva && (
                        <span className="rounded-full bg-gm-yellow px-[7px] py-0.5 text-[10.5px] font-extrabold text-gm-ink">
                          Nuevo
                        </span>
                      )}
                      {desplegable && (
                        <ChevronDown
                          aria-hidden
                          className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      )}
                    </span>
                    {d.detalle && (
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                        {d.detalle}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground sm:hidden">
                      {a.playa ?? "Toda la empresa"} · {cuandoFue(a.fecha)}
                    </span>
                  </span>
                  <span className="hidden truncate text-[12.5px] text-[#C9BFB1] sm:block">
                    {a.playa ?? "Toda la empresa"}
                  </span>
                  <time
                    dateTime={a.fecha}
                    title={new Date(a.fecha).toLocaleString("es-AR")}
                    className="hidden text-right font-mono text-[11px] text-[#8A8073] sm:block"
                  >
                    {cuandoFue(a.fecha)}
                  </time>
                </summary>

                {desplegable && (
                  <ul className="space-y-1.5 pb-4 pl-[66px] pr-4">
                    {d.cambios.map(([ruta, dato]) => {
                      const f = frase(ruta, dato);
                      return (
                        <li key={ruta} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span
                            className={`font-semibold ${
                              f.verbo === "Desactivó"
                                ? "text-[#FF7A4D]"
                                : f.verbo === "Activó"
                                  ? "text-emerald-400"
                                  : "text-foreground"
                            }`}
                          >
                            {f.verbo}
                          </span>
                          <span className="text-muted-foreground">{f.resto}</span>
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
  );
}
