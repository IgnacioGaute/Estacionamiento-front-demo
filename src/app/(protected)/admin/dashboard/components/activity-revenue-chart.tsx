'use client';

import { useMemo, useState } from 'react';
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

type Cell = { date: string; total: number; level: 0 | 1 | 2 | 3 | 4 };

export function ActivityRevenueChart({ data }: { data: RevenueSummaryResponse | null }) {
  const [hovered, setHovered] = useState<Cell | null>(null);

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

  const opacityForLevel = (lvl: Cell['level']) => (lvl === 0 ? 0.08 : lvl === 1 ? 0.3 : lvl === 2 ? 0.55 : lvl === 3 ? 0.8 : 1);

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
          <div className="mb-2 flex w-max min-w-full items-center justify-between gap-[5px] px-1">
            {monthLabels.map((m, idx) => (
              <span key={idx} className="flex-1 text-center text-[11px] font-mono text-muted-foreground">
                {m}
              </span>
            ))}
          </div>

          <div className="flex w-max min-w-full items-center justify-center gap-[5px] py-1" onPointerLeave={() => setHovered(null)}>
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex shrink-0 flex-col items-center gap-[5px]">
                {week.map((day, dIdx) => (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    onPointerEnter={() => setHovered(day)}
                    onPointerDown={() => setHovered(day)}
                    className="h-[18px] w-[18px] min-h-[18px] min-w-[18px] cursor-pointer rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-[1.35] sm:h-[22px] sm:w-[22px] sm:min-h-[22px] sm:min-w-[22px]"
                    style={{ backgroundColor: 'hsl(var(--gm-yellow))', opacity: opacityForLevel(day.level) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex h-5 items-center justify-center">
          {hovered ? (
            <span className="text-[10px] font-mono text-foreground">
              {hovered.total > 0 ? ars(hovered.total) : 'Sin caja'} el {dayjs(hovered.date).format('DD/MM')}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">Pasá el mouse por los cuadros</span>
          )}
        </div>
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">20 semanas × 7 días</span>
        <span className="font-medium text-foreground">Planillas de caja</span>
      </div>
    </div>
  );
}
