'use client';

// Antes de cerrar el turno se repasan los autos que llevan más de 4 horas adentro: casi siempre son
// los que se fueron sin registrar la salida (o se cargó como entrada uno que se estaba yendo), y
// quedaban abiertos para siempre. Los de menos tiempo no se preguntan: es normal que sigan. Cada
// auto se marca «Sigue en la playa» o se cobra con «Se fue»; el turno se cierra cuando están todos.

import { Check, Wallet } from 'lucide-react';
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
// `sobrante`: el conteo dio de más; lo más común es un auto que pagó y se fue sin registrar la salida.
export function RepasoEstadias({ estadias, confirmadas, onConfirmar, onCobrar, disabled, todas = false, sobrante = 0 }: {
  estadias: EstadiaParaRepasar[];
  confirmadas: string[];
  onConfirmar: (ids: string[], sigue: boolean) => void;
  onCobrar?: (id: string) => void;
  disabled?: boolean;
  todas?: boolean;
  sobrante?: number;
}) {
  if (!estadias.length && !(sobrante > 0)) return null;
  const pendientes = estadias.filter((e) => !confirmadas.includes(e.id));
  return (
    <section aria-labelledby="repaso-estadias" className="space-y-3">
      {estadias.length > 0 && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 id="repaso-estadias" className="text-[15px] font-semibold leading-tight">
              {estadias.length === 1 ? 'Un auto lleva más de 4 h' : `${estadias.length} autos llevan más de 4 h`}
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {pendientes.length ? 'Marcá si sigue en la playa. Si se fue, cobralo antes de cerrar.' : 'Listo: quedaron todos revisados.'}
            </p>
          </div>
          {estadias.length > 1 && pendientes.length > 0 && (
            <button type="button" disabled={disabled} onClick={() => onConfirmar(pendientes.map((e) => e.id), true)}
              className="min-h-11 shrink-0 rounded-xl px-3 text-[12.5px] font-semibold text-violet-200 transition-colors hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:opacity-50">
              Siguen todos
            </button>
          )}
        </div>
      )}
      {sobrante > 0 && (
        <p role="alert" className="rounded-2xl bg-violet-400/[0.08] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-violet-100">
          <strong className="font-semibold">Contaste {formatImporte(sobrante)} de más.</strong>{' '}
          {estadias.length ? 'Puede ser un auto que pagó y se fue sin registrar la salida: si alguno de estos no está, cobralo y el sobrante se corrige.' : 'Revisá si algún auto pagó y se fue sin registrar la salida.'}
        </p>
      )}
      {estadias.length > 0 && (
        <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-0.5">
          {estadias.map((e) => {
            const sigue = confirmadas.includes(e.id);
            return (
              <li key={e.id} className={cn('rounded-2xl border bg-gm-surface-2/60 p-3 transition-colors', sigue ? 'border-emerald-400/35' : 'border-gm-line')}>
                <div className="flex items-center gap-3">
                  <PlateChip plate={e.patente || '—'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="gm-mono text-[14px] font-bold text-violet-200">{formatEstadia(e.minutos)}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      Entró {e.entryTime.slice(0, 5)}{todas && e.operador ? ` · ${e.operador}` : ''}
                      {e.anticipo > 0 && <><Wallet className="size-3 shrink-0 text-emerald-300" aria-hidden /><span className="text-emerald-300">anticipo {formatImporte(e.anticipo)}</span></>}
                    </p>
                  </div>
                </div>
                <div className={cn('mt-2.5 grid gap-2', onCobrar ? 'grid-cols-2' : 'grid-cols-1')}>
                  <button type="button" aria-pressed={sigue} disabled={disabled} onClick={() => onConfirmar([e.id], !sigue)}
                    className={cn('inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50',
                      sigue ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200' : 'border-gm-line-strong text-foreground hover:border-emerald-400/50')}>
                    {sigue && <Check className="size-4" strokeWidth={2.6} aria-hidden />}
                    Sigue en la playa
                  </button>
                  {onCobrar && (
                    <button type="button" disabled={disabled} onClick={() => onCobrar(e.id)}
                      className="min-h-11 rounded-xl border border-gm-line-strong text-[13px] font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50">
                      Se fue: cobrar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
