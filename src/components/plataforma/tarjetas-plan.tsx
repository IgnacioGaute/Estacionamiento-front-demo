import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrupoPlan, pesos } from "./cuenta";

// Las tarjetas de planes con el mismo dibujo que la landing: una por tamaño de playa, con el
// precio solo tickets y el precio con alquileres mensuales. La del plan vigente (o el elegido)
// va en amarillo. Sin `onElegir` es solo para mirar (Mi plan); con él, cada precio se elige con
// un clic (la ficha del super admin).

type Props = {
  grupos: GrupoPlan[];
  // Plan vigente.
  actual?: string | null;
  // Plan elegido y todavía sin guardar (solo cuando se puede elegir).
  elegido?: string | null;
  onElegir?: (planId: string) => void;
  // Lo que paga por el plan vigente, si no es el de lista (descuento, playa adicional).
  precioActual?: number | null;
  etiquetaActual?: string;
  // Solo una modalidad: la que tiene la empresa. Sin alquileres mensuales, ese precio no aparece.
  variante?: "base" | "alquileres";
  // Cómo se nombra lo que paga cuando no es el precio de lista.
  etiquetaPrecio?: (precio: string) => string;
  className?: string;
};

export function TarjetasPlan({
  grupos,
  actual = null,
  elegido = null,
  onElegir,
  precioActual = null,
  etiquetaActual = "Tu plan",
  variante,
  etiquetaPrecio = (precio) => `Paga ${precio}/mes (precio pactado)`,
  className,
}: Props) {
  const marcado = elegido ?? actual;
  const cambio = !!elegido && elegido !== actual;
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {grupos.map((g) => {
        const variantes = [
          { plan: variante === "alquileres" ? null : g.base, texto: "Solo tickets / rotación" },
          {
            plan: variante === "base" ? null : g.alquileres,
            texto: variante === "alquileres" ? "Con alquileres mensuales" : "+ Módulo alquileres mensuales",
          },
        ].filter((v) => v.plan);
        const destacado = variantes.some((v) => v.plan!.id === marcado);
        const tieneActual = variantes.some((v) => v.plan!.id === actual);
        return (
          <article
            key={g.tamano}
            className={cn(
              "relative flex flex-col rounded-[18px] border px-6 pb-5 pt-7 transition-colors",
              destacado
                ? "border-gm-yellow bg-gm-yellow text-gm-ink shadow-[7px_8px_0_#000]"
                : "border-[#39352c] bg-[#1b1915]",
            )}
          >
            {destacado && (
              <span className="absolute -top-[11px] left-6 rounded-full bg-gm-ink px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-gm-yellow">
                {cambio ? "Nuevo plan" : etiquetaActual}
              </span>
            )}
            {!destacado && cambio && tieneActual && (
              <span className="absolute -top-[11px] left-6 rounded-full border border-[#53493C] bg-[#1b1915] px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#C9BFB1]">
                Plan actual
              </span>
            )}
            <p className="font-display text-[26px] font-bold uppercase leading-none tracking-[-0.01em]">
              {g.nombre}
            </p>
            <p
              className={cn(
                "mt-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                destacado ? "text-[#6b5709]" : "text-[#8e8778]",
              )}
            >
              {g.rango}
            </p>
            <div className="mt-5 flex flex-1 flex-col gap-1.5">
              {variantes.map(({ plan, texto }) => {
                const p = plan!;
                const marcada = p.id === marcado;
                const esActual = p.id === actual;
                const contenido = (
                  <>
                    <span className="flex items-center justify-between gap-2 text-[12.5px] font-medium">
                      {texto}
                      {marcada && (
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full",
                            destacado ? "bg-gm-ink text-gm-yellow" : "bg-gm-yellow text-gm-ink",
                          )}
                        >
                          <Check aria-hidden className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block whitespace-nowrap font-mono text-[30px] font-bold leading-tight tracking-[-0.02em]">
                      {pesos(p.precioMensual)}
                      <span className="ml-0.5 text-[12px] font-medium opacity-65">/mes</span>
                    </span>
                    {esActual && precioActual !== null && precioActual !== p.precioMensual && (
                      <span className={cn("block text-[11.5px] font-semibold", destacado ? "text-[#4a3c06]" : "text-gm-yellow")}>
                        {etiquetaPrecio(pesos(precioActual))}
                      </span>
                    )}
                  </>
                );
                const clase = cn(
                  "block w-full rounded-xl px-3 py-2.5 text-left -mx-3 w-[calc(100%+1.5rem)]",
                  destacado && !marcada && "opacity-45",
                  marcada && (destacado ? "bg-gm-ink/[0.07]" : "bg-white/[0.04]"),
                );
                return onElegir ? (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => onElegir(p.id)}
                    className={cn(
                      clase,
                      "transition-[background-color,opacity] hover:opacity-100",
                      destacado ? "hover:bg-gm-ink/[0.07]" : "hover:bg-white/[0.05]",
                    )}
                  >
                    {contenido}
                  </button>
                ) : (
                  <div key={p.id} className={clase}>
                    {contenido}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
