/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { BoxList } from '@/types/box-list.type';
import { CobrosMpPlanilla } from './cobros-mp-planilla';
import { ResumenCajaNeto } from './resumen-caja-neto';

it('muestra el medio verificado de cada cobro sin etiquetar las transferencias manuales', () => {
  const box = { ticketMovements: [
    { id: 'qr', tipo: 'SALDO', metodo: 'MERCADOPAGO', monto: 1000, medioPagoDetalle: 'QR · crédito', ticketRegistration: { licensePlateOriginal: 'ABC123' } },
    { id: 'alias', tipo: 'SALDO', metodo: 'TRANSFER', monto: 2000, medioPagoDetalle: 'Alias MP · crédito', ticketRegistration: { licensePlateOriginal: 'DEF456' } },
    { id: 'manual', tipo: 'SALDO', metodo: 'TRANSFER', monto: 500, ticketRegistration: { licensePlateOriginal: 'MAN123' } },
    { id: 'desconocido', tipo: 'SALDO', metodo: 'MERCADOPAGO', monto: 300, medioPagoDetalle: 'QR · medio no informado', ticketRegistration: { licensePlateOriginal: 'UNK123' } },
  ] } as unknown as BoxList;
  render(<CobrosMpPlanilla box={box} />);
  expect(screen.getByText('ABC123')).toBeInTheDocument();
  expect(screen.getByText('QR · crédito')).toBeInTheDocument();
  expect(screen.getByText('Alias MP · crédito')).toBeInTheDocument();
  expect(screen.getByText('QR · medio no informado')).toBeInTheDocument();
  expect(screen.queryByText('MAN123')).not.toBeInTheDocument();
});

it('expone bruto, comisión y neto por medio sin tener que desplegar el desglose', () => {
  render(<ResumenCajaNeto resumen={{ criterio: 'PORCENTAJES_ACTUALES', efectivo: 0, totalAntesComisiones: 1000, comisionEstimada: 50, totalNetoEstimado: 950,
    medios: [{ metodo: 'qrCredito', etiqueta: 'QR · crédito', porcentaje: 5, bruto: 1000, comision: 50, neto: 950 }],
  }} />);
  expect(screen.getByText('QR · crédito')).toBeVisible();
  expect(screen.getByText('Bruto')).toBeVisible();
  expect(screen.getByText('Comisión')).toBeVisible();
  expect(screen.getByText('Neto')).toBeVisible();
  expect(screen.getAllByText(/950,00/)).toHaveLength(2);
});
