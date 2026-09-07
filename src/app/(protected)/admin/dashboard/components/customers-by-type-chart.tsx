'use client';

import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CustomersSummaryResponse } from '@/types/dashboard.type';
import { MonoTooltip } from './mono-tooltip';
import { MONO_BADGE, MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';

const TYPE_LABEL: Record<string, string> = {
  OWNER: 'Propietarios',
  RENTER: 'Inquilinos',
  PRIVATE: 'Particulares',
};

const TYPE_ORDER = ['OWNER', 'RENTER', 'PRIVATE'];

export function CustomersByTypeChart({ data }: { data: CustomersSummaryResponse | null }) {
  const [showLine, setShowLine] = useState(true);

  const byType = new Map((data?.byCustomerType ?? []).map((r) => [r.customerType, r.count]));
  let cumulative = 0;
  const chartData = TYPE_ORDER.map((type) => {
    const count = byType.get(type as 'OWNER' | 'RENTER' | 'PRIVATE') ?? 0;
    cumulative += count;
    return { label: TYPE_LABEL[type], count, cumulative };
  });

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={MONO_CARD}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Clientes creados por tipo</span>
            <span className={MONO_BADGE}>Barras + línea</span>
          </div>
          <div className={MONO_STAT}>
            {total} <span className="text-xs font-normal text-muted-foreground">clientes en el período</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLine(!showLine)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
            showLine
              ? 'border-gm-yellow/30 bg-gm-yellow/15 text-gm-yellow'
              : 'border-border bg-transparent text-muted-foreground'
          }`}
        >
          {showLine ? 'Línea activa' : 'Línea oculta'}
        </button>
      </div>

      <div className={`${MONO_STAGE} touch-pan-y`}>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="hsl(var(--gm-line))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip content={<MonoTooltip indicator="dot" />} />

            <Bar
              dataKey="count"
              name="Clientes"
              fill="hsl(var(--gm-yellow) / 0.35)"
              stroke="hsl(var(--gm-yellow) / 0.7)"
              strokeWidth={1}
              radius={[8, 8, 8, 8]}
              barSize={28}
              animationDuration={800}
            />

            {showLine && (
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="hsl(var(--gm-yellow))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: 'hsl(var(--gm-yellow))', stroke: 'hsl(var(--gm-surface-2))', strokeWidth: 2 }}
                animationDuration={900}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">Capas monocromáticas</span>
        <span className="font-medium text-foreground">
          {chartData[chartData.length - 1]?.label} al tope
        </span>
      </div>
    </div>
  );
}
