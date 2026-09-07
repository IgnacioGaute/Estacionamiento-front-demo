'use client';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HourlyActivityResponse } from '@/types/dashboard.type';
import { MonoTooltip } from './mono-tooltip';
import { HourlyActivityDatePicker } from './hourly-activity-date-picker';
import { MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';

const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;
// El backend guarda el horario con segundos (HH:MM:SS) — acá se corta a HH:MM para mostrar,
// que es la precisión que tiene sentido mostrarle al usuario.
const formatExactTime = (time: string) => time.slice(0, 5);

dayjs.extend(utc);
dayjs.extend(timezone);

export function HourlyActivityAreaChart({ data, date }: { data: HourlyActivityResponse | null; date: string }) {
  const hours = data?.hours ?? [];
  const series = hours.map((h) => ({ ...h, label: formatHour(h.hour) }));
  const totalMovements = hours.reduce((sum, h) => sum + h.count, 0);
  const peakEntry = data?.peakEntry ?? null;
  const peakExit = data?.peakExit ?? null;

  return (
    <div className={MONO_CARD}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Actividad por hora</span>
            <HourlyActivityDatePicker date={date} />
          </div>
          <div className={MONO_STAT}>
            {totalMovements} <span className="text-xs font-normal text-muted-foreground">entradas y salidas</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-gm-yellow" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-gm-orange" />
            Salidas
          </span>
        </div>
      </div>

      <div className={`${MONO_STAGE} touch-pan-y`}>
        {totalMovements === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-[13px] text-muted-foreground">
            Todavía no hay movimientos registrados {date === dayjs().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD') ? 'hoy' : 'ese día'}.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={series} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="hourlyEntriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gm-yellow))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--gm-yellow))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hourlyExitsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gm-orange))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--gm-orange))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--gm-line))" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={2}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<MonoTooltip indicator="dot" formatter={(v) => `${v}`} />} />

              <Area
                type="monotone"
                dataKey="entries"
                name="Entradas"
                stroke="hsl(var(--gm-yellow))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#hourlyEntriesFill)"
                dot={false}
                activeDot={{ r: 5, fill: 'hsl(var(--gm-yellow))', stroke: 'hsl(var(--gm-yellow-deep))', strokeWidth: 2 }}
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="exits"
                name="Salidas"
                stroke="hsl(var(--gm-orange))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#hourlyExitsFill)"
                dot={false}
                activeDot={{ r: 5, fill: 'hsl(var(--gm-orange))', stroke: 'hsl(var(--gm-orange-deep))', strokeWidth: 2 }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">
          {peakEntry ? `Pico entradas ${formatExactTime(peakEntry.time)} · ${peakEntry.count}` : 'Sin entradas todavía'}
        </span>
        <span className="font-medium text-foreground">
          {peakExit ? `Pico salidas ${formatExactTime(peakExit.time)} · ${peakExit.count}` : 'Sin salidas todavía'}
        </span>
      </div>
    </div>
  );
}
