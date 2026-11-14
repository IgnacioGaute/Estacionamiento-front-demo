/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ConciliacionCajaPanel } from './conciliacion-caja';

test('muestra lo que conviene revisar y los conteos de los cambios de turno', () => {
  render(<ConciliacionCajaPanel detalle={{
    fondoInicial: 17100, ingresos: 237500, egresos: 0, esperado: 254600, movimientos: [],
    conteos: [{ id: 'k', momento: 'SALIDA', contado: 100000, esperado: 101000, diferencia: 1000, motivo: 'Error en un vuelto', operador: 'Franco', fecha: '2026-11-12T16:00:00Z' }],
    paraRevisar: [
      { id: 'a', patente: 'MLT748', motivo: 'DESCUENTO_TOTAL', detalle: 'Salió 13:38 sin cobro: descuento de $3.500.', salida: '13:38' },
      { id: 'b', patente: 'MLT748', motivo: 'COBRO_SIN_TIEMPO', detalle: 'Estadía de 0 min cobrada $3.500.', salida: '13:38' },
    ],
  }} />);
  expect(screen.getByRole('heading', { name: 'Para revisar antes de explicar la diferencia' })).toBeInTheDocument();
  expect(screen.getByText('Salió 13:38 sin cobro: descuento de $3.500.')).toBeInTheDocument();
  expect(screen.getByText(/Franco · al irse/)).toBeInTheDocument();
  expect(screen.getByText(/Faltaban/)).toBeInTheDocument();
});

test('mientras se pide avisa que está buscando; si no se pudo, no muestra nada', () => {
  const { rerender, container } = render(<ConciliacionCajaPanel detalle={undefined} />);
  expect(screen.getByText('Buscando cómo se calcula el efectivo…')).toBeInTheDocument();
  rerender(<ConciliacionCajaPanel detalle={null} />);
  expect(container).toBeEmptyDOMElement();
});
