import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { numero } from "./formato";

// Las piezas de tarjeta de las pantallas de plataforma, con el lenguaje de Mono Charts: rótulo
// en mayúsculas con su pastilla, el número grande, un escenario más oscuro donde vive el gráfico
// y un pie en monoespaciada. Se comparten para que métricas, empresas y ficha se lean como un
// mismo sistema.

export const EJE = "#8A8073";

export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

const TONOS = {
  amarillo: "border-gm-yellow/30 bg-gm-yellow/[0.12] text-gm-yellow",
  verde: "border-emerald-400/35 bg-emerald-400/10 text-emerald-400",
  lavanda: "border-[#7E86F0]/35 bg-[#7E86F0]/[0.14] text-[#A9AFFF]",
  naranja: "border-transparent bg-[#FF7A4D] font-semibold text-gm-ink",
  lleno: "border-transparent bg-gm-yellow font-semibold text-gm-ink",
} as const;

export function Pastilla({
  children,
  tono = "amarillo",
  vivo,
  className,
}: {
  children: ReactNode;
  tono?: keyof typeof TONOS;
  vivo?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-[7px] py-0.5 font-mono text-[10px] leading-4",
        TONOS[tono],
        className,
      )}
    >
      {vivo && <PuntoVivo />}
      {children}
    </span>
  );
}

// El punto que late: la cifra se está moviendo ahora mismo.
export function PuntoVivo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 animate-[latido_1.6s_ease-in-out_infinite] rounded-full bg-emerald-400",
        className,
      )}
    />
  );
}

// Subida en verde y bajada en naranja, siempre con su flecha: el color solo no alcanza.
export function Variacion({
  valor,
  decimales = 1,
  className,
}: {
  valor: number | null;
  decimales?: number;
  className?: string;
}) {
  if (valor === null)
    return (
      <span
        className={cn(
          "shrink-0 rounded-full bg-gm-surface-3 px-2 py-[3px] text-[11.5px] font-bold text-muted-foreground",
          className,
        )}
      >
        Sin datos
      </span>
    );
  const sube = valor >= 0;
  // Contra un período casi vacío la suba da «45.119 %», que no se lee: pasado el 1.000 % se
  // cuenta en veces. Y de 100 % para arriba el decimal ya no dice nada.
  const texto =
    valor >= 1000
      ? `×${numero(valor / 100 + 1)}`
      : `${numero(Math.abs(valor), Math.abs(valor) >= 100 ? 0 : decimales)}%`;
  return (
    <span
      title={`${sube ? "+" : "−"}${numero(Math.abs(valor), 1)}% contra el período anterior`}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-bold tabular-nums",
        sube ? "bg-emerald-400/[0.13] text-emerald-400" : "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]",
        className,
      )}
    >
      {sube ? "↑" : "↓"} {texto}
    </span>
  );
}

export function Tarjeta({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return (
    <Tag
      className={cn(
        "flex flex-col rounded-[22px] border border-border bg-gm-surface p-[18px] pb-3 transition-colors duration-200 hover:border-gm-line-strong",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

// Encabezado de tarjeta: rótulo y pastilla arriba, la cifra con su unidad abajo, y a la derecha
// lo que haga falta (un selector, una leyenda).
export function Encabezado({
  rotulo,
  pastilla,
  valor,
  unidad,
  derecha,
  valorClassName,
}: {
  rotulo: ReactNode;
  pastilla?: ReactNode;
  valor?: ReactNode;
  unidad?: ReactNode;
  derecha?: ReactNode;
  valorClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Rotulo>{rotulo}</Rotulo>
          {pastilla}
        </div>
        {valor !== undefined && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "font-display text-[30px] font-semibold leading-none tabular-nums",
                valorClassName,
              )}
            >
              {valor}
            </span>
            {unidad && <span className="text-[12.5px] text-muted-foreground">{unidad}</span>}
          </div>
        )}
      </div>
      {derecha}
    </div>
  );
}

// El escenario: el recuadro oscuro donde se dibuja el gráfico.
export function Escenario({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mt-3.5 flex-1 rounded-2xl border border-[#26221C] bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Pie({ izquierda, derecha }: { izquierda: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5 font-mono text-[11px]">
      <span className="min-w-0 truncate" style={{ color: EJE }}>
        {izquierda}
      </span>
      {derecha !== undefined && (
        <span className="shrink-0 font-medium text-foreground">{derecha}</span>
      )}
    </div>
  );
}

// Segmentos de un selector (período, filtro, playa). Real `aria-pressed` para lectores de pantalla.
export function Segmentos<T extends string | number>({
  opciones,
  valor,
  onChange,
  etiqueta,
  redondo,
  claro,
  className,
}: {
  opciones: { id: T; label: ReactNode; cuenta?: number }[];
  valor: T;
  onChange: (id: T) => void;
  etiqueta: string;
  redondo?: boolean;
  // Seleccionado en crema en vez de amarillo: para selectores secundarios dentro de una tarjeta.
  claro?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        "flex gap-1 border border-border p-1",
        redondo ? "rounded-full bg-background p-[3px]" : "rounded-[13px] bg-gm-surface",
        className,
      )}
    >
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button
            key={String(o.id)}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 font-bold transition-colors",
              redondo ? "h-7 rounded-full px-3 text-xs" : "h-9 rounded-[9px] px-3.5 text-[13.5px]",
              activo
                ? claro
                  ? "bg-foreground text-gm-ink"
                  : "bg-gm-yellow text-gm-ink"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.cuenta !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-mono text-[10.5px]",
                  activo ? "bg-gm-ink/20 text-gm-ink" : "bg-gm-surface-3 text-[#C9BFB1]",
                )}
              >
                {o.cuenta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Selector desplegable con el mismo estilo que el resto. Reemplaza al <select> nativo, cuyas
// opciones el navegador dibuja con fondo blanco y el texto claro del tema: quedaban ilegibles.
export function Selector({
  etiqueta,
  ariaLabel,
  valor,
  opciones,
  onChange,
  redondo,
  className,
}: {
  // Rótulo en monoespaciada dentro del botón («EMPRESA», «ORDENAR»). Opcional.
  etiqueta?: string;
  ariaLabel: string;
  valor: string;
  opciones: { id: string; label: string }[];
  onChange: (id: string) => void;
  redondo?: boolean;
  className?: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "w-auto gap-2 border-border bg-gm-surface text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong focus:ring-2 focus:ring-gm-yellow focus:ring-offset-0 data-[state=open]:border-gm-line-strong [&>svg]:opacity-70",
          redondo ? "h-9 rounded-full bg-background px-3.5 text-xs" : "h-[46px] rounded-[13px] px-3",
          className,
        )}
      >
        {etiqueta && (
          <span className="shrink-0 font-mono text-[10.5px] font-normal tracking-[0.1em] text-[#8A8073]">
            {etiqueta}
          </span>
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="end"
        className="max-h-80 rounded-xl border-gm-line-strong bg-gm-surface p-0.5 text-foreground shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
      >
        {opciones.map((o) => (
          <SelectItem
            key={o.id}
            value={o.id}
            className="cursor-pointer rounded-lg py-2 text-[13px] focus:bg-gm-surface-2 focus:text-foreground data-[state=checked]:font-semibold data-[state=checked]:text-gm-yellow"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Una leyenda que explica los colores de una barra segmentada: sin ella, las barras parecían
// renglones vacíos de carga.
export function Leyenda({
  items,
  className,
}: {
  items: { color: string; label: string; n: number }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-muted-foreground", className)}>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-[3px]" style={{ background: i.color }} />
          <span className="text-foreground">{numero(i.n)}</span>
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function Avatar({
  texto,
  fondo,
  className,
}: {
  texto: string;
  fondo: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[38px] shrink-0 items-center justify-center rounded-[11px] font-display text-sm font-semibold text-foreground",
        className,
      )}
      style={{ background: fondo }}
    >
      {texto}
    </span>
  );
}

export function EstadoEmpresa({ estado }: { estado: "ACTIVA" | "SUSPENDIDA" | "BAJA" }) {
  const activa = estado === "ACTIVA";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        activa ? "bg-emerald-400/[0.12] text-emerald-400" : "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", activa ? "bg-emerald-400" : "bg-[#FF7A4D]")}
      />
      {activa ? "Activa" : estado === "SUSPENDIDA" ? "Suspendida" : "De baja"}
    </span>
  );
}
