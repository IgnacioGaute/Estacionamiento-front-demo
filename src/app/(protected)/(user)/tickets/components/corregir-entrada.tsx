'use client';

// La entrada que se cargó tarde. Si la estadía que se va a cobrar tiene menos de 5 minutos, lo más
// probable es que el operador haya creído registrar la entrada al llegar el vehículo y la cargó
// recién ahora: se cobraría como la primera duración. Se pregunta en una línea discreta, sin
// trabar el cobro normal (un vehículo que de verdad estuvo 3 minutos se cobra igual).
//
// Sin startTransition a propósito: un error de red dentro de una transición iría a la pantalla de
// error de la app.

import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import type { CloseSummary } from '@/services/tickets.service';
import { Clock3 } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

export const MINUTOS_PARA_PREGUNTAR = 5;

// «13:15» → el momento de hoy a esa hora; si todavía no llegó (pasada la medianoche), es de ayer.
export function entradaDesdeHora(hora: string, ahora = dayjs().tz(TZ)): string | null {
  if (!/^\d{2}:\d{2}$/.test(hora)) return null;
  let momento = dayjs.tz(`${ahora.format('YYYY-MM-DD')} ${hora}`, 'YYYY-MM-DD HH:mm', TZ);
  if (!momento.isValid()) return null;
  if (momento.isAfter(ahora)) momento = momento.subtract(1, 'day');
  return momento.toISOString();
}

export function CorregirEntrada({ summary, onCorregido }: { summary: CloseSummary; onCorregido: (summary: CloseSummary) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [hora, setHora] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  if (summary.elapsedMinutes >= MINUTOS_PARA_PREGUNTAR) return null;
  const minutos = Math.max(0, summary.elapsedMinutes);

  const corregir = async (e: React.FormEvent) => {
    e.preventDefault();
    const entrada = entradaDesdeHora(hora);
    if (!entrada) { setError('Indicá la hora en que entró.'); return; }
    setEnviando(true);
    setError('');
    try {
      const result = await corregirEntradaAction(summary.registration.id, entrada);
      if (result.error || !result.summary) { setError(result.error || 'No se pudo corregir la entrada.'); return; }
      setAbierto(false);
      setHora('');
      onCorregido(result.summary);
    } catch {
      setError('No se pudo corregir la entrada. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const atajo = (horas: number) => { setHora(dayjs().tz(TZ).subtract(horas, 'hour').format('HH:mm')); setError(''); };
  // Corto para que la franja entre en una línea en el celular.
  const hace = minutos === 0 ? 'instantes' : `${minutos} min`;

  // Cerrada: una franja discreta, con la pregunta a la derecha como botón chico.
  if (!abierto)
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/[0.03] py-1.5 pl-2.5 pr-1.5">
        <Clock3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted-foreground">Entró hace {hace}</p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="h-8 shrink-0 whitespace-nowrap rounded-full border border-gm-yellow/30 px-3 text-[12.5px] font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
        >
          ¿Entró antes?
        </button>
      </div>
    );

  // Abierta: todo apilado, que en el celular no hay ancho para una fila. Los atajos resuelven lo
  // común sin abrir el reloj del teléfono; el campo queda para cualquier otra hora.
  return (
    <form onSubmit={corregir} className="mt-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
      <label htmlFor="hora-real-entrada" className="block text-[13px] font-semibold text-foreground">
        ¿Desde qué hora está?
      </label>
      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
        Si se olvidaron de registrar la entrada, se cobra desde esa hora.
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((horas) => (
          <button
            key={horas}
            type="button"
            onClick={() => atajo(horas)}
            disabled={enviando}
            className="h-9 whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-[12.5px] font-semibold text-foreground transition-colors hover:border-gm-yellow/40 disabled:opacity-50"
          >
            Hace {horas} h
          </button>
        ))}
      </div>
      <input
        ref={campo}
        id="hora-real-entrada"
        type="time"
        value={hora}
        onChange={(e) => { setHora(e.target.value); setError(''); }}
        disabled={enviando}
        aria-describedby="hora-real-ayuda"
        className="gm-mono mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#16130F] px-3 text-center text-lg text-foreground focus-visible:border-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow/20"
      />
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-gm-orange">{error}</p>
      ) : (
        <p id="hora-real-ayuda" className="mt-1.5 text-[11.5px] text-muted-foreground/80">Queda registrado quién corrigió la hora.</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setAbierto(false); setError(''); setHora(''); }}
          disabled={enviando}
          className="h-11 whitespace-nowrap rounded-xl border border-white/[0.08] text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando || !hora}
          className="h-11 whitespace-nowrap rounded-xl bg-gm-yellow text-[13.5px] font-bold text-gm-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
        >
          {enviando ? 'Recalculando…' : 'Recalcular'}
        </button>
      </div>
    </form>
  );
}
