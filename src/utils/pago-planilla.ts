import type { DetalleComisionPago } from '@/types/box-list.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';

export type PagoPlanilla = { entradas: number; salidas: number; badge: string; detalle?: string };
const formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const dinero = (n: number) => '$ ' + formato.format(n);
const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// El neto digital se compensa en ambas columnas: nunca aporta efectivo.
export function pagoPlanilla(monto: number, metodo?: string | null, medio?: string, comision?: DetalleComisionPago): PagoPlanilla {
  const digital = metodo === 'TRANSFER' || metodo === 'MERCADOPAGO';
  const neto = digital ? comision?.neto ?? monto : monto;
  const badge = medio?.startsWith('Alias MP') ? 'TR Alias' : medio?.startsWith('QR') ? 'TR QR' : metodo === 'MERCADOPAGO' ? 'TR MP' : digital ? 'TR' : 'EF';
  const tipo = medio?.split(' · ')[1];
  let detalle = tipo;
  if (comision?.pendiente) detalle = [tipo, 'Comisión pendiente'].filter(Boolean).join(' · ');
  else if (comision && (comision.comision ?? 0) > 0) detalle = [tipo, `Bruto ${dinero(comision.bruto)} · Comisión ${dinero(comision.comision!)} · Neto ${dinero(comision.neto)}`].filter(Boolean).join(' · ');
  return {
    entradas: digital ? neto : Math.max(0, monto),
    salidas: digital ? neto : Math.max(0, -monto),
    badge,
    detalle,
  };
}

export function pagoTicketPlanilla(ticket: TicketRegistration): PagoPlanilla {
  const movimientos = (ticket.movimientos ?? []).filter(m => m.tipo !== 'CORTESIA');
  if (!movimientos.length) return { ...pagoPlanilla(ticket.price), badge: ticket.movimientos?.some(m => m.tipo === 'CORTESIA') ? 'CORT' : '' };
  if (movimientos.length > 1 && movimientos.some(m => m.monto === undefined)) {
    // La API histórica puede informar sólo métodos, sin el reparto de importes.
    // Conserva el monto completo; nunca lo pierde por tomar los faltantes como cero.
    const metodos = new Set(movimientos.map(m => m.metodo));
    const digital = movimientos.every(m => m.metodo !== 'CASH');
    return { ...pagoPlanilla(ticket.price, digital ? 'TRANSFER' : 'CASH'), badge: metodos.size === 1 ? (digital ? 'TR' : 'EF') : 'MIX' };
  }
  const pagos = movimientos.map(m => pagoPlanilla(m.monto ?? (movimientos.length === 1 ? ticket.price : 0), m.metodo, m.medioPagoDetalle, m.comisionPagoEstimada));
  const badges = new Set(pagos.map(p => p.badge));
  return {
    entradas: centavos(pagos.reduce((sum, p) => sum + p.entradas, 0)),
    salidas: centavos(pagos.reduce((sum, p) => sum + p.salidas, 0)),
    badge: badges.size === 1 ? pagos[0].badge : 'MIX',
    detalle: [...new Set(pagos.map(p => p.detalle).filter(Boolean))].join(' / ') || undefined,
  };
}
