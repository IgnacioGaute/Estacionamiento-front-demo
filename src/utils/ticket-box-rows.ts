import type { BoxList } from '@/types/box-list.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';

// Cada cobro/devolución se informa en su día, independientemente de la última caja de la estadía.
export function ticketBoxRows(box: BoxList): TicketRegistration[] {
  const linked = box.ticketRegistrations ?? [];
  if (!box.ticketMovements) return linked;
  const legacy = linked.filter(r => !r.pricingSnapshot && !r.movimientos?.length);
  const labels = { ANTICIPO: 'Anticipo', SALDO: 'Saldo', AJUSTE: 'Ajuste', CORTESIA: 'Descuento', DESCUENTO: 'Descuento' };
  return [...legacy, ...box.ticketMovements.map(m => ({
    ...m.ticketRegistration,
    id: m.id,
    price: m.tipo === 'CORTESIA' || m.tipo === 'DESCUENTO' ? 0 : m.monto,
    operatorName: m.operador,
    discountNote: m.tipo === 'CORTESIA' || m.tipo === 'DESCUENTO' ? `Descuento: $ ${m.monto.toLocaleString('es-AR')}${m.motivo ? ' · ' + m.motivo : ''}` : undefined,
    dateNow: box.date,
    description: `${labels[m.tipo]} - ${m.ticketRegistration.licensePlateOriginal || m.ticketRegistration.codeBarTicket || m.ticketRegistration.lastNameCustomer || 'Sin patente'}`,
    movimientos: [{ metodo: m.metodo, tipo: m.tipo, monto: m.monto, medioPagoDetalle: m.medioPagoDetalle, comisionPagoEstimada: m.comisionPagoEstimada }],
  }))];
}
