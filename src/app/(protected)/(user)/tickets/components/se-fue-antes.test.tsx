/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SeFueAntes } from './se-fue-antes';
import { opcionesSalidaAnteriorAction, registrarSalidaAnteriorAction } from '@/actions/tickets/salida-anterior.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { disponibilidadAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { TicketRegistration } from '@/types/ticket-registration.type';

jest.mock('@/actions/tickets/salida-anterior.action', () => ({ opcionesSalidaAnteriorAction: jest.fn(), registrarSalidaAnteriorAction: jest.fn() }));
jest.mock('@/actions/tickets/get-close-summary.action', () => ({ getCloseSummaryAction: jest.fn() }));
jest.mock('@/actions/tickets/pago-parcial.action', () => ({ pagoParcialEfectivoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn(), consultarCobroMercadoPagoAction: jest.fn(), cancelarCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({
  disponibilidadAliasAction: jest.fn(), iniciarCobroAliasAction: jest.fn(), consultarCobroAliasAction: jest.fn(),
  asignarTransferenciaAliasAction: jest.fn(), ampliarCobroAliasAction: jest.fn(), cancelarCobroAliasAction: jest.fn(),
}));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const registration = { id: 'reg', licensePlateOriginal: 'AG654HJ', entryDay: '2026-10-15', entryTime: '16:52:00' } as unknown as TicketRegistration;
// Lleva cinco horas ($ 5.000): la primera hora y las horas extra que ya pasó, marcadas como repeticiones.
const opciones = [
  { etiqueta: 'Hora', minutos: 60, salidaEn: '2026-10-15T20:52:00.000Z', precio: 1000 },
  { etiqueta: 'Hora + 1 × Extra', minutos: 120, salidaEn: '2026-10-15T21:52:00.000Z', precio: 2000, repeticiones: 1 },
  { etiqueta: 'Hora + 2 × Extra', minutos: 180, salidaEn: '2026-10-15T22:52:00.000Z', precio: 3000, repeticiones: 2 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 5000, cobrado: 0, opciones });
  jest.mocked(disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: false } } as never);
});

const abrir = () => render(<SeFueAntes registration={registration} open onOpenChange={jest.fn()} onRegistrada={jest.fn()} />);

test('las horas extra se suman con un contador sobre la última tarifa y se cobra en un paso', async () => {
  jest.mocked(registrarSalidaAnteriorAction).mockResolvedValue({ registration });
  const onRegistrada = jest.fn();
  const onOpenChange = jest.fn();
  render(<SeFueAntes registration={registration} open onOpenChange={onOpenChange} onRegistrada={onRegistrada} />);
  expect(await screen.findByText(/Ahora serían \$\s?5\.000/)).toBeInTheDocument();
  // Las repeticiones no son renglones: hay una sola tarifa, «Hora».
  expect(screen.getAllByRole('radio')).toHaveLength(1);
  fireEvent.click(screen.getByRole('radio', { name: /^Hora/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Una vez más Extra' }));
  expect(screen.getByRole('radio', { name: /Hora \+ 1 × Extra/ })).toBeInTheDocument();
  // Hasta elegir cómo paga no se puede confirmar.
  expect(screen.getByRole('button', { name: /Cobrar y registrar salida/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /^Efectivo Contalo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Cobrar y registrar salida/ }));
  await waitFor(() => expect(registrarSalidaAnteriorAction).toHaveBeenCalledWith('reg', { salidaEn: opciones[1].salidaEn, expectedPrice: 2000, expectedCollected: 0, closeType: 'PAYMENT', metodo: 'CASH' }));
  expect(onRegistrada).toHaveBeenCalledWith(registration);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test('efectivo y transferencia: se registra junto, repartido', async () => {
  jest.mocked(registrarSalidaAnteriorAction).mockResolvedValue({ registration });
  abrir();
  fireEvent.click(await screen.findByRole('radio', { name: /^Hora/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Efectivo y otro medio/ }));
  fireEvent.change(screen.getByLabelText('En efectivo'), { target: { value: '400' } });
  fireEvent.click(screen.getByRole('button', { name: /Cobrar y registrar salida/ }));
  await waitFor(() => expect(registrarSalidaAnteriorAction).toHaveBeenCalledWith('reg', expect.objectContaining({
    expectedPrice: 1000, closeType: 'PAYMENT', pagos: [{ metodo: 'CASH', importe: 400 }, { metodo: 'TRANSFER', importe: 600 }],
  })));
});

test('con QR se cobra la tarifa como anticipo y la salida queda para cuando se acredite', async () => {
  jest.mocked(crearCobroMercadoPagoAction).mockResolvedValue({ error: 'sin QR en la prueba' });
  abrir();
  fireEvent.click(await screen.findByRole('radio', { name: /^Hora/ }));
  fireEvent.click(screen.getByRole('button', { name: /^QR \/ celular/ }));
  fireEvent.click(screen.getByRole('button', { name: /Cobrar con QR/ }));
  await waitFor(() => expect(crearCobroMercadoPagoAction).toHaveBeenCalledWith('reg', 'HORA', { anticipoMinutos: 60, anticipoEtiqueta: 'Hora' }));
  expect(registrarSalidaAnteriorAction).not.toHaveBeenCalled();
});

test('ya pagado por adelantado: registra la salida sin cobrar', async () => {
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 5000, cobrado: 1000, opciones });
  jest.mocked(registrarSalidaAnteriorAction).mockResolvedValue({ registration });
  abrir();
  fireEvent.click(await screen.findByRole('radio', { name: /^Hora/ }));
  expect(screen.getByText(/solo se registra la salida/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Efectivo Contalo/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Registrar salida/ }));
  await waitFor(() => expect(registrarSalidaAnteriorAction).toHaveBeenCalledWith('reg', expect.objectContaining({ closeType: 'NO_CHARGE', expectedPrice: 1000, expectedCollected: 1000 })));
});

test('todavía en la primera tarifa: no hay nada más barato que ofrecer', async () => {
  jest.mocked(opcionesSalidaAnteriorAction).mockResolvedValue({ ahora: 1000, cobrado: 0, opciones: [] });
  abrir();
  expect(await screen.findByText(/Todavía está en la primera tarifa/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Registrar salida/ })).toBeDisabled();
});
