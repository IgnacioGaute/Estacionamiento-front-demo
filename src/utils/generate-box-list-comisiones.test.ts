import { PDFDocument, PDFPage } from 'pdf-lib';
import generateBoxList from './generate-box-list';
import type { BoxList } from '@/types/box-list.type';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

it('genera una planilla válida con el neto y centavos sin cambiar el importe original', async () => {
  const draw = jest.spyOn(PDFPage.prototype, 'drawText');
  const anchor = { click: jest.fn() };
  const windowBefore = global.window;
  const documentBefore = global.document;
  Object.defineProperty(global, 'window', { configurable: true, value: { open: () => null } });
  Object.defineProperty(global, 'document', { configurable: true, value: { createElement: () => anchor, body: { appendChild() {}, removeChild() {} } } });
  const url = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prueba');
  const box = { id: 'caja', date: new Date('2026-10-07T12:00:00Z'), totalPrice: 3000, boxNumber: 1,
    ticketRegistrations: [], ticketMovements: [
      { id: 'qr', metodo: 'MERCADOPAGO', tipo: 'SALDO', monto: 10000, medioPagoDetalle: 'QR · crédito', ticketRegistration: { id: 't1', description: 'Auto', licensePlateOriginal: 'ABC123' } },
      { id: 'alias', metodo: 'TRANSFER', tipo: 'SALDO', monto: 2000, medioPagoDetalle: 'Alias MP · crédito', ticketRegistration: { id: 't2', description: 'Auto', licensePlateOriginal: 'DEF456' } },
    ], ticketRegistrationForDays: [], receipts: [], otherPayments: [], receiptPayments: [], paymentHistoryOnAccount: [], cobrosInquilinos: [],
    resumenCaja: { criterio: 'PORCENTAJES_ACTUALES', efectivo: 3000, totalAntesComisiones: 15000, comisionEstimada: 745.25, totalNetoEstimado: 14254.75,
      medios: [
        { metodo: 'qrCredito', etiqueta: 'QR · crédito', porcentaje: 7.2525, bruto: 10000, comision: 725.25, neto: 9274.75 },
        { metodo: 'aliasCredito', etiqueta: 'Alias MP · crédito', porcentaje: 1, bruto: 2000, comision: 20, neto: 1980 },
      ] },
  } as unknown as BoxList;
  try {
    const bytes = await generateBoxList(box, 'Prueba');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    const textos = draw.mock.calls.map(([texto]) => texto);
    expect(textos).toContain('TOTAL NETO ESTIMADO');
    expect(textos).toContain('$ 14.254,75');
    // Una vez por cada cobro y otra en el resumen: el detalle no se pierde al armar filas.
    expect(textos).toContain('QR · crédito');
    expect(textos).toContain('Alias MP · crédito');
    expect(textos.filter(t => t.startsWith('QR · crédito'))).toHaveLength(2);
    expect(textos.filter(t => t.startsWith('Alias MP · crédito'))).toHaveLength(2);
    expect(box.totalPrice).toBe(3000);
    expect(box.ticketMovements?.map(m => m.monto)).toEqual([10000, 2000]);
    expect(anchor.click).toHaveBeenCalled();
  } finally {
    draw.mockRestore(); url.mockRestore();
    Object.defineProperty(global, 'window', { configurable: true, value: windowBefore });
    Object.defineProperty(global, 'document', { configurable: true, value: documentBefore });
  }
});
