'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ReceiptsSummaryResponse } from '@/types/dashboard.type';
import { MONO_BADGE, MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';
import { ReceiptsMonthFilter } from './receipts-month-filter';

export function ReceiptsGaugeChart({ data, month }: { data: ReceiptsSummaryResponse | null; month: string }) {
  const paid = data?.byStatus.find((s) => s.status === 'PAID')?.count ?? 0;
  const pending = data?.byStatus.find((s) => s.status === 'PENDING')?.count ?? 0;
  const totalCount = paid + pending;
  const pct = totalCount === 0 ? 0 : Math.round((paid / totalCount) * 100);

  const gaugeData = [
    { name: 'Pagados', value: pct },
    { name: 'Resto', value: 100 - pct },
  ];

  return (
    <div className={MONO_CARD}>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Recibos pagados vs pendientes</span>
            <span className={MONO_BADGE}>Medidor</span>
          </div>
          <div className={MONO_STAT}>
            {pct}% <span className="text-xs font-normal text-muted-foreground">recibos pagados</span>
          </div>
        </div>

        <ReceiptsMonthFilter month={month} />
      </div>

      <div className={`${MONO_STAGE} flex flex-col items-center justify-center`}>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={gaugeData}
              dataKey="value"
              cx="50%"
              cy="70%"
              startAngle={210}
              endAngle={-30}
              innerRadius={54}
              outerRadius={72}
              cornerRadius={8}
              paddingAngle={4}
              animationDuration={800}
            >
              <Cell fill="hsl(var(--gm-yellow))" />
              <Cell fill="hsl(var(--gm-surface-3))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute bottom-4 flex flex-col items-center">
          <span className="gm-tnum text-xl font-extrabold text-foreground">{pct.toFixed(1)}%</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {totalCount === 0 ? 'Sin recibos' : `${pending} ${pending === 1 ? 'pendiente' : 'pendientes'}`}
          </span>
        </div>
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">Arco redondeado de 240°</span>
        <span className="font-medium text-gm-yellow">
          Pagados {paid} · Pendientes {pending}
        </span>
      </div>
    </div>
  );
}
