/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdvancePaymentDialog } from './advance-payment-dialog';
import { addAdvancePaymentAction } from '@/actions/tickets/add-advance-payment.action';
import { previewPlannedStayAction } from '@/actions/tickets/preview-price.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/add-advance-payment.action', () => ({ addAdvancePaymentAction: jest.fn() }));
jest.mock('@/actions/tickets/preview-price.action', () => ({ previewPlannedStayAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: jest.fn(), iniciarCobroAliasAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('./cobro-qr-mercadopago', () => ({ CobroQrMercadoPago: () => <p>QR del anticipo</p> }));
jest.mock('./cobro-alias', () => ({ CobroAliasPanel: () => <p>Esperando la transferencia</p> }));

const franjas = [
  { id: 'h1', vehicleType: 'AUTO', uptoMinutes: 60, label: '1 hora', price: 3500 },
  { id: 'h2', vehicleType: 'AUTO', uptoMinutes: 120, label: '2 horas', price: 7000 },
] as unknown as TicketPriceBracket[];
const estadia = { id: 'r1', advancePaidAmount: 0, lastNameCustomer: null, expectedUptoMinutes: null } as unknown as TicketRegistration;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(previewPlannedStayAction).mockResolvedValue({ price: 7000, ticketDayType: 'DAY' });
  jest.mocked(disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: true } } as never);
  jest.mocked(addAdvancePaymentAction).mockResolvedValue({ success: 'ok' } as never);
});

async function abrirYElegir(duracion: string) {
  render(<AdvancePaymentDialog registrationId="r1" vehicleType="AUTO" existingRegistration={estadia} priceBrackets={franjas} open onOpenChange={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: duracion }));
  await screen.findByText('$ 7.000');
}

test('no ofrece cobrar al salir: se elige la duración y se cobra en efectivo', async () => {
  await abrirYElegir('2 horas');
  expect(screen.queryByText(/Cobrar al salir|Sin definir/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Efectivo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Cobrar \$\s7\.000/ }));
  await waitFor(() => expect(addAdvancePaymentAction).toHaveBeenCalledWith('r1', expect.objectContaining({ chargeFullPlannedStay: true, metodo: 'CASH', expectedUptoMinutes: 120, expectedBracketLabel: '2 horas' })));
});

test('con QR pide el cobro como anticipo de la duración elegida', async () => {
  jest.mocked(crearCobroMercadoPagoAction).mockResolvedValue({ cobro: { id: 'c1' } } as never);
  await abrirYElegir('2 horas');
  fireEvent.click(screen.getByRole('button', { name: /QR/ }));
  fireEvent.click(screen.getByRole('button', { name: /Mostrar el QR/ }));
  await screen.findByText('QR del anticipo');
  expect(crearCobroMercadoPagoAction).toHaveBeenCalledWith('r1', 'HORA', { anticipoMinutos: 120, anticipoEtiqueta: '2 horas' });
  expect(addAdvancePaymentAction).not.toHaveBeenCalled();
});

test('al alias espera la transferencia del anticipo', async () => {
  jest.mocked(iniciarCobroAliasAction).mockResolvedValue({ datos: { id: 'a1', estado: 'ESPERANDO' } } as never);
  await abrirYElegir('2 horas');
  fireEvent.click(screen.getByRole('button', { name: /Al alias/ }));
  fireEvent.click(screen.getByRole('button', { name: /Esperar la transferencia/ }));
  await screen.findByText('Esperando la transferencia');
  expect(iniciarCobroAliasAction).toHaveBeenCalledWith('r1', 'HORA', { anticipoMinutos: 120, anticipoEtiqueta: '2 horas' });
});
