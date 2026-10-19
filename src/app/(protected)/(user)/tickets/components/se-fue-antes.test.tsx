/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SeFueAntes } from './se-fue-antes';
import { opcionesSalidaAnteriorAction, registrarSalidaAnteriorAction } from '@/actions/tickets/salida-anterior.action';
import type { TicketRegistration } from '@/types/ticket-registration.type';

jest.mock('@/actions/tickets/salida-anterior.action', () => ({ opcionesSalidaAnteriorAction: jest.fn(), registrarSalidaAnteriorAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const registration = { id: 'reg', licensePlateOriginal: 'AG654HJ', entryDay: '2026-10-15', entryTime: '16:52:00' } as unknown as TicketRegistration;
// Lleva cinco horas ($ 5.000): la primera hora y las horas extra que ya pasó.
const opciones = [
  { etiqueta: 'Hora', minutos: 60, salidaEn: '2026-10-15T20:52:00.000Z', precio: 1000 },
  { etiqueta: 'Hora + 1 × Extra', minutos: 120, salidaEn: '2026-10-15T21:52:00.000Z', precio: 2000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 5000, cobrado: 0, opciones });
});

test('elige la tarifa que le corresponde y registra la salida en un solo paso', async () => {
  jest.mocked(registrarSalidaAnteriorAction).mockResolvedValue({ registration });
  const onRegistrada = jest.fn();
  const onOpenChange = jest.fn();
  render(<SeFueAntes registration={registration} open onOpenChange={onOpenChange} onRegistrada={onRegistrada} />);
  expect(await screen.findByText(/Ahora serían \$\s?5\.000/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Registrar salida/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: /Hora \+ 1 × Extra/ }));
  // Hasta elegir cómo pagó no se puede confirmar.
  expect(screen.getByRole('button', { name: /Cobrar y registrar salida/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Efectivo' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobrar y registrar salida/ }));
  await waitFor(() => expect(registrarSalidaAnteriorAction).toHaveBeenCalledWith('reg', { salidaEn: opciones[1].salidaEn, expectedPrice: 2000, expectedCollected: 0, closeType: 'PAYMENT', metodo: 'CASH' }));
  expect(onRegistrada).toHaveBeenCalledWith(registration);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test('ya pagado por adelantado: registra la salida sin cobrar', async () => {
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 5000, cobrado: 1000, opciones });
  jest.mocked(registrarSalidaAnteriorAction).mockResolvedValue({ registration });
  render(<SeFueAntes registration={registration} open onOpenChange={jest.fn()} onRegistrada={jest.fn()} />);
  fireEvent.click(await screen.findByRole('radio', { name: /^Hora hasta/ }));
  expect(screen.getByText(/solo se registra la salida/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Efectivo' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Registrar salida/ }));
  await waitFor(() => expect(registrarSalidaAnteriorAction).toHaveBeenCalledWith('reg', expect.objectContaining({ closeType: 'NO_CHARGE', expectedPrice: 1000, expectedCollected: 1000 })));
});

test('todavía en la primera tarifa: no hay nada más barato que ofrecer', async () => {
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 1000, cobrado: 0, opciones: [] });
  render(<SeFueAntes registration={registration} open onOpenChange={jest.fn()} onRegistrada={jest.fn()} />);
  expect(await screen.findByText(/Todavía está en la primera tarifa/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Registrar salida/ })).toBeDisabled();
});
