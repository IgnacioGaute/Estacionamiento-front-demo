"use client";

// Los gráficos de las pantallas de plataforma, en el estilo de Mono Charts: trazos finos con
// puntas redondeadas, un solo color protagonista y el resto en tonos de la misma paleta.
//
// Son SVG dibujados acá y no recharts: cada uno es una forma simple, y así el ancho se estira con
// `preserveAspectRatio="none"` sin deformar los trazos (`vector-effect`), mientras los puntos,
// los rótulos y el tooltip van en HTML encima para que no se estiren con él.

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EJE } from "./mono";

export const AMARILLO = "#F5C219";
export const CREMA = "#E9E1D4";

export function spline(p: [number, number][]) {
  if (p.length < 2) return "";
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  // Catmull-Rom a Bézier: la curva pasa por cada punto, sin la dureza de la poligonal. Los
  // puntos de control no salen del rango vertical del tramo: si no, al lado de un pico la curva
  // bajaba de cero y dibujaba un cobro negativo que no existió.
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const t = 0.17;
    const bajo = Math.min(p1[1], p2[1]);
    const alto = Math.max(p1[1], p2[1]);
    const acotar = (y: number) => Math.min(alto, Math.max(bajo, y)).toFixed(1);
    d += ` C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${acotar(p1[1] + (p2[1] - p0[1]) * t)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${acotar(p2[1] - (p3[1] - p1[1]) * t)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Un id de gradiente seguro para `url(#…)`: useId trae dos puntos, que CSS no acepta sin escapar.
function useGradiente() {
  return `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

// Escala «redonda» para el eje: 3 M, 6 M, 9 M se leen; 2,87 M no.
function escala(maximo: number, marcas: number) {
  const bruto = Math.max(1, maximo) / marcas;
  const e = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / e;
  const paso = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => f <= x) ?? 10;
  return paso * e;
}

// Sparkline: solo la forma, con la base en el mínimo, porque lo que se lee es si sube o baja.
export function Chispa({
  valores,
  color = CREMA,
  alto = 46,
  ancho,
  relleno = true,
  className,
}: {
  valores: number[];
  color?: string;
  alto?: number;
  // Ancho fijo en px; sin él ocupa el ancho del contenedor.
  ancho?: number;
  relleno?: boolean;
  className?: string;
}) {
  const id = useGradiente();
  if (valores.length < 2)
    return <div aria-hidden style={{ height: alto, width: ancho }} className={className} />;
  const W = ancho ?? 200;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const linea = spline(
    valores.map((v, i) => [
      (i / (valores.length - 1)) * W,
      3 + (1 - (v - min) / rango) * (alto - 6),
    ]),
  );
  return (
    <svg
      width={ancho ?? "100%"}
      height={alto}
      viewBox={`0 0 ${W} ${alto}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.3} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {relleno && <path d={`${linea} L${W},${alto} L0,${alto} Z`} fill={`url(#${id})`} />}
      <path
        d={linea}
        fill="none"
        stroke={color}
        strokeWidth={ancho ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// La curva de cobrado por día: la serie en amarillo con su área, la de comparación punteada
// debajo, y lectura al pasar el cursor (o tocar, en el celular).
export function Curva({
  serie,
  comparacion,
  ejeX,
  tooltip,
  formatoEje,
  ariaLabel,
  alto = 220,
  marcas = 4,
  area = 0.32,
}: {
  serie: number[];
  comparacion?: number[] | null;
  ejeX: string[];
  tooltip: (i: number) => ReactNode;
  formatoEje: (v: number) => string;
  ariaLabel: string;
  alto?: number;
  marcas?: number;
  area?: number;
}) {
  const id = useGradiente();
  const [hi, setHi] = useState<number | null>(null);
  const n = serie.length;
  if (n < 2)
    return (
      <p className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Todavía no hay días para dibujar.
      </p>
    );

  const W = 1000;
  const arriba = 10;
  const abajo = 6;
  // Sin cobros el eje quedaba en 0,25: nunca menos de un peso por marca.
  const paso = Math.max(1, escala(Math.max(...serie, ...(comparacion ?? [])) * 1.05, marcas));
  const tope = paso * marcas;
  const X = (i: number) => (i / (n - 1)) * W;
  const Y = (v: number) => arriba + (1 - v / tope) * (alto - arriba - abajo);
  const linea = spline(serie.map((v, i) => [X(i), Y(v)]));
  const lineaComparacion = comparacion
    ? spline(comparacion.map((v, i) => [X(i), Y(v)]))
    : "";
  const grilla = Array.from({ length: marcas + 1 }, (unused, k) => `M0,${Y(paso * k).toFixed(1)} H${W}`).join(" ");
  const indices = [...new Set([0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round(((n - 1) * 3) / 4), n - 1])];
  const pct = (i: number) => (X(i) / W) * 100;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex" style={{ height: alto }}>
        <div className="relative w-[50px] shrink-0">
          {Array.from({ length: marcas + 1 }, (unused, k) => (
            <span
              key={k}
              className="absolute right-2.5 font-mono text-[10.5px]"
              style={{ top: Y(paso * k) - 7, color: EJE }}
            >
              {k === 0 ? "0" : formatoEje(paso * k)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <svg
            width="100%"
            height={alto}
            viewBox={`0 0 ${W} ${alto}`}
            preserveAspectRatio="none"
            className="block overflow-visible"
            role="img"
            aria-label={ariaLabel}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={AMARILLO} stopOpacity={area} />
                <stop offset="0.75" stopColor={AMARILLO} stopOpacity={area / 6} />
                <stop offset="1" stopColor={AMARILLO} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={grilla} fill="none" stroke="#2E2820" strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            <path d={`${linea} L${W},${alto - abajo} L0,${alto - abajo} Z`} fill={`url(#${id})`} />
            {lineaComparacion && (
              <path
                d={lineaComparacion}
                fill="none"
                stroke="#A59B8D"
                strokeOpacity={0.85}
                strokeWidth={1.75}
                strokeDasharray="5 5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path
              d={linea}
              fill="none"
              stroke={AMARILLO}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hi === null ? (
            <span
              aria-hidden
              className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-gm-yellow shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_6px_rgba(245,194,25,0.25)]"
              style={{ left: "100%", top: Y(serie[n - 1]) - 6 }}
            />
          ) : (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25"
                style={{ left: `${pct(hi)}%` }}
              />
              {comparacion && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-[9px] -translate-x-1/2 rounded-full border-2 border-[#A59B8D] bg-background"
                  style={{ left: `${pct(hi)}%`, top: Y(comparacion[hi] ?? 0) - 4.5 }}
                />
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-gm-yellow shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_6px_rgba(245,194,25,0.3)]"
                style={{ left: `${pct(hi)}%`, top: Y(serie[hi]) - 6 }}
              />
              <div
                role="status"
                className="pointer-events-none absolute top-1 z-10 flex min-w-[196px] flex-col gap-1.5 rounded-xl border border-gm-line-strong bg-gm-surface/95 px-3 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur"
                style={{
                  left: `${pct(hi)}%`,
                  transform: pct(hi) > 60 ? "translateX(calc(-100% - 16px))" : "translateX(16px)",
                }}
              >
                {tooltip(hi)}
              </div>
            </>
          )}

          <div className="absolute inset-0 flex" onPointerLeave={() => setHi(null)}>
            {serie.map((unused, i) => (
              <div
                key={i}
                className="h-full flex-1"
                onPointerEnter={() => setHi(i)}
                onPointerDown={() => setHi(i)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="relative ml-[50px] h-7">
        {indices.map((i, k) => (
          <span
            key={i}
            className="absolute top-2 whitespace-nowrap font-mono text-[10.5px]"
            style={{
              left: `${pct(i)}%`,
              color: EJE,
              transform:
                k === 0 ? "none" : k === indices.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {ejeX[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Barras en espejo, un día por columna: lo que entra hacia arriba y lo que sale hacia abajo.
// Un día que entra más de lo que sale se ve de un vistazo, sin restar columnas.
export function Espejo({
  arriba,
  abajo,
  ejeX,
  tooltip,
  ariaLabel,
  alto = 190,
}: {
  arriba: number[];
  abajo: number[];
  ejeX: string[];
  tooltip: (i: number) => ReactNode;
  ariaLabel: string;
  alto?: number;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const n = arriba.length;
  if (!n) return null;
  const maximo = Math.max(1, ...arriba, ...abajo);
  const mitad = alto / 2 - 6;
  const altura = (v: number) => (v ? Math.max(3, (v / maximo) * mitad) : 0);
  const pct = (i: number) => ((i + 0.5) / n) * 100;
  const indices = [...new Set([0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round(((n - 1) * 3) / 4), n - 1])];
  const apagado = (i: number) => hi !== null && hi !== i;
  return (
    <div className="flex h-full flex-col">
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex"
        style={{ height: alto }}
        onPointerLeave={() => setHi(null)}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#2E2820]" />
        {arriba.map((v, i) => (
          <div
            key={i}
            className="flex h-full flex-1 flex-col"
            onPointerEnter={() => setHi(i)}
            onPointerDown={() => setHi(i)}
          >
            <div className="flex flex-1 items-end justify-center pb-0.5">
              <span
                className="w-[62%] max-w-[14px] rounded-full transition-opacity"
                style={{ height: altura(v), background: AMARILLO, opacity: apagado(i) ? 0.35 : 1 }}
              />
            </div>
            <div className="flex flex-1 items-start justify-center pt-0.5">
              <span
                className="w-[62%] max-w-[14px] rounded-full transition-opacity"
                style={{ height: altura(abajo[i] ?? 0), background: CREMA, opacity: apagado(i) ? 0.35 : 1 }}
              />
            </div>
          </div>
        ))}
        {hi !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 flex min-w-[180px] flex-col gap-1.5 rounded-xl border border-gm-line-strong bg-gm-surface/95 px-3 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur"
            style={{
              left: `${pct(hi)}%`,
              transform: pct(hi) > 60 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            {tooltip(hi)}
          </div>
        )}
      </div>
      <div className="relative h-7">
        {indices.map((i, k) => (
          <span
            key={i}
            className="absolute top-2 whitespace-nowrap font-mono text-[10.5px]"
            style={{
              left: `${pct(i)}%`,
              color: EJE,
              transform:
                k === 0 ? "none" : k === indices.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {ejeX[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Filas del tooltip de una curva, para que todos se armen igual.
export function FilaTooltip({
  color,
  hueco,
  label,
  valor,
  tenue,
}: {
  color?: string;
  hueco?: boolean;
  label: ReactNode;
  valor: ReactNode;
  tenue?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12.5px]">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color && (
          <span
            aria-hidden
            className={cn("size-2 rounded-full", hueco && "border-2 bg-transparent")}
            style={hueco ? { borderColor: color } : { background: color }}
          />
        )}
        {label}
      </span>
      <span className={cn("font-bold tabular-nums", tenue && "font-semibold text-[#C9BFB1]")}>
        {valor}
      </span>
    </div>
  );
}

// Anillo de reparto con puntas redondeadas y un hueco entre segmentos.
export function Anillo({
  segmentos,
  tamano = 148,
  ariaLabel,
  children,
}: {
  segmentos: { id: string; valor: number; color: string }[];
  tamano?: number;
  ariaLabel: string;
  children?: ReactNode;
}) {
  const R = 70;
  const GROSOR = 18;
  const HUECO = 7;
  const C = 2 * Math.PI * R;
  const total = segmentos.reduce((n, s) => n + s.valor, 0);
  const visibles = segmentos.filter((s) => s.valor > 0);
  let recorrido = 0;
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox="0 0 180 180" role="img" aria-label={ariaLabel}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="#231D17" strokeWidth={GROSOR} />
        {total > 0 &&
          visibles.map((s) => {
            const largo = (s.valor / total) * C;
            const unico = visibles.length === 1;
            const dibujado = unico ? C : Math.max(0.5, largo - GROSOR - HUECO);
            const desde = recorrido;
            recorrido += largo;
            return (
              <circle
                key={s.id}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={GROSOR}
                strokeLinecap={unico ? "butt" : "round"}
                strokeDasharray={`${dibujado.toFixed(1)} ${C.toFixed(1)}`}
                strokeDashoffset={unico ? 0 : -(desde + (GROSOR + HUECO) / 2)}
                transform="rotate(-90 90 90)"
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {children}
      </div>
    </div>
  );
}

// Anillos concéntricos: un progreso por anillo, de afuera hacia adentro.
export function Anillos({
  anillos,
  tamano = 132,
  ariaLabel,
}: {
  anillos: { fraccion: number; color: string }[];
  tamano?: number;
  ariaLabel: string;
}) {
  const RADIOS = [66, 48, 30];
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 160 160"
      role="img"
      aria-label={ariaLabel}
      className="shrink-0"
    >
      {anillos.slice(0, 3).map((a, i) => {
        const r = RADIOS[i];
        const c = 2 * Math.PI * r;
        const f = Math.min(1, Math.max(0, a.fraccion));
        return (
          <g key={i}>
            <circle cx="80" cy="80" r={r} fill="none" stroke="#231D17" strokeWidth={12} />
            {f > 0 && (
              <circle
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${(c * f).toFixed(1)} ${c.toFixed(1)}`}
                transform="rotate(-90 80 80)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

// Medidor de 240 grados.
export function Medidor({
  fraccion,
  color,
  ariaLabel,
  children,
}: {
  fraccion: number;
  color: string;
  ariaLabel: string;
  children?: ReactNode;
}) {
  const f = Math.min(1, Math.max(0, fraccion));
  return (
    <div className="relative h-[136px] w-[220px] shrink-0">
      <svg width="220" height="136" viewBox="0 0 220 136" role="img" aria-label={ariaLabel}>
        <path d={arco(110, 90, 76, 150, 390)} fill="none" stroke="#231D17" strokeWidth={16} strokeLinecap="round" />
        {f > 0 && (
          <path
            d={arco(110, 90, 76, 150, 150 + 240 * Math.max(f, 0.004))}
            fill="none"
            stroke={color}
            strokeWidth={16}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-x-0 top-[60px] flex flex-col items-center gap-[3px]">
        {children}
      </div>
    </div>
  );
}

const NIVELES = [
  "#231D17",
  "rgba(245,194,25,0.2)",
  "rgba(245,194,25,0.42)",
  "rgba(245,194,25,0.68)",
  AMARILLO,
];

export function nivelDe(valor: number, maximo: number) {
  const q = maximo ? valor / maximo : 0;
  return q < 0.1 ? 0 : q < 0.3 ? 1 : q < 0.55 ? 2 : q < 0.8 ? 3 : 4;
}

export function LeyendaNiveles() {
  return (
    <span className="flex items-center gap-[5px] text-muted-foreground">
      Menos
      {NIVELES.map((c) => (
        <span key={c} aria-hidden className="h-2.5 w-3.5 rounded-[3px]" style={{ background: c }} />
      ))}
      Más
    </span>
  );
}

// Matriz de 7 días × 24 horas. `matriz[0]` es el lunes.
export function MapaCalor({
  matriz,
  dias,
  seleccion,
  onSeleccion,
}: {
  matriz: number[][];
  dias: string[];
  seleccion: { d: number; h: number } | null;
  onSeleccion: (celda: { d: number; h: number } | null) => void;
}) {
  const maximo = Math.max(1, ...matriz.flat());
  const columnas = "36px repeat(24, minmax(0, 1fr))";
  return (
    <div className="flex min-w-[560px] flex-col gap-1" onPointerLeave={() => onSeleccion(null)}>
      <div className="mb-0.5 grid gap-1" style={{ gridTemplateColumns: columnas }}>
        <span />
        {Array.from({ length: 24 }, (unused, h) => (
          <span key={h} className="text-center font-mono text-[9.5px]" style={{ color: EJE }}>
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      {matriz.map((fila, d) => (
        <div key={d} className="grid items-center gap-1" style={{ gridTemplateColumns: columnas }}>
          <span className="font-mono text-[10.5px] text-muted-foreground">{dias[d]}</span>
          {fila.map((valor, h) => {
            const activa = seleccion?.d === d && seleccion.h === h;
            return (
              <div
                key={h}
                title={`${dias[d]} ${String(h).padStart(2, "0")}:00 · ${valor.toLocaleString("es-AR")} entradas`}
                onPointerEnter={() => onSeleccion({ d, h })}
                onPointerDown={() => onSeleccion({ d, h })}
                className="h-5 rounded-[5px] transition-transform duration-100 hover:scale-[1.18]"
                style={{
                  background: NIVELES[nivelDe(valor, maximo)],
                  boxShadow: activa ? "0 0 0 2px #F2ECE3" : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Pilares tipo píldora: este período contra el anterior, uno al lado del otro.
export function Pilares({
  columnas,
  alto = 150,
}: {
  columnas: { nombre: string; actual: number; anterior: number; destacado: boolean; titulo: string }[];
  alto?: number;
}) {
  const maximo = Math.max(1, ...columnas.flatMap((c) => [c.actual, c.anterior]));
  const altura = (v: number) => Math.max(8, Math.round((v / maximo) * alto));
  return (
    <div className="flex h-full items-end justify-between">
      {columnas.map((c) => (
        <div key={c.nombre} title={c.titulo} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex items-end gap-1" style={{ height: alto }}>
            <div
              className="w-[13px] rounded-full"
              style={{ height: altura(c.actual), background: c.destacado ? AMARILLO : CREMA }}
            />
            <div className="w-[13px] rounded-full bg-[#3A3228]" style={{ height: altura(c.anterior) }} />
          </div>
          <span
            className="font-mono text-[10.5px]"
            style={{ color: c.destacado ? AMARILLO : EJE }}
          >
            {c.nombre}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mosaico: cada empresa ocupa un área proporcional a lo que cobró. Partición binaria por peso,
// cortando siempre el lado más largo del rectángulo real para que no queden tiras finitas.
type Mosaico = {
  id: string;
  nombre: string;
  iniciales: string;
  valor: number;
  monto: string;
  href: string;
  detalle: string;
};

export function Mosaicos({ items, alto = 240 }: { items: Mosaico[]; alto?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(690);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth || 690);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const ordenados = items.filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  const piezas: { item: Mosaico; x: number; y: number; w: number; h: number }[] = [];
  const partir = (lista: Mosaico[], x: number, y: number, w: number, h: number) => {
    if (!lista.length) return;
    if (lista.length === 1) {
      piezas.push({ item: lista[0], x, y, w, h });
      return;
    }
    const total = lista.reduce((n, i) => n + i.valor, 0);
    let acumulado = 0;
    let k = 0;
    while (k < lista.length - 1 && acumulado + lista[k].valor <= total / 2) {
      acumulado += lista[k].valor;
      k++;
    }
    if (k === 0) {
      acumulado = lista[0].valor;
      k = 1;
    }
    const f = acumulado / total;
    if (w * ancho >= h * alto) {
      partir(lista.slice(0, k), x, y, w * f, h);
      partir(lista.slice(k), x + w * f, y, w * (1 - f), h);
    } else {
      partir(lista.slice(0, k), x, y, w, h * f);
      partir(lista.slice(k), x, y + h * f, w, h * (1 - f));
    }
  };
  partir(ordenados, 0, 0, 1, 1);

  const FONDOS = [AMARILLO, CREMA, CREMA, "#A59B8D", "#A59B8D", "#A59B8D", "#4A4034", "#4A4034"];
  const total = ordenados.reduce((n, i) => n + i.valor, 0);

  return (
    <div ref={caja} className="relative w-full" style={{ height: alto }}>
      {!ordenados.length && (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Sin cobros en el período.
        </p>
      )}
      {piezas.map(({ item, x, y, w, h }) => {
        const rango = ordenados.indexOf(item);
        const claro = rango < 6;
        const grande = w * ancho > 84 && h * alto > 62;
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.detalle}
            className="absolute block p-[3px] transition-[filter] hover:brightness-110"
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
          >
            <span
              className={cn(
                "flex size-full flex-col justify-between overflow-hidden rounded-xl",
                grande ? "px-3.5 py-3" : "px-2 py-2",
                claro ? "text-gm-ink" : "text-foreground",
              )}
              style={{ background: FONDOS[rango] ?? "#3A3228" }}
            >
              <span
                className={cn(
                  "truncate font-bold leading-tight",
                  grande ? (rango < 3 ? "text-[15px]" : "text-[13px]") : "text-xs",
                )}
              >
                {grande ? item.nombre : item.iniciales}
              </span>
              {grande && (
                <span className="flex items-baseline justify-between gap-1.5 font-mono text-[11px] opacity-85">
                  <span>{((item.valor / total) * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%</span>
                  <span className="truncate">{item.monto}</span>
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
