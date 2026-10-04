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

test('planilla: conserva registros históricos sin movimientos y admite la API anterior', () => {
  const legacy = { id: 'old', price: 800 };
  expect(ticketBoxRows(caja({ ticketRegistrations: [legacy] }))).toEqual([legacy]);
  expect(ticketBoxRows(caja({ ticketRegistrations: [legacy], ticketMovements: [] }))).toEqual([legacy]);
});
