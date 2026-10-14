/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { CloseTicketPanel } from './close-ticket-panel';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { discountRegistrationAction } from '@/actions/tickets/discount-registration.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import type { CloseSummary } from '@/services/tickets.service';
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/actions/tickets/search-active-registrations.action', () => ({ searchActiveRegistrationsAction: jest.fn() }));
jest.mock('@/actions/tickets/get-close-summary.action', () => ({ getCloseSummaryAction: jest.fn() }));
jest.mock('@/actions/tickets/discount-registration.action', () => ({ discountRegistrationAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/close-registration.action', () => ({ closeRegistrationAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: async () => ({ datos: null }), cobroAliasDeEstadiaAction: async () => ({ cobro: null }), iniciarCobroAliasAction: jest.fn() }));
jest.mock('./cobro-qr-mercadopago', () => ({ CobroQrMercadoPago: () => null }));
jest.mock('./cobro-alias', () => ({ CobroAliasPanel: () => null }));
jest.mock('./eliminar-estadia', () => ({ EliminarEstadia: () => null }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
const summary = (price = 1000, collected = 0) => ({ registration: { id: 'reg', vehicleType: 'AUTO', entryMode: 'PLATE', licensePlateOriginal: 'AB123CD', entryDay: '2026-10-10', entryTime: '10:00:00' }, elapsedMinutes: 30, previewBracket: { price }, saldoACobrar: price - collected, cambioARetornar: 0, totalCollectedSoFar: collected, pricingDayTypeBasis: 'ENTRY' } as CloseSummary);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCloseSummaryAction).mockResolvedValue(summary());
  jest.mocked(closeRegistrationAction).mockResolvedValue({ success: 'OK', registrationId: 'reg' });
});
async function openDiscount() {
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={jest.fn()} />);
  const button = await screen.findByRole('button', { name: 'Descuento' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(screen.queryByText(/Cortesía/)).not.toBeInTheDocument();
  fireEvent.change(await screen.findByLabelText('Motivo del descuento'), { target: { value: 'Cliente frecuente' } });
}
test('descuento parcial: exige un importe válido y cobra el resto con el medio elegido', async () => {
  jest.mocked(discountRegistrationAction).mockResolvedValue({ summary: summary(700) });
  await openDiscount();
  const amount = screen.getByLabelText('Importe del descuento');
  fireEvent.change(amount, { target: { value: '1001' } });
  expect(screen.getByRole('button', { name: /Aplicar descuento/ })).toBeDisabled();
  fireEvent.change(amount, { target: { value: '300' } });
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/salida-descuento.html', document.body.innerHTML);
  fireEvent.click(screen.getByRole('button', { name: /Aplicar descuento/ }));
  await waitFor(() => expect(discountRegistrationAction).toHaveBeenCalledWith('reg', { monto: 300, motivo: 'Cliente frecuente', expectedPrice: 1000, expectedCollected: 0 }));
  const cash = await screen.findByRole('button', { name: /Efectivo/ });
  await waitFor(() => expect(cash).toBeEnabled());
  fireEvent.click(cash);
  fireEvent.click(screen.getByRole('button', { name: /Cobrar y registrar salida/ }));
  await waitFor(() => expect(closeRegistrationAction).toHaveBeenCalledWith('reg', expect.objectContaining({ closeType: 'PAYMENT', metodo: 'CASH', expectedPrice: 700 })));
});
test('todo el saldo respeta el anticipo y después permite confirmar la salida sin cobro', async () => {
  jest.mocked(getCloseSummaryAction).mockResolvedValue(summary(1000, 400));
  jest.mocked(discountRegistrationAction).mockResolvedValue({ summary: summary(400, 400) });
  await openDiscount();
  fireEvent.click(screen.getByRole('button', { name: 'Todo el saldo' }));
  expect(screen.queryByLabelText('Importe del descuento')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Aplicar descuento/ }));
  await waitFor(() => expect(discountRegistrationAction).toHaveBeenCalledWith('reg', expect.objectContaining({ monto: 600, expectedCollected: 400 })));
  fireEvent.click(await screen.findByRole('button', { name: /Registrar salida/ }));
  await waitFor(() => expect(closeRegistrationAction).toHaveBeenCalledWith('reg', expect.objectContaining({ closeType: 'NO_CHARGE', expectedPrice: 400, expectedCollected: 400 })));
});
