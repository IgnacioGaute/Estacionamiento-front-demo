import { cn } from "@/lib/utils";
import type {
  EstadoCuenta,
  MedioPagoSaas,
  Plan,
  ResumenCuenta,
  SituacionCuenta,
} from "@/types/suscripcion.type";

// Cómo se nombra y se pinta la cuenta de una empresa con la plataforma. Vive acá para que la
// lista de empresas, la ficha, Planes y cobros, Mi plan y el aviso del menú digan lo mismo con
// las mismas palabras.

// Los mismos que en el backend (src/saas/estado-cuenta.ts): solo se usan para explicar.
export const DIAS_DE_GRACIA = 5;
export const DESCUENTO_PLAYA_ADICIONAL = 0.3;

export const COLORES_CUENTA: Record<EstadoCuenta, string> = {
  PRUEBA: "#F5C219",
  AL_DIA: "#34D399",
  VENCIDA: "#FF7A4D",
  SUSPENDIDA: "#E5484D",
  BAJA: "#6E6457",
  BONIFICADA: "#A9AFFF",
  SIN_ACTIVAR: "#8A8073",
};

export const ESTADOS_CUENTA: Record<EstadoCuenta, { label: string; clase: string }> = {
  PRUEBA: { label: "En prueba", clase: "bg-gm-yellow/[0.14] text-gm-yellow" },
  AL_DIA: { label: "Al día", clase: "bg-emerald-400/[0.12] text-emerald-400" },
  VENCIDA: { label: "Vencida", clase: "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]" },
  SUSPENDIDA: { label: "Suspendida", clase: "bg-[#E5484D]/[0.16] text-[#FF8A8D]" },
  BAJA: { label: "De baja", clase: "bg-[#231D17] text-muted-foreground" },
  BONIFICADA: { label: "Bonificada", clase: "bg-[#7E86F0]/[0.14] text-[#A9AFFF]" },
  SIN_ACTIVAR: { label: "Sin activar", clase: "bg-[#231D17] text-[#C9BFB1]" },
};

export const MEDIOS_PAGO: Record<MedioPagoSaas, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  MERCADOPAGO: "MercadoPago",
  OTRO: "Otro",
};

const enDias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

/** La etiqueta corta del estado, con el atraso cuando lo hay: «Vence hoy», «3 días de atraso». */
export function etiquetaCuenta(c: Pick<SituacionCuenta, "estado" | "diasDeAtraso">) {
  if (c.estado === "VENCIDA")
    return c.diasDeAtraso ? `${enDias(c.diasDeAtraso)} de atraso` : "Vence hoy";
  return ESTADOS_CUENTA[c.estado].label;
}

export function EstadoCuentaPill({
  cuenta,
  className,
}: {
  cuenta: Pick<SituacionCuenta, "estado" | "diasDeAtraso">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        ESTADOS_CUENTA[cuenta.estado].clase,
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: COLORES_CUENTA[cuenta.estado] }}
      />
      {etiquetaCuenta(cuenta)}
    </span>
  );
}

// "2026-10-14" → "14/10/2026". Armado a mano: `new Date("2026-10-14")` es medianoche UTC y en
// Argentina se muestra como el 13.
export function diaAR(ymd: string | null | undefined, conAnio = true) {
  if (!ymd) return "—";
  const [a, m, d] = ymd.split("-");
  return conAnio ? `${d}/${m}/${a}` : `${d}/${m}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "2026-10-14" → "14 oct".
export function diaMesCorto(ymd: string | null | undefined) {
  if (!ymd) return "—";
  const [, m, d] = ymd.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
}

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
// "2026-10-08" → "8 de octubre" (con el año solo si no es el actual): como se dice, no como se
// carga en un formulario. Para lo que lee la empresa.
export function fechaLarga(ymd: string | null | undefined) {
  if (!ymd) return "—";
  const [a, m, d] = ymd.split("-").map(Number);
  const anio = a === Number(hoyAR().slice(0, 4)) ? "" : ` de ${a}`;
  return `${d} de ${MESES_LARGOS[m - 1]}${anio}`;
}

export const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

export function sumarDiasAR(ymd: string, dias: number) {
  const [a, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function diasEntreAR(desde: string, hasta: string) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/**
 * Un mes más manteniendo el aniversario, con la misma regla que el backend: si cae a fin de
 * mes, sigue cayendo a fin de mes. Solo se usa para anticipar el período en pantalla; el que
 * vale es el que devuelve el servidor.
 */
export function sumarMesesAR(ymd: string, meses: number) {
  const [a, m, d] = ymd.split("-").map(Number);
  const ultimoDia = (anio: number, mes: number) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const destinoMes = m - 1 + meses;
  const anio = a + Math.floor(destinoMes / 12);
  const mes = ((destinoMes % 12) + 12) % 12;
  const dia = d === ultimoDia(a, m - 1) ? ultimoDia(anio, mes) : Math.min(d, ultimoDia(anio, mes));
  return new Date(Date.UTC(anio, mes, dia)).toISOString().slice(0, 10);
}

/** Una línea que explica el vencimiento, pensada para el super admin. */
export function textoVencimiento(c: SituacionCuenta | ResumenCuenta) {
  const d = c.diasParaVencer;
  switch (c.estado) {
    case "SIN_ACTIVAR":
      return "Sin alta: no vence hasta que se le dé el alta";
    case "BONIFICADA":
      return "No se le cobra";
    case "BAJA":
      return "Dada de baja: no tiene acceso";
    case "SUSPENDIDA":
      return c.motivoSuspension === "MANUAL"
        ? "Suspendida a mano"
        : `Suspendida por falta de pago · venció el ${diaAR(c.proximoVencimiento, false)}${c.diasDeAtraso ? ` (${enDias(c.diasDeAtraso)} de atraso)` : ""}`;
    case "VENCIDA":
      return c.debeSuspenderse
        ? `Venció el ${diaAR(c.proximoVencimiento, false)} · se suspende en la próxima revisión`
        : `Venció el ${diaAR(c.proximoVencimiento, false)} · se suspende el ${diaAR(c.suspendeEl, false)}`;
    default: {
      const que = c.estado === "PRUEBA" ? "Primera factura" : "Vence";
      if (d === null) return "";
      if (d === 0) return `${que} hoy`;
      if (d === 1) return `${que} mañana`;
      return `${que} el ${diaAR(c.proximoVencimiento, false)} · en ${enDias(d)}`;
    }
  }
}

/** Si conviene llamar la atención: vence pronto, venció o está cortada. */
export function cuentaConAlerta(c: SituacionCuenta | ResumenCuenta | null | undefined) {
  if (!c) return false;
  if (c.estado === "VENCIDA" || c.estado === "SUSPENDIDA") return true;
  return (c.estado === "PRUEBA" || c.estado === "AL_DIA") && (c.diasParaVencer ?? 99) <= 3;
}

// ─── Planes como en la landing ─────────────────────────────────────────────

export type GrupoPlan = {
  // CHICA, MEDIANA, GRANDE.
  tamano: string;
  nombre: string;
  rango: string;
  maxActivos: number | null;
  // Solo tickets / rotación.
  base: Plan | null;
  // + Módulo alquileres mensuales.
  alquileres: Plan | null;
};

const tamanoDe = (codigo: string) => codigo.replace(/_COCHERAS$/, "");

/**
 * Los planes de a pares por tamaño de playa, como en la landing: cada tarjeta lleva el precio solo
 * tickets y el precio con alquileres mensuales. El rango sale de los límites: «Hasta 50», «51 a
 * 120», «Más de 120».
 */
export function agruparPlanes(planes: Plan[]): GrupoPlan[] {
  const grupos = new Map<string, GrupoPlan>();
  for (const plan of planes) {
    const tamano = tamanoDe(plan.codigo);
    const grupo = grupos.get(tamano) ?? {
      tamano,
      nombre: plan.nombre.replace(/\s*\+.*$/, ""),
      rango: "",
      maxActivos: plan.maxActivos,
      base: null,
      alquileres: null,
    };
    if (plan.incluyeCocheras) grupo.alquileres = plan;
    else {
      grupo.base = plan;
      grupo.nombre = plan.nombre;
      grupo.maxActivos = plan.maxActivos;
    }
    grupos.set(tamano, grupo);
  }
  const ordenados = [...grupos.values()].sort(
    (a, b) => (a.maxActivos ?? Infinity) - (b.maxActivos ?? Infinity),
  );
  let anterior: number | null = null;
  for (const g of ordenados) {
    g.rango =
      g.maxActivos === null
        ? anterior === null
          ? "Vehículos activos ilimitados"
          : `Más de ${anterior} vehículos activos a la vez`
        : anterior === null
          ? `Hasta ${g.maxActivos} vehículos activos a la vez`
          : `${anterior + 1} a ${g.maxActivos} vehículos activos a la vez`;
    if (g.maxActivos !== null) anterior = g.maxActivos;
  }
  return ordenados;
}

/** «$ 70.000» con el formato de la landing: punto de miles, sin espacio. */
export const pesos = (valor: number) => `$${Math.round(valor).toLocaleString("es-AR")}`;
