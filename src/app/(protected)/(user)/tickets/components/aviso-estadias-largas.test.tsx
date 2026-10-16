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

test('una línea discreta; al tocarla se ve el auto para cobrarlo', () => {
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={[estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={onCobrar} />);
  const linea = screen.getByRole('button', { name: /HPQ966 lleva 13 h 38 min en la playa/ });
  expect(linea).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: /Cobrar/ })).not.toBeInTheDocument();
  fireEvent.click(linea);
  fireEvent.click(screen.getByRole('button', { name: /HPQ966.*Cobrar/ }));
  expect(onCobrar).toHaveBeenCalledWith('a');
});

test('varios: cuántos son, y «Siguen adentro» la oculta', () => {
  render(<AvisoEstadiasLargas registros={[estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NBO468', '12:44:00'), estadia('c', 'SALIO1', '08:00:00', true)]} ahora={ahora} onCobrar={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /2 autos con más de 4 h en la playa/ }));
  expect(screen.getAllByRole('button', { name: /Cobrar/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /Siguen adentro/ }));
  expect(screen.queryByText(/en la playa/)).not.toBeInTheDocument();
});

test('sin estadías largas no muestra nada', () => {
  const { container } = render(<AvisoEstadiasLargas registros={[estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
