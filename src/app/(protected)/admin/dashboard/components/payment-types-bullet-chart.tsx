import { ReceiptsSummaryResponse } from '@/types/dashboard.type';
import { MONO_CARD, MONO_FOOTER, MONO_LABEL, MONO_STAGE, MONO_STAT } from './mono-style';

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  MIX: 'Mixto',
  CREDIT: 'Crédito',
  TP: 'Tarjeta',
  FIX: 'Corrección',
};

export function PaymentTypesBulletChart({ data }: { data: ReceiptsSummaryResponse | null }) {
  const rows = (data?.byPaymentType ?? []).filter((r) => r.paymentType);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  // Sin marca de «reparto parejo» (100 / n): sugería que los medios deberían repartirse igual,
  // una meta que nadie fijó.

  const items = rows
    .map((r) => ({
      title: PAYMENT_TYPE_LABEL[r.paymentType ?? ''] ?? r.paymentType ?? 'Sin dato',
      actual: totalCount === 0 ? 0 : Math.round((r.count / totalCount) * 100),
      count: r.count,
    }))
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 5);

  return (
    <div className={MONO_CARD}>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={MONO_LABEL}>Tipos de pago más usados</span>
          </div>
          <div className={MONO_STAT}>
            {items.length} <span className="text-xs font-normal text-muted-foreground">medios evaluados</span>
          </div>
        </div>
      </div>

      <div className={`${MONO_STAGE} flex flex-col justify-around gap-2`}>
        {items.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Sin datos para el período seleccionado.</p>
        ) : (
          items.map((item) => (
            <div key={item.title} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-muted-foreground">
                  {item.actual}% · {item.count} {item.count === 1 ? 'cobro' : 'cobros'}
                </span>
              </div>
              <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-gm-surface-3">
                <div
                  className="h-full rounded-full bg-gm-yellow transition-all"
                  style={{ width: `${item.actual}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className={MONO_FOOTER}>
        <span className="text-muted-foreground">Cobros en el período</span>
        <span className="font-medium text-foreground">{totalCount}</span>
      </div>
    </div>
  );
}
