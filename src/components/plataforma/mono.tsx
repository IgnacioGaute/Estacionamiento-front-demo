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
import { Segmento } from "@/components/ui/segmento";

// Las piezas de tarjeta de las pantallas de plataforma (diseño «Plataforma Super Admin»,
// https://claude.ai/artifact/YHebQCMJ4zHLKjeahVabw9): título de tarjeta en semibold, la cifra en
// monoespaciada, el gráfico directo sobre la tarjeta y un pie con la lectura. El amarillo queda
// para lo activo y lo principal. Se comparten para que métricas, empresas, ficha y planes se lean
// como un mismo sistema.

export const EJE = "#8F8A80";

// Superficie, borde y línea interna de las tarjetas de plataforma.
export const SUPERFICIE = "bg-[#161411]";
export const BORDE = "border-[#26231E]";

export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[12.5px] font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

const TONOS = {
  amarillo: "border-gm-yellow/25 bg-gm-yellow/[0.08] text-gm-yellow",
  verde: "border-[#3DD68C]/25 bg-[#3DD68C]/[0.08] text-[#3DD68C]",
  lavanda: "border-[#7E86F0]/30 bg-[#7E86F0]/[0.1] text-[#A9AFFF]",
  naranja: "border-transparent bg-[#F0A43A] font-semibold text-gm-ink",
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-[11px] font-medium leading-[18px]",
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
        "size-1.5 shrink-0 animate-[latido_1.6s_ease-in-out_infinite] rounded-full bg-[#3DD68C]",
        className,
      )}
    />
  );
}

// Subida en verde y bajada en coral, siempre con su flecha: el color solo no alcanza.
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
      <span className={cn("shrink-0 text-[12px] text-muted-foreground", className)}>
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
        "shrink-0 whitespace-nowrap font-mono text-[12px] font-medium tabular-nums",
        sube ? "text-[#3DD68C]" : "text-[#F2725B]",
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
    <Tag className={cn("flex flex-col rounded-xl border p-5", SUPERFICIE, BORDE, className)}>
      {children}
    </Tag>
  );
}

// Encabezado de tarjeta: el título y su pastilla arriba, la cifra con su unidad abajo, y a la
// derecha lo que haga falta (un selector, una leyenda).
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
          <h2 className="m-0 text-[14px] font-semibold text-foreground">{rotulo}</h2>
          {pastilla}
        </div>
        {valor !== undefined && (
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "font-mono text-[26px] font-medium leading-none tracking-[-0.03em] tabular-nums",
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

// El escenario: el lugar del gráfico, directo sobre la tarjeta (sin recuadro: cada caja de más
// era ruido).
export function Escenario({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-4 flex-1", className)}>{children}</div>;
}

export function Pie({ izquierda, derecha }: { izquierda: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#211F1B] pt-3 text-[12px]">
      <span className="min-w-0 truncate" style={{ color: EJE }}>
        {izquierda}
      </span>
      {derecha !== undefined && (
        <span className="shrink-0 font-mono font-medium text-foreground">{derecha}</span>
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
  // Rubber Segment (ui/segmento): la pastilla se estira hacia la opción elegida y se puede arrastrar.
  return (
    <Segmento
      aria-label={etiqueta}
      size={redondo ? "sm" : "md"}
      claro={claro}
      className={className}
      items={opciones.map((o) => ({ value: String(o.id), label: o.label, badge: o.cuenta }))}
      value={String(valor)}
      onChange={(id) => {
        const elegida = opciones.find((o) => String(o.id) === id);
        if (elegida) onChange(elegida.id);
      }}
    />
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
          "w-auto gap-2 border-[#2A2824] bg-[#151411] text-[13px] font-medium transition-colors hover:border-[#3A362F] focus:ring-2 focus:ring-gm-yellow focus:ring-offset-0 data-[state=open]:border-[#3A362F] [&>svg]:opacity-70",
          redondo ? "h-8 rounded-lg px-3 text-xs" : "h-9 rounded-lg px-3",
          className,
        )}
      >
        {etiqueta && (
          <span className="shrink-0 text-[12.5px] font-normal text-[#8F8A80]">
            {etiqueta.charAt(0) + etiqueta.slice(1).toLowerCase()}
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
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground", className)}>
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
        "flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-[12px] font-semibold text-foreground",
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
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium",
        activa ? "bg-[#12271C] text-[#3DD68C]" : "bg-[#2C1612] text-[#F2725B]",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", activa ? "bg-[#3DD68C]" : "bg-[#F2725B]")}
      />
      {activa ? "Activa" : estado === "SUSPENDIDA" ? "Suspendida" : "De baja"}
    </span>
  );
}
