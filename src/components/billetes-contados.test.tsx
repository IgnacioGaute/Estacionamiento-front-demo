/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Turno } from '@/types/turno.type';
import { BilletesContados } from './billetes-contados';

// El botón comparte el estilo del historial de cobros, que importa su acción de servidor.
jest.mock('@/actions/turnos/cobros-efectivo.action', () => ({ getCobrosEfectivoAction: jest.fn() }));

const turno = (datos: Partial<Turno>) => ({ id: 't1', efectivoContado: 20000, primerConteo: 20000, conteoDesglose: null, primerConteoDesglose: null, cashSession: null, ...datos }) as unknown as Turno;

test('muestra los billetes del arqueo con su total', () => {
  render(<BilletesContados turno={turno({ conteoDesglose: [{ denominacion: 10000, cantidad: 1 }, { denominacion: 2000, cantidad: 5 }] })} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver billetes contados' }));
  const tabla = screen.getByRole('table', { name: 'Conteo' });
  expect(within(tabla).getAllByRole('row').map((f) => f.textContent)).toEqual([
    expect.stringMatching(/10\.000× 1.*10\.000/), expect.stringMatching(/2\.000× 5.*10\.000/), expect.stringMatching(/^Total.*20\.000/),
  ]);
});

test('si se volvió a contar después de ver lo esperado, muestra los dos conteos', () => {
  render(<BilletesContados turno={turno({ primerConteo: 19000, conteoDesglose: [{ denominacion: 1000, cantidad: 20 }], primerConteoDesglose: [{ denominacion: 1000, cantidad: 19 }] })} />);
  fireEvent.click(screen.getByRole('button', { name: /Ver billetes contados · se volvió a contar/ }));
  expect(screen.getByRole('table', { name: 'Primer conteo, antes de ver lo esperado' })).toHaveTextContent(/× 19/);
  expect(screen.getByRole('table', { name: 'Conteo final' })).toHaveTextContent(/× 20/);
});

test('«No hay efectivo» se muestra como tal', () => {
  render(<BilletesContados turno={turno({ efectivoContado: 0, primerConteo: 0, conteoDesglose: [] })} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver billetes contados' }));
  expect(screen.getByText('No había efectivo')).toBeInTheDocument();
});

test('un cierre anterior sin desglose no inventa billetes', () => {
  const { container } = render(<BilletesContados turno={turno({})} />);
  expect(container).toBeEmptyDOMElement();
  render(<BilletesContados turno={turno({ efectivoContado: 20000, primerConteo: 19000 })} />);
  expect(screen.getByText(/Cierre sin conteo por billetes/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Ver billetes/ })).not.toBeInTheDocument();
});
