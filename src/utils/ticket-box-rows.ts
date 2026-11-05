import type { BoxList } from '@/types/box-list.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';

const esDescuento = (tipo: string) => tipo === 'CORTESIA' || tipo === 'DESCUENTO';
const pesos = (n: number) => `$ ${n.toLocaleString('es-AR')}`;

// Lo que la planilla dice de los descuentos de esa estadía en esa caja. Corregir un descuento
// deja otro movimiento por la diferencia: acá se suman y se lee el que quedó, con su último motivo.
function notaDescuento(monto: number, motivo: string | null | undefined, sinCobro: boolean) {
  const texto = monto < 0 ? `Descuento quitado: ${pesos(-monto)}` : `Descuento: ${pesos(monto)}`;
  return [texto, motivo || null, sinCobro ? 'sin cobro en esta planilla' : null].filter(Boolean).join(' · ');
}

// Cada cobro/devolución se informa en su día, independientemente de la última caja de la estadía.
// El descuento no mueve plata: va como nota del cobro de esa estadía en la misma planilla y solo
// tiene renglón propio si ese día no hubo cobro (lo descontó todo o se cobra otro día).
export function ticketBoxRows(box: BoxList): TicketRegistration[] {
  const linked = box.ticketRegistrations ?? [];
  if (!box.ticketMovements) return linked;
  const legacy = linked.filter(r => !r.pricingSnapshot && !r.movimientos?.length);
  const labels = { ANTICIPO: 'Anticipo', SALDO: 'Saldo', AJUSTE: 'Ajuste', CORTESIA: 'Descuento', DESCUENTO: 'Descuento' };
  const identificacion = (r: TicketRegistration) => r.licensePlateOriginal || r.codeBarTicket || r.lastNameCustomer || 'Sin patente';

  type Movimiento = NonNullable<BoxList['ticketMovements']>[number];
  const filas: { estadia: string; fila: TicketRegistration }[] = [];
  // `lugar`: dónde va el renglón propio, si hace falta: donde estaba el último descuento.
  const descuentos = new Map<string, { monto: number; ultimo: Movimiento; lugar: number }>();
  for (const m of box.ticketMovements) {
    if (esDescuento(m.tipo)) {
      const previo = descuentos.get(m.ticketRegistration.id);
      descuentos.set(m.ticketRegistration.id, { monto: (previo?.monto ?? 0) + m.monto, ultimo: m, lugar: filas.length });
      continue;
    }
    filas.push({ estadia: m.ticketRegistration.id, fila: {
      ...m.ticketRegistration,
      id: m.id,
      price: m.monto,
      operatorName: m.operador,
      dateNow: box.date,
      description: `${labels[m.tipo]} - ${identificacion(m.ticketRegistration)}`,
      movimientos: [{ metodo: m.metodo, tipo: m.tipo, monto: m.monto, medioPagoDetalle: m.medioPagoDetalle, comisionPagoEstimada: m.comisionPagoEstimada }],
    } });
  }

  // De atrás para adelante (y, en el mismo lugar, el último primero), así cada renglón propio entra
  // en su lugar sin correr a los demás y quedan en el orden en que se hicieron.
  const enOrden = [...descuentos].map((d, i) => ({ d, i })).sort((a, b) => b.d[1].lugar - a.d[1].lugar || b.i - a.i).map(x => x.d);
  for (const [estadia, { monto, ultimo, lugar }] of enOrden) {
    if (!monto) continue; // Se puso y se quitó en el mismo día: no quedó nada que informar.
    const cobro = filas.filter(f => f.estadia === estadia).pop();
    if (cobro) {
      cobro.fila.discountNote = notaDescuento(monto, ultimo.motivo, false);
      continue;
    }
    filas.splice(lugar, 0, { estadia, fila: {
      ...ultimo.ticketRegistration,
      id: ultimo.id,
      price: 0,
      operatorName: ultimo.operador,
      discountNote: notaDescuento(monto, ultimo.motivo, true),
      dateNow: box.date,
      description: `Descuento - ${identificacion(ultimo.ticketRegistration)}`,
      movimientos: [{ metodo: ultimo.metodo, tipo: ultimo.tipo, monto, medioPagoDetalle: ultimo.medioPagoDetalle, comisionPagoEstimada: ultimo.comisionPagoEstimada }],
    } });
  }
  return [...legacy, ...filas.map(f => f.fila)];
}
