'use client';

// Antes de cerrar el turno se repasan los autos que llevan más de 4 horas adentro: casi siempre son
// los que se fueron sin registrar la salida (o se cargó como entrada uno que se estaba yendo), y
// quedaban abiertos para siempre. Los de menos tiempo no se preguntan: es normal que sigan. Cada
// auto se marca «Sigue en la playa» o se cobra con «Se fue»; el turno se cierra cuando están todos.
// Es el primer paso del cierre: una fila por auto y sin lista con scroll propio (antes eran tarjetas
// de dos botones grandes dentro de una caja de 340 px que había que desplazar aparte).

import { Check } from 'lucide-react';
import { PlateChip } from '@/components/plate-chip';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import type { EstadiaAbiertaTurno } from '@/types/turno.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { minutesSinceEntry } from '@/utils/ticket-registration.utils';
import { formatEstadia } from '@/utils/estadia';

// Desde cuántas horas adentro se pregunta: lo normal es que un auto por hora no pase de ahí.
export const HORAS_PARA_REVISAR = 4;

export type EstadiaParaRepasar = EstadiaAbiertaTurno & { minutos: number };

// Las que hay que repasar: más de HORAS_PARA_REVISAR adentro, la más larga primero. Fecha
// «YYYY-MM-DD» y hora «HH:mm:ss» aunque lleguen como fecha ISO completa (un backend anterior las
// mandaba así y el cálculo de la hora rompía la pantalla de cierre).
export function paraRepasar(estadias: EstadiaAbiertaTurno[], ahora: number): EstadiaParaRepasar[] {
  return estadias
    .map((e) => {
      const entryDay = String(e.entryDay ?? '').slice(0, 10);
      const hora = String(e.entryTime ?? '').slice(0, 8);
      const entryTime = /^\d{2}:\d{2}$/.test(hora) ? `${hora}:00` : hora;
      const valida = /^\d{4}-\d{2}-\d{2}$/.test(entryDay) && /^\d{2}:\d{2}:\d{2}$/.test(entryTime);
      return { ...e, entryDay, entryTime, minutos: valida ? minutesSinceEntry({ entryDay, entryTime } as unknown as TicketRegistration, ahora) ?? 0 : 0 };
    })
    .filter((e) => e.minutos >= HORAS_PARA_REVISAR * 60)
    .sort((a, b) => b.minutos - a.minutos);
}

// `todas`: de toda la playa (quien cierra la caja), con quién registró cada una.
export function RepasoEstadias({ estadias, confirmadas, onConfirmar, onCobrar, disabled, todas = false }: {
  estadias: EstadiaParaRepasar[];
  confirmadas: string[];
  onConfirmar: (ids: string[], sigue: boolean) => void;
  onCobrar?: (id: string) => void;
  disabled?: boolean;
  todas?: boolean;
}) {
  if (!estadias.length) return null;
  const pendientes = estadias.filter((e) => !confirmadas.includes(e.id));
  const una = estadias.length === 1;
  return (
    <section aria-labelledby="repaso-estadias" className="space-y-4">
      <div>
        <h3 id="repaso-estadias" className="font-display text-[26px] font-bold leading-tight">{una ? '¿Sigue en la playa?' : '¿Siguen en la playa?'}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {una ? 'Un auto lleva más de 4 h. Si se fue, cobralo.' : `${estadias.length} autos llevan más de 4 h. Si alguno se fue, cobralo.`}
        </p>
      </div>
      <ul className="divide-y divide-gm-line border-y border-gm-line">
        {estadias.map((e) => {
          const sigue = confirmadas.includes(e.id);
          const patente = e.patente || 'Sin patente';
          const detalle = [todas && e.operador ? e.operador : null, e.anticipo > 0 ? `anticipo ${formatImporte(e.anticipo)}` : null].filter(Boolean).join(' · ');
          return (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <PlateChip plate={e.patente || '—'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="gm-mono text-[14px] font-bold text-violet-200">{formatEstadia(e.minutos)}</p>
                {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" aria-pressed={sigue} aria-label={`${patente}: sigue en la playa`} disabled={disabled} onClick={() => onConfirmar([e.id], !sigue)}
                  className={cn('grid h-11 w-12 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-ok disabled:opacity-50',
                    sigue ? 'border-gm-ok/60 bg-gm-ok/15 text-gm-ok' : 'border-gm-line-strong text-muted-foreground hover:border-gm-ok/50 hover:text-gm-ok')}>
                  <Check className="size-[18px]" strokeWidth={2.8} aria-hidden />
                </button>
                {onCobrar && (
                  <button type="button" aria-label={`${patente}: se fue, cobrar`} disabled={disabled} onClick={() => onCobrar(e.id)}
                    className="h-11 rounded-xl border border-gm-line-strong px-3 text-[13px] font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50">
                    Se fue
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {estadias.length > 1 && pendientes.length > 0 && (
        <button type="button" disabled={disabled} onClick={() => onConfirmar(pendientes.map((e) => e.id), true)}
          className="min-h-11 rounded-full border border-gm-line-strong px-4 text-sm font-semibold transition-colors hover:border-gm-ok/50 hover:text-gm-ok focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-ok disabled:opacity-50">
          Siguen todos
        </button>
      )}
    </section>
  );
}
