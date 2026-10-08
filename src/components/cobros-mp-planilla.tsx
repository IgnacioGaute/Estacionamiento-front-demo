import type { BoxList } from '@/types/box-list.type';

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export function CobrosMpPlanilla({ box }: { box: BoxList }) {
  const filas = [
    ...(box.ticketMovements ?? []).filter(m => m.medioPagoDetalle && m.tipo !== 'CORTESIA').map(m => ({
      id: 'ticket-' + m.id,
      detalle: m.ticketRegistration.licensePlateOriginal || m.ticketRegistration.codeBarTicket || 'Ticket por hora',
      medio: m.medioPagoDetalle,
      monto: m.monto,
    })),
    ...(box.ticketRegistrationForDays ?? []).filter(t => t.paid && t.medioPagoDetalle).map(t => ({
      id: 'abono-' + t.id,
      detalle: t.vehiclePlateCustomer || t.description || 'Abono',
      medio: t.medioPagoDetalle,
      monto: t.price,
    })),
    ...(box.cobrosInquilinos ?? []).filter(c => c.medioPagoDetalle).map(c => ({
      id: 'inquilino-' + c.id,
      detalle: c.cliente + (c.numero ? ' · Recibo ' + c.numero : ''),
      medio: c.medioPagoDetalle,
      monto: c.monto,
    })),
  ];
  if (!filas.length) return null;
  return <details className="rounded-xl border border-border bg-background/30 p-4">
    <summary className="cursor-pointer text-sm font-medium">Detalle de cobros de Mercado Pago <span className="ml-1 text-xs font-normal text-muted-foreground">({filas.length})</span></summary>
    <ul className="mt-3 max-h-64 divide-y divide-border/60 overflow-y-auto">
      {filas.map(f => <li key={f.id} className="flex items-start justify-between gap-3 py-3 text-xs">
        <div className="min-w-0"><p className="break-words font-medium">{f.detalle}</p><p className="mt-1 text-muted-foreground">{f.medio}</p></div>
        <span className="shrink-0 tabular-nums">{ars.format(f.monto)}</span>
      </li>)}
    </ul>
    <p className="mt-3 text-xs text-muted-foreground">Importes cobrados antes de comisión. El resumen de arriba muestra el neto estimado.</p>
  </details>;
}
