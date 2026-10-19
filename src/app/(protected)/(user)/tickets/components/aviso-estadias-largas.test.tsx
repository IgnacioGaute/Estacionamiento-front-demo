/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { AvisoEstadiasLargas } from './inicio';
import type { TicketRegistration } from '@/types/ticket-registration.type';

jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('./day-registrations-panel', () => ({ DayRegistrationsPanel: () => null }));
const ahora = new Date('2026-10-15T22:19:00-03:00').getTime();
const estadia = (id: string, patente: string, entrada: string, salida = false) =>
  ({ id, licensePlateOriginal: patente, entryDay: '2026-10-15', entryTime: entrada, departureDay: salida ? '2026-10-15' : null, departureTime: salida ? '20:00:00' : null }) as unknown as TicketRegistration;
beforeEach(() => localStorage.clear());

test('un auto sin confirmar: la franja lo nombra y al abrirla se cobra', () => {
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={[estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={onCobrar} />);
  const franja = screen.getByRole('button', { name: /HPQ966 sin confirmar/ });
  expect(franja).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: /Cobrar/ })).not.toBeInTheDocument();
  fireEvent.click(franja);
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar HPQ966' }));
  expect(onCobrar).toHaveBeenCalledWith('a');
});

test('recién pasadas las 4 h es discreta; con más de una hora sin respuesta pregunta si sigue', () => {
  const { rerender } = render(<AvisoEstadiasLargas registros={[estadia('a', 'AB123CD', '18:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(screen.getByRole('button', { name: /AB123CD sin confirmar/ })).toHaveTextContent('Lleva 4 h 19 min');
  rerender(<AvisoEstadiasLargas registros={[estadia('a', 'AB123CD', '17:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(screen.getByRole('button', { name: /AB123CD sin confirmar/ })).toHaveTextContent('¿Sigue en la playa? Si se fue, cobralo.');
});

test('varios: «Siguen todos» los confirma en este dispositivo y la franja se va', () => {
  const registros = [estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NBO468', '12:44:00'), estadia('c', 'SALIO1', '08:00:00', true)];
  const { unmount } = render(<AvisoEstadiasLargas registros={registros} ahora={ahora} onCobrar={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /2 autos sin confirmar/ }));
  expect(screen.getAllByRole('button', { name: /^Cobrar / })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /Siguen todos/ }));
  expect(screen.queryByText(/sin confirmar/)).not.toBeInTheDocument();
  expect(Object.keys(JSON.parse(localStorage.getItem('estadias-confirmadas') ?? '{}')).sort()).toEqual(['a', 'b']);
  unmount();
  // Otra pantalla del mismo dispositivo (Cobrar salida, el repaso del cierre) ya no los pregunta.
  const { container } = render(<AvisoEstadiasLargas registros={registros} ahora={ahora} onCobrar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

test('de 2 a 4 h: una línea azul para tener en cuenta, sin pedir confirmación', () => {
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={[estadia('a', 'CD453RT', '19:39:00')]} ahora={ahora} onCobrar={onCobrar} />);
  fireEvent.click(screen.getByRole('button', { name: /CD453RT pasó las 2 h/ }));
  expect(screen.queryByRole('button', { name: /sigue en la playa/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /CD453RT.*Cobrar/ }));
  expect(onCobrar).toHaveBeenCalledWith('a');
});

test('sin estadías de más de 2 h no muestra nada', () => {
  const { container } = render(<AvisoEstadiasLargas registros={[estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
