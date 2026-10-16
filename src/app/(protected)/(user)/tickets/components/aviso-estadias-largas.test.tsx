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

test('un auto con más de 4 horas: su patente, cobrar y silenciar', () => {
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={[estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={onCobrar} />);
  expect(screen.getByText('HPQ966 lleva 13 h 38 min en la playa')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar salida' }));
  expect(onCobrar).toHaveBeenCalledWith('a');
  fireEvent.click(screen.getByRole('button', { name: 'Sigue adentro' }));
  expect(screen.queryByText(/en la playa/)).not.toBeInTheDocument();
});

test('varios: cuántos son y cada patente para cobrarla', () => {
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={[estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NBO468', '12:44:00'), estadia('c', 'SALIO1', '08:00:00', true)]} ahora={ahora} onCobrar={onCobrar} />);
  expect(screen.getByText('2 vehículos llevan más de 4 h en la playa')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /NBO468/ }));
  expect(onCobrar).toHaveBeenCalledWith('b');
});

test('sin estadías largas no muestra nada', () => {
  const { container } = render(<AvisoEstadiasLargas registros={[estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
