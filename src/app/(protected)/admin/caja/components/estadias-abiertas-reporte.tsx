// Las estadías por hora que siguen abiertas, agrupadas por quién registró la entrada. Sirve para
// notar el mismo día las que nadie cerró: si se concentran en un operador o en un horario, es la
// forma de trabajar (autos que se fueron sin registrar la salida, o entradas cargadas cuando el auto
// se iba), no una falla del sistema.

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PlateChip } from '@/components/plate-chip';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { minutesSinceEntry } from '@/utils/ticket-registration.utils';
import { formatEstadia } from '@/utils/estadia';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const HORAS_PARA_REVISAR = 4;

type Fila = { r: TicketRegistration; minutos: number; larga: boolean };

export function agruparEstadiasAbiertas(registros: TicketRegistration[], ahora: number) {
  const grupos = new Map<string, Fila[]>();
  for (const r of registros) {
    if (r.departureTime || r.departureDay) continue;
    const minutos = minutesSinceEntry(r, ahora) ?? 0;
    const operador = r.entryOperatorName?.trim() || 'Sin operador registrado';
    grupos.set(operador, [...(grupos.get(operador) ?? []), { r, minutos, larga: minutos >= HORAS_PARA_REVISAR * 60 }]);
  }
  return [...grupos.entries()]
    .map(([operador, filas]) => ({ operador, filas: filas.sort((a, b) => b.minutos - a.minutos), largas: filas.filter((f) => f.larga).length }))
    .sort((a, b) => b.largas - a.largas || b.filas.length - a.filas.length);
}

export function EstadiasAbiertasReporte({ registros, ahora }: { registros: TicketRegistration[]; ahora: number }) {
  const grupos = agruparEstadiasAbiertas(registros, ahora);
  const total = grupos.reduce((n, g) => n + g.filas.length, 0);
  const largas = grupos.reduce((n, g) => n + g.largas, 0);
  const hoy = dayjs(ahora).tz(TZ).format('YYYY-MM-DD');
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Estadías abiertas por operador</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Quién registró cada entrada que sigue abierta. Las de más de {HORAS_PARA_REVISAR} horas se resaltan: si se juntan en un operador o un horario, revisalas con él el mismo día.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{total}</strong> abiertas · <strong className={cn(largas ? 'text-[#F0714A]' : 'text-foreground')}>{largas}</strong> de más de {HORAS_PARA_REVISAR} h
        </p>
      </div>
      {!grupos.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay estadías por hora abiertas.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grupos.map((g) => (
            <article key={g.operador} className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h3 className="truncate font-semibold">{g.operador}</h3>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {g.filas.length} abiertas{g.largas ? <> · <strong className="text-[#F0714A]">{g.largas} de más de {HORAS_PARA_REVISAR} h</strong></> : null}
                </span>
              </header>
              <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
                {g.filas.map(({ r, minutos, larga }) => (
                  <li key={r.id} className={cn('flex min-h-[56px] items-center gap-3 px-4 py-2', larga && 'bg-[#F0714A]/[0.07]')}>
                    <PlateChip plate={r.licensePlateOriginal || r.codeBarTicket || '—'} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] font-semibold', larga && 'text-[#F0714A]')}>{formatEstadia(minutos)} adentro</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        Entró {r.entryDay !== hoy ? `${dayjs(r.entryDay).format('DD/MM')} ` : ''}{r.entryTime?.slice(0, 5)}
                        {Number(r.advancePaidAmount ?? 0) > 0 && <><Wallet className="size-3 shrink-0 text-emerald-300" aria-hidden /><span className="text-emerald-300">anticipo {formatImporte(Number(r.advancePaidAmount))}</span></>}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Para cerrarlas, registrá la salida desde <Link href="/tickets" className="font-semibold text-gm-yellow hover:underline">Entradas y salidas</Link>. Una entrada cargada por error se elimina desde su cobro, si no tiene pagos.
      </p>
    </section>
  );
}
