import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TurnoResumenPanel } from '@/components/turno-resumen';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import generateBoxList from './generate-box-list';
import type { BoxList } from '@/types/box-list.type';
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

test('planilla imprime los resúmenes y las alertas sin recortar textos largos', async () => {
  const draw = jest.spyOn(PDFPage.prototype, 'drawText');
  const beforeWindow = global.window;
  const beforeDocument = global.document;
  Object.defineProperty(global, 'window', { configurable: true, value: { open: () => null } });
  Object.defineProperty(global, 'document', { configurable: true, value: { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } } });
  const url = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const box = { id: 'box', date: new Date('2026-10-10T12:00:00Z'), totalPrice: 90000, boxNumber: 5,
    ticketRegistrations: [], ticketRegistrationForDays: [], receipts: [], receiptPayments: [], paymentHistoryOnAccount: [],
    ticketMovements: [{ id: 'discount', tipo: 'DESCUENTO', monto: 300, metodo: 'CASH', fechaHora: '2026-10-10T14:00:00Z', operador: 'Ana María López - Operadora de la entrada principal', motivo: 'Beneficio de cliente frecuente, autorizado en el turno de la mañana', ticketRegistration: { id: 'reg', description: 'Auto', licensePlateOriginal: 'AB123CD' } },
      { id: 'payment', tipo: 'SALDO', monto: 700, metodo: 'CASH', fechaHora: '2026-10-10T14:01:00Z', operador: 'Luis Pérez', ticketRegistration: { id: 'reg', description: 'Auto', licensePlateOriginal: 'AB123CD' } }],
    salidasDelDia: [{ id: 'reg', identificacion: 'AB123CD', hora: '2026-10-10T14:02:00Z', operador: 'Luis Pérez' }, { id: 'free', identificacion: 'XY456ZZ', hora: '2026-10-10T14:03:00Z', operador: 'Ana López' }],
    otherPayments: [{ id: 'expense', description: 'Insumos', price: 50, type: 'EGRESOS', paymentMethod: 'CASH', dateNow: '2026-10-10', operatorName: 'Luis Pérez' }],
    cobrosInquilinos: [{ id: 'rent', tipo: 'PAGO', metodo: 'CASH', monto: 1000, numero: '123', cliente: 'Pérez Luis', hora: '2026-10-10T15:00:00Z', operador: 'Ana López' }],
    turnosDelDia: Array.from({ length: 7 }, (_, i) => ({ turnoId: String(i), efectivoDelDia: 90000, movimientos: 20,
      turno: { id: String(i), nombre: 'Ana María López - Operadora de la entrada principal', caja: { nombre: 'Caja principal' }, estado: 'CERRADO', fechaOperativa: '2026-10-10',
        cierreCaja: i % 2 === 0, cierreAutomatico: i % 2 === 1, efectivoTeorico: i === 2 ? 23000 : 105000, efectivoContado: i === 2 ? 23000 : 105000, diferencia: 0, saldoAlCorte: 105000,
        alertaSueldo: i === 2 ? 'No se retiró el sueldo de $25.000: el efectivo no alcanza para preservar el fondo de $15.000. El retiro no se registra parcialmente y queda pendiente de revisión por administración.' : null,
        resumen: { efectivoCobrado: i === 2 ? 18000 : 100000, efectivoNeto: i === 2 ? 8000 : 90000, ingresosVarios: 0, gastosEfectivo: 10000, devolucionesEfectivo: 0,
          mercadoPagoAlias: 17000, mercadoPagoQr: 13000, transferencias: 20000, sueldoRetirado: i % 2 || i === 2 ? 0 : 25000, retirosRecaudacion: i % 2 ? 0 : i === 2 ? 8000 : 65000,
          totalRetirado: i % 2 ? 10000 : i === 2 ? 18000 : 100000, salidas: 20, vehiculosInicio: 5, vehiculosFin: 8, efectivoParaSiguiente: i % 2 ? null : 15000, movimientos: [] } } })),
  } as unknown as BoxList;
  try {
    const bytes = await generateBoxList(box, 'Operador de prueba');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
    const texts = draw.mock.calls.map(([t]) => t);
    expect(texts.filter(t => t.startsWith('RESUMEN DE TURNO'))).toHaveLength(7);
    expect(texts.some(t => t.includes('MP Alias: $ 17.000'))).toBe(true);
    expect(texts.some(t => t.includes('Deja al siguiente: $ 15.000'))).toBe(true);
    expect(texts.some(t => t.includes('Corte de las 00:00'))).toBe(true);
    expect(texts.some(t => t.includes('No se retiró el sueldo'))).toBe(true);
    expect(texts.some(t => t.includes('Descuento: $ 300'))).toBe(true);
    expect(texts.some(t => t.includes('Registró Luis Pérez'))).toBe(true);
    expect(texts.some(t => t.includes('XY456ZZ'))).toBe(true);
    for (const [text, options] of draw.mock.calls) {
      if (options?.size === 8.5 && options.x === 50 && options.font) {
        expect(options.font.widthOfTextAtSize(text, 8.5)).toBeLessThanOrEqual(480);
        expect(options.y).toBeGreaterThan(65);
      }
    }
    if (process.env.TURNOS_VISUAL_QA) {
      mkdirSync('../estacionamiento-back-demo/.tmp', { recursive: true });
      writeFileSync('../estacionamiento-back-demo/.tmp/planilla-turnos.pdf', bytes);
      const sample = box.turnosDelDia![0].turno!;
      const html = renderToStaticMarkup(createElement(TurnoResumenPanel, { turno: sample }));
      writeFileSync('../estacionamiento-back-demo/.tmp/turnos-summary.html', `<main class="mx-auto max-w-3xl p-4"><div class="space-y-4 rounded-2xl border border-border bg-card p-4"><div><p class="text-sm font-semibold">Ana María López</p><p class="text-xs text-muted-foreground">Caja principal · 08:00 – 16:00</p></div>${html}</div></main>`);

    }
  } finally {
    draw.mockRestore(); url.mockRestore();
    Object.defineProperty(global, 'window', { configurable: true, value: beforeWindow });
    Object.defineProperty(global, 'document', { configurable: true, value: beforeDocument });
  }
});
