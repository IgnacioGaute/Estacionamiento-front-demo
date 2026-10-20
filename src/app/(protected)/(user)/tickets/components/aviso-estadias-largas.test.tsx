/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { AvisoEstadiasLargas } from './inicio';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { useTenant } from '@/components/tenant-provider';

// useTenant vive junto a la acción de contexto (next-auth): se simula con una playa con cobro.
jest.mock('@/components/tenant-provider', () => ({ useTenant: jest.fn(() => ({ cobroHabilitado: true })) }));
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('./day-registrations-panel', () => ({ DayRegistrationsPanel: () => null }));
const ahora = new Date('2026-10-15T22:19:00-03:00').getTime();
const estadia = (id: string, patente: string, entrada: string, salida = false) =>
  ({ id, licensePlateOriginal: patente, entryDay: '2026-10-15', entryTime: entrada, departureDay: salida ? '2026-10-15' : null, departureTime: salida ? '20:00:00' : null }) as unknown as TicketRegistration;
beforeEach(() => {
  localStorage.clear();
  jest.mocked(useTenant).mockReturnValue({ cobroHabilitado: true } as ReturnType<typeof useTenant>);
});

test.each([1, 2])('modalidad gratuita con %i vehículos: pide registrar la salida sin ofrecer cobros', (cantidad) => {
  jest.mocked(useTenant).mockReturnValue({ cobroHabilitado: false } as ReturnType<typeof useTenant>);
  const registros = [estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'NBO468', '12:44:00')].slice(0, cantidad);
  const onCobrar = jest.fn();
  render(<AvisoEstadiasLargas registros={registros} ahora={ahora} onCobrar={onCobrar} />);
  const franja = screen.getByRole('button', { name: /sin confirmar/ });
  expect(franja).toHaveTextContent(cantidad === 1 ? 'Si se fue, registrá la salida.' : 'Si se fueron, registrá las salidas.');
  expect(franja).not.toHaveTextContent(/cobral/);
  fireEvent.click(franja);
  expect(screen.queryByRole('button', { name: /^Cobrar/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Registrar la salida de HPQ966' }));
  expect(onCobrar).toHaveBeenCalledWith('a');
});

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
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar CD453RT' }));
  expect(onCobrar).toHaveBeenCalledWith('a');
});

test('«Se fue antes» en cada auto, de 4 h o de 2 h, abre su diálogo', () => {
  const onSeFueAntes = jest.fn();
  const registros = [estadia('a', 'HPQ966', '08:41:00'), estadia('b', 'CD453RT', '19:39:00')];
  render(<AvisoEstadiasLargas registros={registros} ahora={ahora} onCobrar={jest.fn()} onSeFueAntes={onSeFueAntes} />);
  fireEvent.click(screen.getByRole('button', { name: /HPQ966 sin confirmar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'HPQ966 se fue antes' }));
  expect(onSeFueAntes).toHaveBeenCalledWith(registros[0]);
  fireEvent.click(screen.getByRole('button', { name: 'CD453RT se fue antes' }));
  expect(onSeFueAntes).toHaveBeenCalledWith(registros[1]);
});

test('sin estadías de más de 2 h no muestra nada', () => {
  const { container } = render(<AvisoEstadiasLargas registros={[estadia('b', 'NUEVO1', '21:00:00')]} ahora={ahora} onCobrar={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
