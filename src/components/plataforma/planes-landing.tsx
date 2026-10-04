"use client";

// Las tarjetas y los selectores de planes con el mismo dibujo que la landing
// (estacionamiento-landing, components/Planes.tsx), en los colores del panel: nombre y tamaño, el
// precio por mes en grande, el total del período con lo que ahorra, la modalidad, tres puntos y
// una acción. La tarjeta que importa (el plan actual, el más elegido) lleva borde claro y una
// etiqueta amarilla, como la destacada de la landing. Las usan la ficha del super admin, Mi plan y
// la lista de precios, así las tres dicen lo mismo que la landing.

import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { pesos } from "./cuenta";

export type PeriodoVista = { meses: number; descuento: number };

/** Lo que se paga con un período: el total, su equivalente por mes y lo que se ahorra. */
export function precioEnPeriodo(mensual: number, p: PeriodoVista) {
  const total = Math.round((mensual * p.meses * (100 - p.descuento)) / 100);
  return { total, porMes: Math.round(total / p.meses), ahorro: mensual * p.meses - total };
}

/** «por mes», «por 3 meses», «por año»: como el total de la landing. */
export const porPeriodo = (meses: number) => (meses === 1 ? "por mes" : meses === 12 ? "por año" : `por ${meses} meses`);

export const puntosDePlan = (cocheras: boolean) => [
  "Entradas, salidas y cobros",
  "Tarifas, caja y turnos",
  cocheras ? "Cocheras mensuales y cuenta corriente" : "Comprobantes y reportes",
];

/** El selector de la landing: botones juntos en una cápsula, el elegido en claro. */
export function Selector<T extends string | boolean>({
  etiqueta,
  opciones,
  valor,
  onChange,
}: {
  etiqueta: string;
  opciones: { valor: T; etiqueta: string; descuento?: number }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[9px]">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8F8676]">{etiqueta}</span>
      <div
        role="group"
        aria-label={etiqueta}
        className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-[10px] border border-[#2E2A23] bg-[#1B1915] p-1"
      >
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <button
              key={String(o.valor)}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(o.valor)}
              className={cn(
                "inline-flex h-10 items-center gap-[7px] rounded-[7px] px-4 text-sm font-semibold transition-colors",
                activo ? "bg-[#F6F0E6] text-[#12100D]" : "text-[#BDB4A6] hover:text-[#F6F0E6]",
              )}
            >
              {o.etiqueta}
              {!!o.descuento && (
                <span
                  className={cn(
                    "rounded px-[5px] py-[3px] text-[11px] font-bold leading-none",
                    activo ? "bg-gm-yellow text-[#12100D]" : "bg-gm-yellow/[0.14] text-gm-yellow",
                  )}
                >
                  −{o.descuento}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GrillaPlanes({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">{children}</div>;
}

/** El botón de una tarjeta: claro el de la destacada, con borde los demás. */
export const botonPlan = (principal: boolean) =>
  cn(
    "flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-colors disabled:cursor-default disabled:opacity-100",
    principal
      ? "bg-[#F6F0E6] text-[#12100D] hover:bg-white"
      : "border border-[#3A342B] text-[#F6F0E6] hover:border-[#F6F0E6]",
  );

export function TarjetaPlan({
  nombre,
  tamano,
  mensual,
  periodo,
  cocheras,
  distintivo,
  destacada = false,
  extra,
  children,
}: {
  nombre: string;
  tamano: string;
  // Lo que cuesta por mes (de lista o pactado); el período le aplica su descuento.
  mensual: number;
  periodo: PeriodoVista;
  cocheras: boolean;
  // La etiqueta amarilla de arriba: «Plan actual», «Tu plan», «Más elegido».
  distintivo?: string;
  destacada?: boolean;
  // Debajo de la modalidad (el precio pactado, por ejemplo).
  extra?: ReactNode;
  // La acción del pie.
  children?: ReactNode;
}) {
  const { total, porMes, ahorro } = precioEnPeriodo(mensual, periodo);
  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl bg-[#1B1915] p-8",
        destacada ? "border-[1.5px] border-[#F6F0E6] shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)]" : "border border-[#2E2A23]",
      )}
    >
      {distintivo && (
        <span className="absolute -top-3 left-8 rounded-full bg-gm-yellow px-2.5 py-1 text-xs font-bold text-[#12100D]">
          {distintivo}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-lg font-semibold text-[#F6F0E6]">{nombre}</h3>
        <p className="m-0 text-sm text-[#BDB4A6]">{tamano}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 flex flex-wrap items-baseline gap-x-[9px] gap-y-[5px]">
          <span className="whitespace-nowrap font-mono text-[clamp(32px,2.8vw,44px)] font-medium leading-[1.08] tracking-[-0.035em] text-[#F6F0E6] [font-variant-numeric:tabular-nums]">
            {pesos(porMes)}
          </span>
          <span className="text-[15px] text-[#8F8676]">por mes</span>
        </p>
        <p className="m-0 min-h-[34px] text-[13px] leading-snug text-[#BDB4A6]">
          {periodo.meses > 1 && (
            <>
              <strong className="font-semibold text-[#F6F0E6]">
                {pesos(total)} {porPeriodo(periodo.meses)}
              </strong>
              {ahorro > 0 && ` · Ahorrás ${pesos(ahorro)}`}
            </>
          )}
        </p>
        <p className="m-0 text-[13px] text-[#8F8676]">{cocheras ? "Rotación + cocheras mensuales" : "Tickets y rotación"}</p>
        {extra}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-[#2B2620] p-0 pt-5 text-[15px] leading-normal text-[#D9D0C2]">
        {puntosDePlan(cocheras).map((t) => (
          <li key={t} className="flex gap-2.5">
            <Check aria-hidden className="mt-0.5 size-[18px] flex-none text-[#4ADE9B]" strokeWidth={2.3} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {children && <div className="mt-auto">{children}</div>}
    </article>
  );
}
