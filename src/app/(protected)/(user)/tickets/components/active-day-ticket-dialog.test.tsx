/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActiveDayTicketDialog } from './active-day-ticket-dialog';
import { updateTicketRegistrationForDayStatusAction as updateStatus } from '@/actions/tickets/update-ticket-registration-for-day-status.action';
import { crearCobroMercadoPagoAction as crearQr } from '@/actions/mercadopago/mercadopago.action';
import { cobroAliasDeEstadiaAction, disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import type { CobroAlias } from '@/types/verificacion-alias.type';
import type { CobroMercadoPago } from '@/types/mercadopago.type';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/actions/tickets/update-ticket-registration-for-day-status.action', () => ({ updateTicketRegistrationForDayStatusAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: jest.fn(), cobroAliasDeEstadiaAction: jest.fn(), iniciarCobroAliasAction: jest.fn() }));
jest.mock('./cobro-qr-mercadopago', () => ({
  CobroQrMercadoPago: ({ cobro, onAcreditado }: { cobro: CobroMercadoPago; onAcreditado: (p: CobroMercadoPago) => void }) => <>
    <button onClick={() => onAcreditado({ ...cobro, estado: 'ACREDITADO' })}>Simular acreditación QR</button>
    <button onClick={() => onAcreditado({ ...cobro, estado: 'ACREDITADO', salidaRegistrada: true })}>Simular QR con salida</button>
  </>,
  PagoQrRecibido: ({ onCerrar }: { onCerrar: () => void }) => <button onClick={onCerrar}>QR recibido: listo</button>,
}));
jest.mock('./cobro-alias', () => ({ CobroAliasPanel: () => <p>Esperando transferencia</p>, PagoRecibido: ({ onCerrar }: { onCerrar: () => void }) => <button onClick={onCerrar}>Pago recibido: listo</button> }));

const registration: TicketRegistrationForDay = {
  id: 'abono', description: 'Estadía semanal', price: 18000, vehiclePlateCustomer: 'AB123CD',
  vehicleType: 'AUTO', ticketTimeType: 'SEMANA', weeks: 1, days: 0, months: 0,
  dateNow: new Date('2026-10-08T12:00:00-03:00'), firstNameCustomer: '', lastNameCustomer: '',
  paid: false, retired: false, paymentMetodo: null, boxList: {} as TicketRegistrationForDay['boxList'],
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: true, alias: 'alias.test' } });
  jest.mocked(cobroAliasDeEstadiaAction).mockResolvedValue({ datos: null });
  jest.mocked(updateStatus).mockResolvedValue({} as Awaited<ReturnType<typeof updateStatus>>);
});
async function abrir(paid = false) {
  const close = jest.fn();
  render(<ActiveDayTicketDialog registration={{ ...registration, paid }} open onOpenChange={close} />);
  if (!paid) await screen.findByRole('button', { name: /Al alias/ });
  return close;
}
test('muestra los cuatro medios y cobra efectivo solamente al confirmar', async () => {
  const close = await abrir();
  expect(screen.getByRole('button', { name: /Elegí cómo paga/ })).toBeDisabled();
  for (const medio of ['Efectivo', 'QR / celular', 'Al alias', 'Transferencia']) expect(screen.getByRole('button', { name: new RegExp(medio) })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Efectivo/ }));
  expect(updateStatus).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Cobrar y registrar salida/ }));
  await waitFor(() => expect(updateStatus).toHaveBeenCalledWith('abono', { paid: true, paymentMetodo: 'CASH', retired: true }));
  expect(close).toHaveBeenCalledWith(false);
});
test('QR usa ABONO y espera acreditación antes de permitir la salida', async () => {
  jest.mocked(crearQr).mockResolvedValue({ cobro: { id: 'qr', estado: 'PENDIENTE' } as CobroMercadoPago });
  await abrir();
  fireEvent.click(screen.getByRole('button', { name: /QR \/ celular/ }));
  fireEvent.click(screen.getByRole('button', { name: /Generar QR/ }));
  await screen.findByRole('button', { name: /Simular acreditación/ });
  expect(crearQr).toHaveBeenCalledWith('abono', 'ABONO');
  expect(updateStatus).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /^Registrar salida/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Simular acreditación/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Registrar salida/ }));
  await waitFor(() => expect(updateStatus).toHaveBeenCalledWith('abono', { retired: true }));
});
test('QR acreditado con la salida ya registrada en el servidor: confirma y cierra sin registrar de nuevo', async () => {
  jest.mocked(crearQr).mockResolvedValue({ cobro: { id: 'qr', estado: 'PENDIENTE' } as CobroMercadoPago });
  const close = await abrir();
  fireEvent.click(screen.getByRole('button', { name: /QR \/ celular/ }));
  fireEvent.click(screen.getByRole('button', { name: /Generar QR/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Simular QR con salida/ }));
  expect(screen.queryByRole('button', { name: /^Registrar salida/ })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: /QR recibido: listo/ }));
  expect(updateStatus).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledWith(false);
});
test('alias confirmado ya cobra y sale en el servidor, no vuelve a cobrar en el front', async () => {
  jest.mocked(iniciarCobroAliasAction).mockResolvedValue({ datos: { id: 'alias', registrationId: 'abono', estado: 'CONFIRMADO', salidaRegistrada: true } as CobroAlias });
  const close = await abrir();
  fireEvent.click(screen.getByRole('button', { name: /Al alias/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Esperar transferencia/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Pago recibido: listo/ }));
  expect(iniciarCobroAliasAction).toHaveBeenCalledWith('abono', 'ABONO');
  expect(updateStatus).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledWith(false);
});
test('un abono pagado registra solo la salida y no ofrece medios de pago', async () => {
  await abrir(true);
  expect(screen.queryByRole('button', { name: /Efectivo/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Registrar salida/ }));
  await waitFor(() => expect(updateStatus).toHaveBeenCalledWith('abono', { retired: true }));
});
test('recupera una espera existente con el tipo ABONO', async () => {
  jest.mocked(cobroAliasDeEstadiaAction).mockResolvedValue({ datos: { id: 'alias', estado: 'REVISION' } as CobroAlias });
  render(<ActiveDayTicketDialog registration={registration} open onOpenChange={jest.fn()} />);
  await screen.findByText('Esperando transferencia');
  expect(cobroAliasDeEstadiaAction).toHaveBeenCalledWith('abono', 'ABONO');
  expect(screen.queryByRole('button', { name: /Efectivo/ })).not.toBeInTheDocument();
  expect(updateStatus).not.toHaveBeenCalled();
});
