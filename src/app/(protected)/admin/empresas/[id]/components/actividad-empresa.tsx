"use client";

// El historial de una empresa: qué se cambió, quién y cuándo. Cubre todo lo que hace la
// administración: la plataforma (empresas, playas, usuarios, plan y cuenta), lo que el admin
// cambia en cada playa (tarifas, configuración, cajas, tipos de vehículo, clientes y cocheras), la
// cuenta de MercadoPago (conexión, condiciones, alias, QR, comisiones) y las correcciones a mano de
// cuentas de inquilinos y recibos.
//
// La operación del día no entra a propósito: entradas, salidas, cobros y turnos ya tienen su
// propio rastro en caja y movimientos, y acá taparían lo que importa, que es quién cambió las
// reglas.

import { useMemo, useState } from "react";
import {
  BadgePercent,
  Banknote,
  ChevronDown,
  Building2,
  Car,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Puzzle,
  QrCode,
  ReceiptText,
  ScanLine,
  ScrollText,
  Settings,
  Tag,
  Ticket,
  Trash2,
  Unplug,
  UserCog,
  Vault,
  Wallet,
} from "lucide-react";
import { ActividadEmpresa } from "@/types/tenancy.type";
import { Segmentos } from "@/components/plataforma/mono";
import { describirMovimientoCuenta } from "./describir-cuenta";

type Categoria =
  | "tarifas"
  | "configuracion"
  | "mercadopago"
  | "cuentas"
  | "plataforma"
  | "clientes";

const plata = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type Detalle = Record<string, unknown>;

const pesos = (v: unknown) => (typeof v === "number" ? plata.format(v) : "");

// `campos`: cómo se llama un campo en esta acción, cuando el nombre general no alcanza («activa»
// es la caja en una y la verificación del alias en otra). `detalle`: la línea de abajo armada a
// mano, para las acciones que se cuentan mejor en una frase que campo por campo.
const ACCIONES: Record<
  string,
  {
    texto: string;
    categoria: Categoria;
    Icono: typeof Tag;
    destructiva?: boolean;
    campos?: Record<string, string>;
    detalle?: (d: Detalle) => string;
  }
> = {
  EMPRESA_CREADA: { texto: "Creó la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_EDITADA: { texto: "Editó los datos de la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_SUSPENDIDA: { texto: "Suspendió la empresa", categoria: "plataforma", Icono: Building2, destructiva: true },
  EMPRESA_ACTIVA: { texto: "Reactivó la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_REACTIVADA: { texto: "Reactivó la empresa", categoria: "plataforma", Icono: Building2 },
  EMPRESA_BAJA: { texto: "Dio de baja la empresa", categoria: "plataforma", Icono: Building2, destructiva: true },
  EMPRESA_ELIMINADA: { texto: "Eliminó la empresa", categoria: "plataforma", Icono: Trash2, destructiva: true },
  PLAYA_CREADA: { texto: "Creó la playa", categoria: "plataforma", Icono: Building2 },
  PLAYA_EDITADA: { texto: "Editó la playa", categoria: "plataforma", Icono: Building2 },
  PLAYA_MODULOS: { texto: "Cambió las secciones habilitadas de la playa", categoria: "plataforma", Icono: Building2 },
  PLAYA_ELIMINADA: { texto: "Eliminó la playa", categoria: "plataforma", Icono: Trash2, destructiva: true },
  PLAYA_PATENTES_CONFIGURADA: { texto: "Configuró el reconocimiento de patentes de la playa", categoria: "plataforma", Icono: ScanLine },
  PLAYA_PATENTES_QUITADA: { texto: "Quitó el reconocimiento de patentes de la playa", categoria: "plataforma", Icono: ScanLine, destructiva: true },
  // Plan y cuenta con la plataforma: la frase sale de describirMovimientoCuenta, como en la
  // pestaña Plan; acá van el ícono y el filtro.
  SUSCRIPCION_ALTA: { texto: "Dio de alta la cuenta", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PRUEBA: { texto: "Dio días de prueba", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PRUEBA_EXTENDIDA: { texto: "Extendió la prueba", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PRORROGA: { texto: "Dio una prórroga", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_DIAS_EXTRA: { texto: "Dio días extra", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PLAN: { texto: "Asignó un plan", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_EDITADA: { texto: "Editó la cuenta", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_DEBITO: { texto: "Cambió el débito automático", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PAGO: { texto: "Registró un pago del plan", categoria: "plataforma", Icono: CreditCard },
  SUSCRIPCION_PAGO_ANULADO: { texto: "Anuló un pago del plan", categoria: "plataforma", Icono: CreditCard, destructiva: true },
  ADICIONAL_EDITADO: { texto: "Editó un adicional", categoria: "plataforma", Icono: Puzzle },
  MERCADOPAGO_CONECTADO: {
    texto: "Conectó la cuenta de MercadoPago",
    categoria: "mercadopago",
    Icono: Wallet,
    detalle: (d) => (d.nickname ? `Cuenta ${d.nickname}` : ""),
  },
  MERCADOPAGO_DESCONECTADO: { texto: "Desconectó la cuenta de MercadoPago", categoria: "mercadopago", Icono: Unplug, destructiva: true },
  MERCADOPAGO_CONDICIONES: {
    texto: "Aceptó las condiciones de uso de MercadoPago",
    categoria: "mercadopago",
    Icono: ScrollText,
    detalle: (d) => (d.condiciones ? `Versión ${d.condiciones}` : ""),
  },
  ALIAS_CONFIGURADO: {
    texto: "Configuró la verificación de transferencias al alias",
    categoria: "mercadopago",
    Icono: Wallet,
    campos: { activa: "la verificación de transferencias" },
  },
  QR_CAJA_CREADA: {
    texto: "Activó el QR para cobrar desde cualquier banco o billetera",
    categoria: "mercadopago",
    Icono: QrCode,
    detalle: (d) =>
      [d.calle ? `${d.calle} ${d.numero ?? ""}`.trim() : null, d.ciudad, d.provincia]
        .filter(Boolean)
        .join(", "),
  },
  MERCADOPAGO_REPORTE: { texto: "Configuró el reporte de liquidaciones de MercadoPago", categoria: "mercadopago", Icono: FileSpreadsheet },
  COMISIONES_CAMBIADAS: { texto: "Cambió las comisiones estimadas de MercadoPago", categoria: "mercadopago", Icono: BadgePercent },
  CAJA_CREADA: { texto: "Creó una caja", categoria: "configuracion", Icono: Vault, campos: { activa: "la caja" } },
  CAJA_EDITADA: { texto: "Editó una caja", categoria: "configuracion", Icono: Vault, campos: { activa: "la caja" } },
  CUENTA_SALDO_INICIAL: {
    texto: "Cargó el saldo inicial de un inquilino",
    categoria: "clientes",
    Icono: Banknote,
    detalle: (d) =>
      d.tipo === "AL_DIA"
        ? "Al día"
        : `${d.tipo === "A_FAVOR" ? "Saldo a favor" : "Deuda"}${typeof d.importe === "number" ? ` de ${pesos(d.importe)}` : " por mes"}`,
  },
  CUENTA_AJUSTE: {
    texto: "Hizo un ajuste en la cuenta de un inquilino",
    categoria: "clientes",
    Icono: Banknote,
    detalle: (d) => `${d.tipo === "BONIFICACION" ? "Bonificación" : "Recargo"} de ${pesos(d.importe)}${d.motivo ? `: «${d.motivo}»` : ""}`,
  },
  CUENTA_ANULACION: {
    texto: "Anuló un movimiento de la cuenta de un inquilino",
    categoria: "clientes",
    Icono: Banknote,
    destructiva: true,
    detalle: (d) => `${pesos(d.confirmacion)}${d.motivo ? `: «${d.motivo}»` : ""}`,
  },
  ABONOS_CARGADOS: {
    texto: "Cargó los abonos del mes",
    categoria: "clientes",
    Icono: ReceiptText,
    detalle: (d) => `${d.mes ?? ""}${d.vencimientoDia ? ` · vencen el día ${d.vencimientoDia}` : ""}`,
  },
  RECIBOS_GENERADOS: {
    texto: "Generó los recibos de los abonados",
    categoria: "clientes",
    Icono: ReceiptText,
    detalle: (d) => {
      const fecha = new Date(String(d.dateNow));
      return Number.isNaN(fecha.getTime()) ? "" : `Al ${fecha.toLocaleDateString("es-AR")}`;
    },
  },
  RECIBO_ANULADO: { texto: "Anuló un recibo", categoria: "clientes", Icono: ReceiptText, destructiva: true },
  RECIBO_ELIMINADO: { texto: "Eliminó un recibo", categoria: "clientes", Icono: Trash2, destructiva: true },
  TARIFAS_APLICADAS: { texto: "Cambió las tarifas", categoria: "tarifas", Icono: Tag },
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
  { id: "mercadopago", label: "MercadoPago" },
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
  dayStartHour: "el inicio del horario diurno",
  dayEndHour: "el fin del horario diurno",
  graceMinutes: "la tolerancia",
  alias: "el alias",
  nombre: "el nombre",
  qrSaldo: "la comisión del QR con saldo o transferencia",
  qrDebito: "la comisión del QR con débito",
  qrCredito: "la comisión del QR con crédito",
  aliasSaldo: "la comisión de las transferencias al alias",
  aliasDebito: "la comisión del alias con débito",
  aliasCredito: "la comisión del alias con crédito",
};

// Los valores fijos del backend, dichos como se dicen en la pantalla de tarifas.
const VALORES: Record<string, string> = {
  ENTRY: "la entrada",
  EXIT: "la salida",
  SPLIT: "dividido entre día y noche",
  STARTED: "por unidad empezada",
  COMPLETED: "por unidad completa",
  PROPORTIONAL: "proporcional",
  FIXED: "precio fijo por unidad",
  DERIVED: "proporcional a la franja",
  DAY: "día",
  NIGHT: "noche",
};

const COMISION = /^(qr|alias)(Saldo|Debito|Credito)$/;

const SECCIONES: Record<string, string> = {
  receiptDelivery: "los comprobantes",
  pricingOptions: "las opciones de cobro",
  stay: "las reglas de permanencia",
  charging: "la forma de cobro",
  crossing: "los cruces de horario",
  caps: "los topes",
  rates: "las tarifas",
};

// El formato depende de la última parte de la ruta (`franjas.«Auto».price` es un precio).
function texto(ruta: string, dato: unknown): string {
  const hoja = ruta.split(".").pop() ?? ruta;
  // Una comisión vacía no es «nada»: es la tasa de referencia de MercadoPago.
  if (COMISION.test(hoja))
    return typeof dato === "number" ? `${dato.toLocaleString("es-AR")} %` : "la de referencia";
  if (typeof dato === "boolean") return dato ? "activado" : "desactivado";
  if (dato === null || dato === undefined || dato === "") return "vacío";
  if (Array.isArray(dato))
    return dato.length ? `${dato.length} elementos` : "ninguno";
  if (hoja === "price" || hoja === "amount" || hoja.endsWith("Price"))
    return plata.format(Number(dato));
  if (hoja.endsWith("Minutes")) return `${dato} min`;
  if (hoja.endsWith("Hour")) return `${dato} h`;
  if (typeof dato === "string" && VALORES[dato]) return VALORES[dato];
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
//
// Una parte entre « » es el nombre de una fila de una lista (el vehículo, la franja) y se suma a
// lo que cambió: `pricingOptions.charging.«Auto».dayPrice` → «el precio de día de Auto».
function nombrar(ruta: string, etiquetas?: Record<string, string>) {
  const partes = ruta.split(".");
  const hoja = partes[partes.length - 1];
  const medio = partes.slice(0, -1);
  const nombre = medio
    .filter((p) => p.startsWith("«"))
    .map((p) => p.replace(/^«|»$/g, ""))
    .join(" · ");
  const contexto = medio.map((p) => SECCIONES[p]).filter(Boolean);
  const base = etiquetas?.[hoja] ?? CAMPOS[hoja] ?? hoja;
  return {
    que: nombre ? `${base} de ${nombre}` : base,
    donde: contexto.length ? contexto[contexto.length - 1] : "",
    nombre,
    hoja,
  };
}

// Cada cambio, contado como una oración: «Desactivó el QR en los comprobantes».
function frase(ruta: string, dato: unknown, etiquetas?: Record<string, string>) {
  const { que, donde, nombre, hoja } = nombrar(ruta, etiquetas);
  const en = donde ? ` en ${donde}` : "";
  // Una franja que aparece o desaparece es una franja agregada o quitada, no un precio que pasó
  // de vacío a algo.
  if (esCambio(dato) && ruta.startsWith("franjas.") && hoja === "price" && (dato.de === null || dato.a === null))
    return dato.de === null
      ? { verbo: "Agregó", resto: `la franja ${nombre}`, de: null, a: texto(ruta, dato.a) }
      : { verbo: "Quitó", resto: `la franja ${nombre}`, de: null, a: texto(ruta, dato.de) };
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
  // Lo de la cuenta con la plataforma ya se cuenta entero en una frase, la misma del historial
  // del Plan. Sin detalle (las acciones del panel de empresas) queda la frase general.
  const deCuenta = a.detalle ? describirMovimientoCuenta(a.accion, a.detalle) : null;
  const armado = !deCuenta && info?.detalle && a.detalle ? info.detalle(a.detalle) : null;
  const cambios = deCuenta || armado !== null ? [] : aplanar(a.detalle);
  const primero = cambios[0] ? frase(cambios[0][0], cambios[0][1], info?.campos) : null;
  const resto =
    cambios.length > 1
      ? ` · +${cambios.length - 1} ${cambios.length === 2 ? "cambio" : "cambios"}`
      : "";
  const valor =
    primero && primero.a !== null
      ? `: ${primero.de !== null ? `${primero.de} → ` : ""}${primero.a}`
      : "";
  const detalle =
    armado ??
    (primero
      ? `${primero.verbo} ${primero.resto}${valor}${resto}`
      : !deCuenta && a.entidad && !ENTIDADES_GENERICAS.has(a.entidad)
        ? a.entidad
        : "");
  // Una acción que el panel todavía no conoce se lee «suscripcion alta» y no «sUSCRIPCION_ALTA».
  const texto = deCuenta ?? info?.texto ?? a.accion.toLowerCase().replace(/_/g, " ");
  return {
    quien: a.usuario ?? "Sistema",
    que: texto.charAt(0).toLowerCase() + texto.slice(1),
    detalle,
    cambios,
    etiquetas: info?.campos,
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
            Todo lo que cambia la administración: reglas, usuarios, MercadoPago y el plan. Nunca muestra contraseñas ni tokens.
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
            : "Todavía no hay movimientos. Se anota cada cambio de tarifas, configuración, usuarios, clientes, MercadoPago y el plan."}
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
                      const f = frase(ruta, dato, d.etiquetas);
                      return (
                        <li key={ruta} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span
                            className={`font-semibold ${
                              f.verbo === "Desactivó" || f.verbo === "Quitó"
                                ? "text-[#FF7A4D]"
                                : f.verbo === "Activó" || f.verbo === "Agregó"
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
