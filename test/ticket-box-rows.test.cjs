const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleResult = { exports: {} };
const source = fs.readFileSync('src/utils/ticket-box-rows.ts', 'utf8');
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleResult, moduleResult.exports);
const { ticketBoxRows } = moduleResult.exports;

test('planilla: suma cobros, resta devolución y excluye cortesía sin duplicar estadías', () => {
  const registration = { id: 'stay', price: 1000, pricingSnapshot: {}, licensePlateOriginal: 'ABC123' };
  const box = { date: '2026-09-18', ticketRegistrations: [registration], ticketMovements: [
    { id: '1', monto: 1500, tipo: 'ANTICIPO', metodo: 'CASH', ticketRegistration: registration },
    { id: '2', monto: -500, tipo: 'AJUSTE', metodo: 'CASH', ticketRegistration: registration },
    { id: '3', monto: 1000, tipo: 'CORTESIA', metodo: 'CASH', ticketRegistration: { ...registration, id: 'courtesy' } },
  ] };
  const rows = ticketBoxRows(box);
  assert.equal(rows.length, 3);
  assert.equal(rows.reduce((sum, r) => sum + r.price, 0), 1000);
  assert.equal(rows.find(r => r.id === '2').price, -500);
  assert.equal(rows.find(r => r.id === '3').price, 0);
});

test('planilla: conserva registros históricos sin movimientos y admite la API anterior', () => {
  const legacy = { id: 'old', price: 800 };
  assert.deepEqual(ticketBoxRows({ ticketRegistrations: [legacy] }), [legacy]);
  assert.deepEqual(ticketBoxRows({ ticketRegistrations: [legacy], ticketMovements: [] }), [legacy]);
});
