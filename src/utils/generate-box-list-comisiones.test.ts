import { PDFDocument, PDFPage } from 'pdf-lib';
import generateBoxList from './generate-box-list';
import type { BoxList } from '@/types/box-list.type';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

it('compensa TR QR y TR Alias por su neto; el total conserva sólo efectivo y omite comisiones cero', async () => {
  const draw = jest.spyOn(PDFPage.prototype, 'drawText');
  const anchor = { click: jest.fn() };
  const windowBefore = global.window;
  const documentBefore = global.document;
  Object.defineProperty(global, 'window', { configurable: true, value: { open: () => null } });
  Object.defineProperty(global, 'document', { configurable: true, value: { createElement: () => anchor, body: { appendChild() {}, removeChild() {} } } });
  const url = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prueba');
  const registration = { id: 't1', description: 'Auto', licensePlateOriginal: 'ABC123', entryDay: '2026-10-08', departureDay: '2026-10-08', entryTime: '08:00:00', departureTime: '08:30:00' };
  const box = { id: 'caja', date: new Date('2026-10-08T12:00:00Z'), totalPrice: 50, boxNumber: 1,
    ticketRegistrations: [], ticketMovements: [
      { id: 'qr', metodo: 'MERCADOPAGO', tipo: 'SALDO', monto: 100, medioPagoDetalle: 'QR · saldo / transferencia', comisionPagoEstimada: { bruto: 100, porcentaje: 0.968, comision: 0.97, neto: 99.03, pendiente: false }, ticketRegistration: registration },
      { id: 'alias', metodo: 'TRANSFER', tipo: 'SALDO', monto: 100, medioPagoDetalle: 'Alias MP · transferencia', comisionPagoEstimada: { bruto: 100, porcentaje: 0, comision: 0, neto: 100, pendiente: false }, ticketRegistration: { ...registration, id: 't2', licensePlateOriginal: 'DEF456' } },
      { id: 'cash', metodo: 'CASH', tipo: 'SALDO', monto: 50, ticketRegistration: { ...registration, id: 't3', licensePlateOriginal: 'GHI789' } },
    ], ticketRegistrationForDays: [], receipts: [], otherPayments: [], receiptPayments: [], paymentHistoryOnAccount: [], cobrosInquilinos: [],
    resumenCaja: { criterio: 'PORCENTAJES_ACTUALES', efectivo: 50, totalAntesComisiones: 250, comisionEstimada: 0.97, totalNetoEstimado: 249.03,
      medios: [
        { metodo: 'qrSaldo', etiqueta: 'QR · saldo / transferencia', porcentaje: 0.968, bruto: 100, comision: 0.97, neto: 99.03 },
        { metodo: 'aliasSaldo', etiqueta: 'Alias MP · transferencia', porcentaje: 0, bruto: 100, comision: 0, neto: 100 },
      ] },
  } as unknown as BoxList;
  const antes = JSON.stringify(box);
  try {
    const bytes = await generateBoxList(box, 'Prueba');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    const textos = draw.mock.calls.map(([texto]) => texto);
    expect(textos).toContain('TR QR');
    expect(textos).toContain('TR Alias');
    expect(textos).toContain('Neto  50');
    expect(textos).toContain('Entradas  249,03');
    expect(textos).toContain('Salidas  - 199,03');
    expect(textos).toContain('EFECTIVO DEL DÍA');
    expect(textos).toContain('$ 50');
    expect(textos).not.toContain('TOTAL NETO ESTIMADO');
    expect(textos).toContain('COMISIONES ESTIMADAS');
    expect(textos).not.toContain('Alias MP · transferencia');
    expect(textos.some(t => t.includes('Comisión $ 0,97'))).toBe(true);
    // Las dos columnas de la fila QR muestran el mismo neto, con centavos.
    const qrBadge = draw.mock.calls.find(([texto]) => texto === 'TR QR')!;
    const qrY = qrBadge[1]!.y!;
    const filaQr = draw.mock.calls.filter(([, opts]) => opts?.y === qrY).map(([texto]) => texto);
    expect(filaQr.filter(t => t === '99,03')).toHaveLength(2);
    expect(JSON.stringify(box)).toBe(antes);
    expect(anchor.click).toHaveBeenCalled();
  } finally {
    draw.mockRestore(); url.mockRestore();
    Object.defineProperty(global, 'window', { configurable: true, value: windowBefore });
    Object.defineProperty(global, 'document', { configurable: true, value: documentBefore });
  }
});
