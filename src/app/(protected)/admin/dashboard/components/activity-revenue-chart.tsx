'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { RevenueSummaryResponse } from '@/types/dashboard.type';
import { ars } from '../format';
import { MONO_BADGE, MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';

dayjs.extend(utc);
dayjs.extend(timezone);

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKS = 20;
const DAYS = WEEKS * 7;
// Flechas: izquierda/derecha cambian de semana (columna), arriba/abajo de día.
const PASOS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

type Cell = { date: string; total: number; level: 0 | 1 | 2 | 3 | 4 };

const opacityForLevel = (lvl: Cell['level']) => (lvl === 0 ? 0.08 : lvl === 1 ? 0.3 : lvl === 2 ? 0.55 : lvl === 3 ? 0.8 : 1);

export function ActivityRevenueChart({ data }: { data: RevenueSummaryResponse | null }) {
  const [hovered, setHovered] = useState<Cell | null>(null);
  // Un solo punto de foco para los 140 días (roving tabindex): con Tab se entra al mapa y con las
  // flechas se recorre. Antes eran div con eventos de puntero y con teclado no se leía ningún importe.
  const [activo, setActivo] = useState(DAYS - 1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const cells = useMemo<Cell[]>(() => {
    const totalsByDate = new Map((data?.series ?? []).map((r) => [r.bucket, r.total]));
    const today = dayjs().tz('America/Argentina/Buenos_Aires').startOf('day');
    const days = Array.from({ length: DAYS }, (_, i) => {
      const date = today.subtract(DAYS - 1 - i, 'day').format('YYYY-MM-DD');
      return { date, total: totalsByDate.get(date) ?? 0 };
    });

    const max = Math.max(1, ...days.map((d) => d.total));
    return days.map((d) => ({
      ...d,
      level: d.total === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((d.total / max) * 4))) as 1 | 2 | 3 | 4),
    }));
  }, [data]);

  const weeks = useMemo(() => {
    const w: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }, [cells]);

  const monthLabels = useMemo(() => {
    const seen: string[] = [];
    for (const c of cells) {
      const m = MONTH_NAMES[Number(c.date.slice(5, 7)) - 1];
      if (seen[seen.length - 1] !== m) seen.push(m);
    }
    return seen;
  }, [cells]);

  const total = cells.reduce((sum, c) => sum + c.total, 0);
  const diasConCaja = cells.filter((c) => c.total > 0).length;
  const etiqueta = (c: Cell) => `${dayjs(c.date).format('DD/MM')}: ${c.total > 0 ? ars(c.total) : 'sin caja'}`;

  const mover = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = PASOS[e.key];
    const destino = e.key === 'Home' ? 0 : e.key === 'End' ? DAYS - 1 : paso === undefined ? null : activo + paso;
    if (destino === null) return;
    e.preventDefault();
    const siguiente = Math.max(0, Math.min(DAYS - 1, destino));
    setActivo(siguiente);
    setHovered(cells[siguiente]);
    refs.current[siguiente]?.focus();
  };

  return (
    <div className={MONO_CARD}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Recaudación</span>
            <span className={MONO_BADGE}>Últimos 140 días</span>
          </div>
          <div className={MONO_STAT}>{ars(total)}</div>
        </div>
      </div>

      <div className={`${MONO_STAGE} flex flex-col items-center justify-center`}>
        {/* En mobile las 20 semanas no entran en el ancho de pantalla — se deja scrollear
            horizontalmente en vez de achicar tanto los cuadros que dejen de tocarse bien. */}
        <div className="w-full max-w-[720px] overflow-x-auto">
          <div className="mb-2 flex w-max min-w-full items-center justify-between gap-[5px] px-1" aria-hidden>
            {monthLabels.map((m, idx) => (
              <span key={idx} className="flex-1 text-center text-[11px] font-mono text-muted-foreground">
                {m}
              </span>
            ))}
          </div>

          <div
            role="group"
            aria-label="Recaudación por día, últimos 140 días. Usá las flechas para recorrer los días."
            className="flex w-max min-w-full items-center justify-center gap-[5px] py-1"
            onPointerLeave={() => setHovered(null)}
            onKeyDown={mover}
          >
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex shrink-0 flex-col items-center gap-[5px]">
                {week.map((day, dIdx) => {
                  const indice = wIdx * 7 + dIdx;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      ref={(el) => { refs.current[indice] = el; }}
                      tabIndex={indice === activo ? 0 : -1}
                      aria-label={etiqueta(day)}
                      onPointerEnter={() => setHovered(day)}
                      onFocus={() => { setActivo(indice); setHovered(day); }}
                      onClick={() => setHovered(day)}
                      className="h-[18px] w-[18px] min-h-[18px] min-w-[18px] cursor-pointer rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-[1.35] focus-visible:z-10 focus-visible:scale-[1.35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:h-[22px] sm:w-[22px] sm:min-h-[22px] sm:min-w-[22px]"
                      style={{ backgroundColor: 'hsl(var(--gm-yellow))', opacity: opacityForLevel(day.level) }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex w-full max-w-[720px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1">
          <span aria-live="polite" className="text-[11px] font-mono text-foreground">
            {hovered ? etiqueta(hovered) : <span className="text-muted-foreground">Tocá un día para ver el importe</span>}
          </span>
          {/* Escala: sin ella el tono del amarillo no decía cuánto es mucho. */}
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground" aria-hidden>
            Menos
            {([0, 1, 2, 3, 4] as const).map((lvl) => (
              <span key={lvl} className="size-3 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--gm-yellow))', opacity: opacityForLevel(lvl) }} />
            ))}
            Más
          </span>
        </div>
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">Días con caja</span>
        <span className="font-medium text-foreground">{diasConCaja} de {DAYS}</span>
      </div>
    </div>
  );
}
