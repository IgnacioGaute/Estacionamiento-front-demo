'use client';

// La lista de tarifas para elegir la que le corresponde a un auto, sin la hora exacta: «Se fue
// antes» y el cobro sin entrada. Si la elegida es la última y el vehículo tiene una tarifa que se
// repite («cada»), aparece un contador para sumar las veces; el importe de la última pasa a ser el
// total con esas repeticiones.

import { Check, Minus, Plus } from 'lucide-react';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';

export type TarifaElegible = { clave: string; etiqueta: string; detalle: string; precio: number };
export type CadaElegible = {
  etiqueta: string;
  // Cuántas repeticiones se pueden sumar (en «Se fue antes», las que caben antes de ahora).
  max: number;
  cantidad: number;
  onCantidad: (cantidad: number) => void;
  // El total de la última tarifa con `n` repeticiones.
  precioCon: (n: number) => number;
};

export function TarifasElegibles({ id, opciones, elegida, onElegir, cada, disabled }: {
  id: string;
  opciones: TarifaElegible[];
  elegida: string | null;
  onElegir: (clave: string) => void;
  cada?: CadaElegible | null;
  disabled?: boolean;
}) {
  const ultima = opciones[opciones.length - 1];
  return (
    <div role="radiogroup" aria-labelledby={id} className="grid gap-2">
      {opciones.map((o) => {
        const marcada = o.clave === elegida;
        const conCada = !!cada && cada.max > 0 && o.clave === ultima?.clave;
        const precio = conCada && cada!.cantidad > 0 ? cada!.precioCon(cada!.cantidad) : o.precio;
        return (
          <div key={o.clave} className={cn('overflow-hidden rounded-xl border-[1.5px] transition-colors',
            marcada ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
            <button type="button" role="radio" aria-checked={marcada} disabled={disabled} onClick={() => onElegir(o.clave)}
              className="flex min-h-[54px] w-full items-center gap-3 px-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow disabled:opacity-50">
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]', marcada ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-gm-line-strong')} aria-hidden>
                {marcada && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">
                  {o.etiqueta}{conCada && cada!.cantidad > 0 && <span className="text-gm-yellow"> + {cada!.cantidad} × {cada!.etiqueta}</span>}
                </span>
                <span className="block text-[12px] text-muted-foreground">{o.detalle}</span>
              </span>
              <span className="gm-mono shrink-0 text-[16px] font-bold">{formatImporte(precio)}</span>
            </button>
            {/* El contador vive dentro de la última tarifa y solo con ella elegida. */}
            {conCada && marcada && (
              <div className="flex items-center justify-between gap-3 border-t border-gm-yellow/25 px-3.5 py-2.5">
                <span className="min-w-0 text-[12.5px] text-[#D9D1C3]">
                  ¿Cuántas veces <strong className="font-semibold">{cada!.etiqueta}</strong>?
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label={`Una vez menos ${cada!.etiqueta}`} disabled={disabled || cada!.cantidad <= 0}
                    onClick={() => cada!.onCantidad(cada!.cantidad - 1)}
                    className="grid size-9 place-items-center rounded-lg border border-gm-line-strong bg-gm-surface-2 transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-40">
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span aria-live="polite" className="gm-mono w-7 text-center text-[17px] font-bold">{cada!.cantidad}</span>
                  <button type="button" aria-label={`Una vez más ${cada!.etiqueta}`} disabled={disabled || cada!.cantidad >= cada!.max}
                    onClick={() => cada!.onCantidad(cada!.cantidad + 1)}
                    className="grid size-9 place-items-center rounded-lg border border-gm-line-strong bg-gm-surface-2 transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-40">
                    <Plus className="size-4" aria-hidden />
                  </button>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
