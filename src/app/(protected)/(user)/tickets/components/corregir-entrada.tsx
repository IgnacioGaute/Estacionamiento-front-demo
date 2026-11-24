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
import type { ResumenSalida } from '@/services/tickets.service';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEstadia } from '@/utils/estadia';

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

// Lo que se tipea en el campo de hora → «HH:MM» (24 h). Se escriben solo números y los dos puntos
// se ponen solos: «1315» queda «13:15». El campo nativo mostraba «--:-- --» con AM/PM según el
// idioma del navegador y el reloj del sistema, ajeno al resto de la pantalla.
export function formatoHora(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
const horaValida = (hora: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

export function CorregirEntrada({ summary, onCorregido }: { summary: Pick<ResumenSalida, 'registration' | 'elapsedMinutes'>; onCorregido: (summary: ResumenSalida) => void }) {
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

  const valida = horaValida(hora);
  const ahora = dayjs().tz(TZ);
  const entradaElegida = valida ? entradaDesdeHora(hora, ahora) : null;
  // Lo que falta para recalcular, en el botón y en rojo, como en el resto de los cobros.
  const falta = !hora ? 'Elegí la hora' : hora.length < 5 ? 'Completá HH:MM' : !valida ? 'Esa hora no existe' : null;

  const corregir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valida) return;
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

  const horaDeAtajo = (horas: number) => ahora.subtract(horas, 'hour').format('HH:mm');
  const atajo = (horas: number) => { setHora(horaDeAtajo(horas)); setError(''); };
  // Corto para que la franja entre en una línea en el celular.
  const hace = minutos === 0 ? 'instantes' : `${minutos} min`;

  // Cerrada: una franja discreta, con la pregunta a la derecha como botón chico.
  if (!abierto)
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/[0.03] py-1.5 pl-2.5 pr-1.5">
        <Clock3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">Entró hace {hace}</p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="h-8 shrink-0 whitespace-nowrap rounded-full border border-gm-yellow/30 px-3 text-[13px] font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
        >
          ¿Entró antes?
        </button>
      </div>
    );

  // Abierta: todo apilado, que en el celular no hay ancho para una fila. Los atajos resuelven lo
  // común y muestran a qué hora quedan; el campo queda para cualquier otra hora. Abajo se confirma
  // desde cuándo se va a cobrar, antes de recalcular.
  const minutosDesde = entradaElegida ? ahora.diff(dayjs(entradaElegida), 'minute') : null;
  const deAyer = entradaElegida ? dayjs(entradaElegida).tz(TZ).format('YYYY-MM-DD') !== ahora.format('YYYY-MM-DD') : false;
  return (
    <form onSubmit={corregir} noValidate className="mt-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
      <label htmlFor="hora-real-entrada" className="block text-[13px] font-semibold text-foreground">
        ¿Desde qué hora está?
      </label>
      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
        Si se olvidaron de registrar la entrada, se cobra desde esa hora.
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((horas) => {
          const valor = horaDeAtajo(horas);
          const elegido = hora === valor;
          return (
            <button
              key={horas}
              type="button"
              onClick={() => atajo(horas)}
              disabled={enviando}
              aria-pressed={elegido}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center rounded-[12px] border px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
                elegido ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-white/[0.08] bg-white/[0.03] hover:border-gm-yellow/40',
              )}
            >
              <span className="whitespace-nowrap text-[13px] font-semibold text-foreground">Hace {horas} h</span>
              <span className={cn('gm-mono text-[12px] tabular-nums', elegido ? 'text-gm-yellow' : 'text-muted-foreground')}>{valor}</span>
            </button>
          );
        })}
      </div>
      <div className={cn(
        'mt-2 flex h-14 items-center gap-3 rounded-xl border bg-background px-3 transition-colors focus-within:border-gm-yellow focus-within:ring-2 focus-within:ring-gm-yellow/20',
        hora && !valida ? 'border-gm-orange/60' : 'border-white/10',
      )}>
        <Clock3 className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={campo}
          id="hora-real-entrada"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="HH:MM"
          maxLength={5}
          value={hora}
          onChange={(e) => { setHora(formatoHora(e.target.value)); setError(''); }}
          disabled={enviando}
          aria-describedby="hora-real-ayuda"
          aria-invalid={!!hora && !valida}
          className="gm-mono min-w-0 flex-1 bg-transparent text-center text-[26px] font-bold tracking-[0.08em] text-foreground outline-none placeholder:text-[20px] placeholder:font-semibold placeholder:tracking-[0.12em] placeholder:text-gm-texto-tenue"
        />
        <span className="w-[18px] shrink-0" aria-hidden />
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-gm-orange">{error}</p>
      ) : (
        <p id="hora-real-ayuda" aria-live="polite" className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
          {entradaElegida && minutosDesde !== null && minutosDesde >= 0
            ? <>Se cobra desde {deAyer ? 'ayer a ' : ''}las <strong className="gm-mono text-foreground">{hora}</strong> · estuvo <strong className="text-foreground">{formatEstadia(minutosDesde)}</strong>. Queda registrado quién corrigió la hora.</>
            : 'Hora de 24 h. Queda registrado quién corrigió la hora.'}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
        <button
          type="button"
          onClick={() => { setAbierto(false); setError(''); setHora(''); }}
          disabled={enviando}
          className="min-h-12 whitespace-nowrap rounded-xl border border-white/[0.08] text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando || !valida}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl bg-gm-yellow px-2 py-1.5 text-gm-ink transition-[filter,background-color] hover:brightness-105 disabled:bg-gm-surface-3 disabled:text-muted-foreground"
        >
          <span className="text-[14px] font-bold">{enviando ? 'Recalculando…' : 'Recalcular'}</span>
          {falta && !enviando && (
            <span className="gm-mono inline-flex items-center gap-1.5 text-[12px] font-bold text-gm-falta"><span aria-hidden className="gm-punto-falta" />{falta}</span>
          )}
        </button>
      </div>
    </form>
  );
}
