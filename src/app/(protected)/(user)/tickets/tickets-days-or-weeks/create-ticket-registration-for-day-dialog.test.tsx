/** @jest-environment jsdom */
import { useEffect as mockUseEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateTicketRegistrationDialog } from './create-ticket-registration-for-day-dialog';
import { createTicketRegistrationForDayAction as crear } from '@/actions/tickets/create-ticket-registration-for-day.action';
import { updateTicketRegistrationForDayStatusAction as updateStatus } from '@/actions/tickets/update-ticket-registration-for-day-status.action';
import { crearCobroMercadoPagoAction as crearQr } from '@/actions/mercadopago/mercadopago.action';
import { cancelarCobroAliasAction, disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { CobroAlias } from '@/types/verificacion-alias.type';
import type { CobroMercadoPago } from '@/types/mercadopago.type';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/components/vehicle-type-options', () => ({
  VehicleTypeButtons: ({ onValidityChange }: { onValidityChange?: (v: boolean) => void }) => {
    mockUseEffect(() => onValidityChange?.(true), []);
    return null;
  },
}));
jest.mock('../components/plate-camera-scan-button', () => ({ PlateCameraScanButton: () => null }));
jest.mock('@/actions/tickets/create-ticket-registration-for-day.action', () => ({ createTicketRegistrationForDayAction: jest.fn() }));
jest.mock('@/actions/tickets/update-ticket-registration-for-day-status.action', () => ({ updateTicketRegistrationForDayStatusAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn(), cancelarCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: jest.fn(), iniciarCobroAliasAction: jest.fn(), cancelarCobroAliasAction: jest.fn() }));
jest.mock('../components/cobro-qr-mercadopago', () => ({
  CobroQrMercadoPago: ({ cobro, onAcreditado }: { cobro: CobroMercadoPago; onAcreditado: (p: CobroMercadoPago) => void }) =>
    <button onClick={() => onAcreditado({ ...cobro, estado: 'ACREDITADO' })}>Simular acreditación QR</button>,
  PagoQrRecibido: ({ onCerrar }: { onCerrar: () => void }) => <button onClick={onCerrar}>QR recibido: listo</button>,
}));
jest.mock('../components/cobro-alias', () => ({
  CobroAliasPanel: ({ onCancelado }: { onCancelado: () => void }) => <button onClick={onCancelado}>Cancelar espera</button>,
  PagoRecibido: ({ onCerrar }: { onCerrar: () => void }) => <button onClick={onCerrar}>Pago recibido: listo</button>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: true, alias: 'alias.test' } });
  jest.mocked(crear).mockResolvedValue({ success: 'ok', registrationId: 'abono' } as Awaited<ReturnType<typeof crear>>);
  jest.mocked(updateStatus).mockResolvedValue({} as Awaited<ReturnType<typeof updateStatus>>);
});

async function abrirYCompletar(medio: RegExp) {
  const setOpen = jest.fn();
  render(<CreateTicketRegistrationDialog setIsDialogOpen={setOpen} showTrigger={false} openSignal={1} />);
  fireEvent.change(await screen.findByPlaceholderText('Ej.: AB123CD'), { target: { value: 'AB123CD' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cobra ahora' }));
  fireEvent.click(await screen.findByRole('button', { name: medio }));
  return setOpen;
}

test('cobra ahora con QR: registra sin pagar, cobra el abono al ingresar y cierra al acreditarse', async () => {
  jest.mocked(crearQr).mockResolvedValue({ cobro: { id: 'qr', estado: 'PENDIENTE' } as CobroMercadoPago });
  const setOpen = await abrirYCompletar(/QR \/ celular/);
  fireEvent.click(screen.getByRole('button', { name: /Registrar y mostrar el QR/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Simular acreditación QR/ }));
  expect(crear).toHaveBeenCalledWith(expect.objectContaining({ paid: false, paymentMetodo: undefined }));
  expect(crearQr).toHaveBeenCalledWith('abono', 'ABONO', { alIngresar: true });
  fireEvent.click(await screen.findByRole('button', { name: /QR recibido: listo/ }));
  expect(updateStatus).not.toHaveBeenCalled();
  expect(setOpen).toHaveBeenLastCalledWith(false);
});

test('cobra ahora en efectivo sigue registrando pagada de una vez', async () => {
  await abrirYCompletar(/Efectivo/);
  fireEvent.click(screen.getByRole('button', { name: /Registrar estadía/ }));
  await waitFor(() => expect(crear).toHaveBeenCalledWith(expect.objectContaining({ paid: true, paymentMetodo: 'CASH' })));
  expect(crearQr).not.toHaveBeenCalled();
});

test('alias cancelado: la estadía queda registrada y puede pagar al retirar', async () => {
  jest.mocked(iniciarCobroAliasAction).mockResolvedValue({ datos: { id: 'alias', estado: 'ESPERANDO' } as CobroAlias });
  const setOpen = await abrirYCompletar(/Al alias/);
  fireEvent.click(screen.getByRole('button', { name: /Registrar y esperar la transferencia/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Cancelar espera/ }));
  expect(iniciarCobroAliasAction).toHaveBeenCalledWith('abono', 'ABONO', { alIngresar: true });
  await screen.findByText(/ya quedó registrada, sin cobrar/);
  fireEvent.click(screen.getByRole('button', { name: /Paga al retirar/ }));
  expect(updateStatus).not.toHaveBeenCalled();
  expect(cancelarCobroAliasAction).not.toHaveBeenCalled();
  expect(setOpen).toHaveBeenLastCalledWith(false);
});
