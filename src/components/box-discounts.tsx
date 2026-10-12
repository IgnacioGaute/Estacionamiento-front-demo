import type { BoxList } from '@/types/box-list.type';

export function BoxDiscounts({ box }: { box: BoxList }) {
  const total = (box.ticketMovements ?? []).reduce((sum, m) =>
    sum + (m.tipo === 'DESCUENTO' || m.tipo === 'CORTESIA' ? m.monto : 0), 0);
  if (total <= 0) return null;
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(total);
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-xs">
    <span className="text-muted-foreground">Descuentos del día</span>
    <strong>{money}</strong>
  </div>;
}
