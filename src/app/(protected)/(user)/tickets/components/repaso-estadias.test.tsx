/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { paraRepasar, RepasoEstadias } from './repaso-estadias';
import type { EstadiaAbiertaTurno } from '@/types/turno.type';

const ahora = new Date('2026-10-15T03:26:00-03:00').getTime();
const estadia = (id: string, patente: string, entryDay: string, entryTime: string, operador?: string): EstadiaAbiertaTurno =>
  ({ id, patente, vehicleType: 'AUTO', entryDay, entryTime, anticipo: 0, operador });

test('solo se repasan las de más de 4 horas, la más larga primero', () => {
  const lista = paraRepasar([
    estadia('corta', 'NUEVO1', '2026-10-15', '01:00:00'),
    estadia('b', 'NBO468', '2026-10-14', '12:44:00'),
    estadia('a', 'AF876EB', '2026-10-14', '07:11:00'),
  ], ahora);
  expect(lista.map((e) => e.id)).toEqual(['a', 'b']);
  expect(lista[0].minutos).toBe(20 * 60 + 15);
});

test('no rompe con la fecha como fecha ISO completa (lo que mandaba producción)', () => {
  const [e] = paraRepasar([estadia('a', 'AF876EB', '2026-10-14T00:00:00.000Z', '07:11:00')], ahora);
  expect(e.minutos).toBe(20 * 60 + 15);
});

test('cada auto se marca «Sigue en la playa» o se cobra; «Siguen todos» marca los pendientes', () => {
  const onConfirmar = jest.fn();
  const onCobrar = jest.fn();
  const estadias = paraRepasar([estadia('a', 'AF876EB', '2026-10-14', '07:11:00', 'Franco Pizarro'), estadia('b', 'NBO468', '2026-10-14', '12:44:00', 'Franco Pizarro')], ahora);
  render(<RepasoEstadias estadias={estadias} todas confirmadas={['b']} onConfirmar={onConfirmar} onCobrar={onCobrar} />);
  expect(screen.getByText('2 autos llevan más de 4 h')).toBeInTheDocument();
  expect(screen.getByText('Entró 07:11 · Franco Pizarro')).toBeInTheDocument();
  const sigue = screen.getAllByRole('button', { name: /Sigue en la playa/ });
  expect(sigue[1]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(sigue[0]);
  expect(onConfirmar).toHaveBeenCalledWith(['a'], true);
  fireEvent.click(screen.getByRole('button', { name: 'Siguen todos' }));
  expect(onConfirmar).toHaveBeenLastCalledWith(['a'], true);
  fireEvent.click(screen.getAllByRole('button', { name: 'Se fue: cobrar' })[0]);
  expect(onCobrar).toHaveBeenCalledWith('a');
});

test('sin autos largos no muestra nada, salvo que el conteo dé de más', () => {
  const { container, rerender } = render(<RepasoEstadias estadias={[]} confirmadas={[]} onConfirmar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<RepasoEstadias estadias={[]} confirmadas={[]} onConfirmar={jest.fn()} sobrante={84500} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Contaste $ 84.500 de más');
});
