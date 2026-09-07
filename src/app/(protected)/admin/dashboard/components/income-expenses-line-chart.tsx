'use client';

import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OtherPaymentsSummaryResponse } from '@/types/dashboard.type';
import { ars } from '../format';
import { MonoTooltip } from './mono-tooltip';
import { MONO_BADGE, MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';

export function IncomeExpensesLineChart({ data }: { data: OtherPaymentsSummaryResponse | null }) {
  const [activeSeries, setActiveSeries] = useState<'all' | 'value'>('all');
  const series = data?.series ?? [];
  const latest = series[series.length - 1];
  const peak = series.reduce((max, r) => Math.max(max, r.ingresos), 0);

  return (
    <div className={MONO_CARD}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Ingresos vs egresos</span>
            <span className={MONO_BADGE}>Línea</span>
          </div>
          <div className={MONO_STAT}>{ars(latest?.ingresos ?? 0)}</div>
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-border bg-gm-surface p-0.5">
          {(['all', 'value'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSeries(s)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-all ${
                activeSeries === s
                  ? 'bg-gm-yellow font-semibold text-gm-ink shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Ambas' : 'Ingresos'}
            </button>
          ))}
        </div>
      </div>

      <div className={`${MONO_STAGE} touch-pan-y`}>
        {series.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-[13px] text-muted-foreground">
            Sin datos para el período seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={series} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--gm-line))" />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<MonoTooltip indicator="dot" formatter={(v) => ars(v)} />} />

              {activeSeries === 'all' && (
                <Line
                  type="monotone"
                  dataKey="egresos"
                  name="Egresos"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 4"
                  dot={false}
                  animationDuration={900}
                />
              )}

              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="hsl(var(--gm-yellow))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: 'hsl(var(--gm-yellow))', stroke: 'hsl(var(--gm-surface-2))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--gm-yellow))', stroke: 'hsl(var(--gm-yellow-deep))', strokeWidth: 2 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">Puntas redondeadas</span>
        <span className="font-medium text-foreground">Pico {ars(peak)}</span>
      </div>
    </div>
  );
}
