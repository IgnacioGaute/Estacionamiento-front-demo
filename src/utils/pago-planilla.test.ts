import type { TicketRegistration } from '@/types/ticket-registration.type';
import { pagoPlanilla, pagoTicketPlanilla } from './pago-planilla';

it('compensa el neto de un QR en entradas y salidas sin cambiar el cobro original', () => {
  const ticket = { price: 100, movimientos: [{ metodo: 'MERCADOPAGO', tipo: 'SALDO', monto: 100, medioPagoDetalle: 'QR · saldo / transferencia',
    comisionPagoEstimada: { bruto: 100, porcentaje: 0.968, comision: 0.97, neto: 99.03, pendiente: false },
  }] } as TicketRegistration;
  const antes = JSON.stringify(ticket);
  const pago = pagoTicketPlanilla(ticket);
  expect(pago).toMatchObject({ entradas: 99.03, salidas: 99.03, badge: 'TR QR' });
  expect(pago.entradas - pago.salidas).toBe(0);
  expect(pago.detalle).toContain('Comisión $ 0,97');
  expect(JSON.stringify(ticket)).toBe(antes);
});
it('alias sin comisión y transferencias manuales se compensan con su importe completo', () => {
  expect(pagoPlanilla(100, 'TRANSFER', 'Alias MP · transferencia', { bruto: 100, porcentaje: 0, comision: 0, neto: 100, pendiente: false })).toEqual({ entradas: 100, salidas: 100, badge: 'TR Alias', detalle: 'transferencia' });
  expect(pagoPlanilla(100, 'TRANSFER')).toMatchObject({ entradas: 100, salidas: 100, badge: 'TR' });
});
it('un pago mixto sólo aporta su parte de efectivo al neto de caja', () => {
  const ticket = { price: 200, movimientos: [
    { metodo: 'CASH', monto: 100 },
    { metodo: 'MERCADOPAGO', monto: 100, medioPagoDetalle: 'QR · crédito', comisionPagoEstimada: { bruto: 100, porcentaje: 5, comision: 5, neto: 95, pendiente: false } },
  ] } as TicketRegistration;
  expect(pagoTicketPlanilla(ticket)).toMatchObject({ entradas: 195, salidas: 95, badge: 'MIX' });
});
it('una devolución digital revierte ambas columnas sin presumir reintegro de comisión', () => {
  expect(pagoPlanilla(-100, 'MERCADOPAGO')).toMatchObject({ entradas: -100, salidas: -100 });
  expect(pagoPlanilla(-100, 'CASH')).toMatchObject({ entradas: 0, salidas: 100 });
});
it('un medio pendiente sigue compensado sin una comisión inventada', () => {
  expect(pagoPlanilla(100, 'MERCADOPAGO', 'QR · medio no informado', { bruto: 100, porcentaje: null, comision: null, neto: 100, pendiente: true })).toMatchObject({ entradas: 100, salidas: 100, detalle: 'medio no informado · Comisión pendiente' });
});
