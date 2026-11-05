import type { BoxList } from '@/types/box-list.type';
import { ticketBoxRows } from './ticket-box-rows';

// Solo los campos que lee la planilla; el resto de la caja no interviene.
const caja = (value: object) => value as unknown as BoxList;

test('planilla: suma cobros, resta devolución y excluye cortesía sin duplicar estadías', () => {
  const registration = { id: 'stay', price: 1000, pricingSnapshot: {}, licensePlateOriginal: 'ABC123' };
  const box = caja({ date: '2026-09-18', ticketRegistrations: [registration], ticketMovements: [
    { id: '1', monto: 1500, tipo: 'ANTICIPO', metodo: 'CASH', ticketRegistration: registration },
    { id: '2', monto: -500, tipo: 'AJUSTE', metodo: 'CASH', ticketRegistration: registration },
    { id: '3', monto: 1000, tipo: 'CORTESIA', metodo: 'CASH', ticketRegistration: { ...registration, id: 'courtesy' } },
  ] });
  const rows = ticketBoxRows(box);
  expect(rows).toHaveLength(3);
  expect(rows.reduce((sum, r) => sum + r.price, 0)).toBe(1000);
  expect(rows.find(r => r.id === '2')?.price).toBe(-500);
  expect(rows.find(r => r.id === '3')?.price).toBe(0);
});

test('planilla: el descuento va como nota del cobro de esa estadía, y corregirlo no agrega renglones', () => {
  const auto = { id: 'stay', pricingSnapshot: {}, licensePlateOriginal: 'AB123CD' };
  const otro = { id: 'other', pricingSnapshot: {}, licensePlateOriginal: 'XY456ZZ' };
  const rows = ticketBoxRows(caja({ date: '2026-11-05', ticketRegistrations: [], ticketMovements: [
    { id: 'd1', monto: 300, tipo: 'DESCUENTO', metodo: 'CASH', motivo: 'Cliente frecuente', ticketRegistration: auto },
    // Lo corrigió a 200: el libro guarda la diferencia.
    { id: 'd2', monto: -100, tipo: 'DESCUENTO', metodo: 'CASH', motivo: 'Lo corrigió el encargado', ticketRegistration: auto },
    { id: 'p1', monto: 800, tipo: 'SALDO', metodo: 'CASH', ticketRegistration: auto },
    // Este lo descontó todo: no hay cobro, así que tiene su renglón.
    { id: 'd3', monto: 1000, tipo: 'DESCUENTO', metodo: 'CASH', motivo: 'Bonificación', ticketRegistration: otro },
  ] }));
  expect(rows.map(r => r.description)).toEqual(['Saldo - AB123CD', 'Descuento - XY456ZZ']);
  expect(rows[0]).toMatchObject({ price: 800, discountNote: 'Descuento: $ 200 · Lo corrigió el encargado' });
  expect(rows[1]).toMatchObject({ price: 0, discountNote: 'Descuento: $ 1.000 · Bonificación · sin cobro en esta planilla' });
});

test('planilla: conserva registros históricos sin movimientos y admite la API anterior', () => {
  const legacy = { id: 'old', price: 800 };
  expect(ticketBoxRows(caja({ ticketRegistrations: [legacy] }))).toEqual([legacy]);
  expect(ticketBoxRows(caja({ ticketRegistrations: [legacy], ticketMovements: [] }))).toEqual([legacy]);
});
