/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResumenCajaNeto } from './resumen-caja-neto';
import type { ResumenCaja } from '@/types/box-list.type';

const resumen: ResumenCaja = { criterio: 'PORCENTAJES_ACTUALES', efectivo: 0, totalAntesComisiones: 200, comisionEstimada: 0.97, totalNetoEstimado: 199.03, medios: [
  { metodo: 'qrSaldo', etiqueta: 'QR · saldo / transferencia', porcentaje: 0.968, bruto: 100, comision: 0.97, neto: 99.03 },
  { metodo: 'aliasSaldo', etiqueta: 'Alias MP · transferencia', porcentaje: 0, bruto: 100, comision: 0, neto: 100 },
] };
it('muestra sólo un desplegable discreto y omite las tasas de cero', () => {
  render(<ResumenCajaNeto resumen={resumen} />);
  const trigger = screen.getByText(/Totales de comisión/);
  expect(trigger).toBeVisible();
  expect(trigger.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('QR · saldo / transferencia')).not.toBeVisible();
  expect(screen.queryByText('Alias MP · transferencia')).not.toBeInTheDocument();
  expect(screen.queryByText('Total neto estimado')).not.toBeInTheDocument();
  expect(screen.queryByText(/199,03/)).not.toBeInTheDocument();
  // Native details toggles in the browser; jsdom needs the open attribute set explicitly.
  fireEvent.click(trigger);
  trigger.closest('details')!.open = true;
  expect(screen.getByText('Neto digital')).toBeVisible();
  expect(screen.getByText(/99,03/)).toBeVisible();
});
it('no ocupa espacio cuando todas las comisiones son cero', () => {
  const { container } = render(<ResumenCajaNeto resumen={{ ...resumen, comisionEstimada: 0, medios: [resumen.medios[1]] }} />);
  expect(container).toBeEmptyDOMElement();
});
it('conserva un medio pendiente sin inventar un descuento', () => {
  render(<ResumenCajaNeto resumen={{ ...resumen, comisionEstimada: 0, importePendienteComision: 100, medios: [{ ...resumen.medios[0], porcentaje: null, comision: 0, pendiente: 100, neto: 100 }] }} />);
  expect(screen.getByText('Comisión a definir')).toBeInTheDocument();
  expect(screen.getByText('Pendiente')).toBeInTheDocument();
});
