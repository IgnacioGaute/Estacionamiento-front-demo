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

test('lista los cobros digitales sin verificar con su total', () => {
  render(<ConciliacionCajaPanel detalle={{
    fondoInicial: 0, ingresos: 0, egresos: 0, esperado: 0, movimientos: [],
    sinVerificar: [
      { id: '1', tipo: 'TRANSFERENCIA', importe: 18000, hora: '18:40', concepto: 'AB123CD', operador: 'Brian' },
      { id: '2', tipo: 'ALIAS_ELEGIDA', importe: 3500, hora: '19:05', concepto: 'Pago de inquilino', operador: 'Brian' },
    ],
  }} />);
  const lista = screen.getByRole('region', { name: /Cobros digitales sin verificar/ });
  expect(lista).toHaveTextContent('21.500');
  expect(lista).toHaveTextContent('18:40 · AB123CD');
  expect(lista).toHaveTextContent('Transferencia cargada a mano · Brian');
  expect(lista).toHaveTextContent('Alias elegido entre varias · Brian');
});

test('sin cobros sin verificar no agrega nada', () => {
  render(<ConciliacionCajaPanel detalle={{ fondoInicial: 0, ingresos: 0, egresos: 0, esperado: 0, movimientos: [], sinVerificar: [] }} />);
  expect(screen.queryByText('Cobros digitales sin verificar')).not.toBeInTheDocument();
});
