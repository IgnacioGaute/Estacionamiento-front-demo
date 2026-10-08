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
    ticketRegistrations: [], ticketMovements: [], ticketRegistrationForDays: [], receipts: [], otherPayments: [], receiptPayments: [], paymentHistoryOnAccount: [], cobrosInquilinos: [],
    resumenCaja: { criterio: 'PORCENTAJES_ACTUALES', efectivo: 3000, totalAntesComisiones: 13000, comisionEstimada: 725.25, totalNetoEstimado: 12274.75,
      medios: [{ metodo: 'MERCADOPAGO', etiqueta: 'Mercado Pago / QR', porcentaje: 7.25, bruto: 10000, comision: 725.25, neto: 9274.75 }] },
  } as BoxList;
  try {
    const bytes = await generateBoxList(box, 'Prueba');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    const textos = draw.mock.calls.map(([texto]) => texto);
    expect(textos).toContain('TOTAL NETO ESTIMADO');
    expect(textos).toContain('$ 12.274,75');
    expect(box.totalPrice).toBe(3000);
    expect(anchor.click).toHaveBeenCalled();
  } finally {
    draw.mockRestore(); url.mockRestore();
    Object.defineProperty(global, 'window', { configurable: true, value: windowBefore });
    Object.defineProperty(global, 'document', { configurable: true, value: documentBefore });
  }
});
