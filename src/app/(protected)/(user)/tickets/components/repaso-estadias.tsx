'use client';

// Antes de cerrar el turno, el operador repasa las entradas que registró y siguen abiertas. Una
// entrada que nadie cierra (el auto se fue sin registrar la salida, o se cargó como entrada un auto
// que se estaba yendo) quedaba abierta para siempre: así se nota el mismo día, cuando todavía se
// sabe qué pasó.

import { Wallet } from 'lucide-react';
import { PlateChip } from '@/components/plate-chip';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import type { EstadiaAbiertaTurno } from '@/types/turno.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { minutesSinceEntry } from '@/utils/ticket-registration.utils';
import { formatEstadia } from '@/utils/estadia';

// Desde cuántas horas adentro se resalta: lo normal es que un auto por hora no pase de ahí.
export const HORAS_PARA_REVISAR = 4;

export function RepasoEstadias({ estadias, ahora, confirmado, onConfirmar, onCobrar, disabled }: {
  estadias: EstadiaAbiertaTurno[];
  ahora: number;
  confirmado: boolean;
  onConfirmar: (valor: boolean) => void;
  onCobrar?: (id: string) => void;
  disabled?: boolean;
}) {
  if (!estadias.length) return null;
  const filas = estadias.map((e) => ({ ...e, minutos: minutesSinceEntry(e as unknown as TicketRegistration, ahora) ?? 0 }));
  const largas = filas.filter((f) => f.minutos >= HORAS_PARA_REVISAR * 60).length;
  return (
    <section aria-labelledby="repaso-estadias" className="overflow-hidden rounded-2xl border border-gm-line">
      <div className="space-y-1 px-4 pt-3.5">
        <h3 id="repaso-estadias" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Vehículos que registraste y siguen adentro · {filas.length}
        </h3>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Revisá que sigan en la playa.{largas ? ` ${largas === 1 ? 'Uno lleva' : `${largas} llevan`} más de ${HORAS_PARA_REVISAR} horas.` : ''} Si alguno ya se fue, registrá su salida antes de cerrar.
        </p>
      </div>
      <ul className="mt-2 max-h-[260px] divide-y divide-gm-line overflow-y-auto border-t border-gm-line">
        {filas.map((f) => {
          const larga = f.minutos >= HORAS_PARA_REVISAR * 60;
          return (
            <li key={f.id} className={cn('flex min-h-[58px] items-center gap-3 px-4 py-2', larga && 'bg-[#F0714A]/[0.07]')}>
              <PlateChip plate={f.patente || '—'} size="sm" />
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[13px] font-semibold', larga ? 'text-[#F0714A]' : 'text-foreground')}>
                  {formatEstadia(f.minutos)} adentro
                </span>
                <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  Entró {f.entryTime.slice(0, 5)}
                  {f.anticipo > 0 && <><Wallet className="size-3 shrink-0 text-emerald-300" aria-hidden /><span className="text-emerald-300">anticipo {formatImporte(f.anticipo)}</span></>}
                </span>
              </span>
              {onCobrar && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onCobrar(f.id)}
                  className="min-h-11 shrink-0 rounded-xl border border-gm-line-strong px-3 text-[12.5px] font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50"
                >
                  Se fue: cobrar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-gm-line bg-gm-surface-2/50 px-4 py-3 text-[13px] font-semibold">
        <input type="checkbox" checked={confirmado} disabled={disabled} onChange={(e) => onConfirmar(e.target.checked)} className="size-5 shrink-0 accent-[hsl(var(--gm-yellow))]" />
        {filas.length === 1 ? 'Confirmo que este vehículo sigue en la playa' : `Confirmo que estos ${filas.length} vehículos siguen en la playa`}
      </label>
    </section>
  );
}
