/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getFacturasDelMesAction } from '@/actions/suscripciones/suscripciones.action';
import type { FacturaDelMes } from '@/types/suscripcion.type';
import { FacturasDelMes } from './facturas-del-mes';

jest.mock('@/actions/suscripciones/suscripciones.action', () => ({ getFacturasDelMesAction: jest.fn() }));

const factura = (f: Partial<FacturaDelMes>): FacturaDelMes => ({
  id: Math.random().toString(36),
  empresaId: 'e',
  empresa: 'Empresa',
  importe: 70000,
  meses: 1,
  estado: 'PENDIENTE',
  medio: null,
  desde: '2026-11-05',
  hasta: '2026-12-04',
  pagadaEl: null,
  diasDeAtraso: 0,
  ...f,
});

test('dice cuánto se facturó, cobró, falta y está vencido; las anuladas no suman', async () => {
  (getFacturasDelMesAction as jest.Mock).mockResolvedValue({
    data: [
      factura({ empresa: 'Pagó', estado: 'PAGADA', medio: 'TRANSFERENCIA', importe: 100000 }),
      factura({ empresa: 'Sin vencer', importe: 50000 }),
      factura({ empresa: 'Atrasada', diasDeAtraso: 3, importe: 30000 }),
      factura({ empresa: 'Se suspende', diasDeAtraso: 8, importe: 20000 }),
      factura({ empresa: 'Anulada', estado: 'ANULADA', importe: 999000 }),
    ],
  });
  render(<FacturasDelMes mesActual="2026-11" debito={{ activos: 2, total: 5 }} />);
  expect(await screen.findByText('Facturado')).toBeInTheDocument();
  // El rótulo de la cifra (dt), no el de la leyenda de la barra.
  const cifra = (rotulo: string) =>
    screen.getAllByText(rotulo).find((el) => el.tagName === 'DT')?.parentElement as HTMLElement;
  expect(within(cifra('Facturado')).getByText(/200/)).toBeInTheDocument();
  expect(within(cifra('Cobrado')).getByText(/50 %/)).toBeInTheDocument();
  expect(within(cifra('Vencido')).getByText(/1 pasó la gracia/)).toBeInTheDocument();
  expect(screen.getByText(/Débito automático en 2 de 5 cuentas que pagan/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: /Vencidas/ }));
  expect(screen.getByText('Atrasada')).toBeInTheDocument();
  expect(screen.getByText('Se suspende')).toBeInTheDocument();
  expect(screen.queryByText('Pagó')).not.toBeInTheDocument();
  expect(screen.getByText('Vencida · 8 días')).toBeInTheDocument();
});

test('sin facturas en el mes lo dice', async () => {
  (getFacturasDelMesAction as jest.Mock).mockResolvedValue({ data: [] });
  render(<FacturasDelMes mesActual="2026-11" debito={{ activos: 0, total: 0 }} />);
  expect(await screen.findByText(/Ninguna factura vence en noviembre 2026/)).toBeInTheDocument();
});
