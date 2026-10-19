/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { CloseTicketPanel } from './close-ticket-panel';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { discountRegistrationAction } from '@/actions/tickets/discount-registration.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
import { pagoParcialEfectivoAction } from '@/actions/tickets/pago-parcial.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import type { CloseSummary } from '@/services/tickets.service';
import type { TicketRegistration } from '@/types/ticket-registration.type';
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/actions/tickets/search-active-registrations.action', () => ({ searchActiveRegistrationsAction: jest.fn() }));
jest.mock('@/actions/tickets/get-close-summary.action', () => ({ getCloseSummaryAction: jest.fn() }));
jest.mock('@/actions/tickets/discount-registration.action', () => ({ discountRegistrationAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-datos.action', () => ({ corregirDatosEstadiaAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn().mockResolvedValue([]) }));
jest.mock('@/actions/tickets/close-registration.action', () => ({ closeRegistrationAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/tickets/pago-parcial.action', () => ({ pagoParcialEfectivoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: async () => ({ datos: null }), cobroAliasDeEstadiaAction: async () => ({ cobro: null }), iniciarCobroAliasAction: jest.fn() }));
jest.mock('./cobro-qr-mercadopago', () => ({ CobroQrMercadoPago: () => null }));
jest.mock('./cobro-alias', () => ({ CobroAliasPanel: () => null }));
jest.mock('./eliminar-estadia', () => ({ EliminarEstadia: () => null }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: ({ onRecognized }: { onRecognized: (plate: string) => void }) => <button type="button" onClick={() => onRecognized('SO128AA')}>Escanear patente</button> }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
const summary = (price = 1000, collected = 0) => ({ registration: { id: 'reg', vehicleType: 'AUTO', entryMode: 'PLATE', licensePlateOriginal: 'AB123CD', entryDay: '2026-10-10', entryTime: '10:00:00' }, elapsedMinutes: 30, previewBracket: { price }, saldoACobrar: price - collected, cambioARetornar: 0, totalCollectedSoFar: collected, pricingDayTypeBasis: 'ENTRY' } as CloseSummary);
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
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
test('el cálculo se despliega sin ocultar los medios de pago', async () => {
  const datos = summary();
  datos.previewBracket.breakdown = [];
  jest.mocked(getCloseSummaryAction).mockResolvedValue(datos);
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={jest.fn()} />);
  const detalle = await screen.findByRole('button', { name: /Ver cálculo/ });
  await waitFor(() => expect(screen.getByRole('button', { name: /^Efectivo Contalo/ })).toBeEnabled());
  expect(detalle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/Se usa el precio de la hora/)).not.toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/cobro-mobile-inicial.html', document.body.innerHTML);
  fireEvent.click(detalle);
  expect(detalle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/Se usa el precio de la hora/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Efectivo Contalo/ })).toBeVisible();
  fireEvent.click(detalle);
  expect(screen.queryByText(/Se usa el precio de la hora/)).not.toBeInTheDocument();
});
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
  const cash = await screen.findByRole('button', { name: /^Efectivo Contalo/ });
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

test('sin buscar: primero los de más de 4 h sin confirmar; «Sigue» los pasa a la lista común', async () => {
  const estadia = (id: string, plate: string, entryTime: string, entryDay: string) => ({ id, vehicleType: 'AUTO', entryMode: 'PLATE', licensePlateOriginal: plate, entryDay, entryTime } as unknown as TicketRegistration);
  // Entró hace 10 minutos, con fecha y hora del mismo instante (también cerca de la medianoche).
  const entrada = new Date(Date.now() - 10 * 60_000);
  const dia = entrada.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const hora = entrada.toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false });
  jest.mocked(searchActiveRegistrationsAction).mockResolvedValue([estadia('vieja', 'AE567YU', '10:00:00', '2026-10-10'), estadia('nueva', 'CD453RT', hora, dia)]);
  render(<CloseTicketPanel open onOpenChange={jest.fn()} />);
  expect(await screen.findByText('Sin confirmar · más de 4 h · 1')).toBeInTheDocument();
  expect(screen.getByText('Los demás · 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'AE567YU sigue en la playa' }));
  expect(screen.queryByText(/Sin confirmar/)).not.toBeInTheDocument();
  expect(screen.getByText('Adentro ahora · 2')).toBeInTheDocument();
});

test('buscar escaneando: además de las que coinciden muestra las patentes parecidas para cobrarlas', async () => {
  const estadia = (id: string, plate: string, parecida?: boolean) => ({ id, vehicleType: 'AUTO', entryMode: 'PLATE', licensePlateOriginal: plate, entryDay: '2026-10-10', entryTime: '10:00:00', parecida } as unknown as TicketRegistration);
  jest.mocked(searchActiveRegistrationsAction).mockImplementation(async (q: string) => (q ? [estadia('par', 'SO123AA', true)] : [estadia('otra', 'ZZ999ZZ')]));
  const onSalidaSinEntrada = jest.fn();
  render(<CloseTicketPanel open onOpenChange={jest.fn()} onSalidaSinEntrada={onSalidaSinEntrada} />);
  // Entró hace días: sin buscar, aparece primero entre los que nadie confirmó.
  expect(await screen.findByText('Sin confirmar · más de 4 h · 1')).toBeInTheDocument();
  // Como en Registrar entrada, lo escrito queda en mayúsculas.
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar vehículo' }), { target: { value: 'so1' } });
  expect(screen.getByRole('textbox', { name: 'Buscar vehículo' })).toHaveValue('SO1');
  expect(searchActiveRegistrationsAction).toHaveBeenLastCalledWith('SO1');
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  expect(await screen.findByText('Patente parecida')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Buscar vehículo' })).toHaveValue('SO128AA');
  expect(screen.queryByText(/No encontramos ese vehículo/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /No es ninguno, se va sin entrada/ }));
  expect(onSalidaSinEntrada).toHaveBeenCalledWith('SO128AA');
  fireEvent.click(screen.getByRole('button', { name: /SO123AA|SO 123 AA/ }));
  await waitFor(() => expect(getCloseSummaryAction).toHaveBeenCalledWith('par'));
});

test('efectivo y transferencia: se escribe el efectivo, el resto va por transferencia y se mandan las dos partes', async () => {
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={jest.fn()} />);
  const hibrido = await screen.findByRole('button', { name: /Efectivo y otro medio/ });
  await waitFor(() => expect(hibrido).toBeEnabled());
  fireEvent.click(hibrido);
  const cobrar = screen.getByRole('button', { name: /Cobrar y registrar salida/ });
  expect(cobrar).toBeDisabled();
  const efectivo = screen.getByLabelText('En efectivo');
  fireEvent.change(efectivo, { target: { value: '1000' } });
  expect(screen.getByRole('alert')).toHaveTextContent('El efectivo cubre todo');
  expect(cobrar).toBeDisabled();
  fireEvent.change(efectivo, { target: { value: '400' } });
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/cobro-mobile-mixto.html', document.body.innerHTML);
  expect(screen.getByText('El resto').parentElement).toHaveTextContent(/600$/);
  // Sin alias habilitado, el resto se elige entre transferencia (por defecto) y QR.
  expect(screen.getByRole('button', { name: 'Transferencia' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'Al alias' })).not.toBeInTheDocument();
  expect(cobrar).toBeEnabled();
  fireEvent.click(cobrar);
  await waitFor(() => expect(closeRegistrationAction).toHaveBeenCalledWith('reg', expect.objectContaining({
    closeType: 'PAYMENT', metodo: undefined, expectedPrice: 1000,
    pagos: [{ metodo: 'CASH', importe: 400 }, { metodo: 'TRANSFER', importe: 600 }],
  })));
  expect(pagoParcialEfectivoAction).not.toHaveBeenCalled();
});

test('efectivo y QR: primero se cobra el efectivo sin la salida y después el QR pide el resto', async () => {
  jest.mocked(pagoParcialEfectivoAction).mockResolvedValue({ summary: summary(1000, 400) });
  jest.mocked(crearCobroMercadoPagoAction).mockResolvedValue({ cobro: { id: 'qr', estado: 'PENDIENTE', monto: 600 } } as unknown as Awaited<ReturnType<typeof crearCobroMercadoPagoAction>>);
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={jest.fn()} />);
  const hibrido = await screen.findByRole('button', { name: /Efectivo y otro medio/ });
  await waitFor(() => expect(hibrido).toBeEnabled());
  fireEvent.click(hibrido);
  fireEvent.change(screen.getByLabelText('En efectivo'), { target: { value: '400' } });
  fireEvent.click(screen.getByRole('button', { name: 'QR' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobrar efectivo y mostrar el QR/ }));
  await waitFor(() => expect(crearCobroMercadoPagoAction).toHaveBeenCalledWith('reg'));
  expect(pagoParcialEfectivoAction).toHaveBeenCalledWith('reg', { importe: 400, expectedPrice: 1000, expectedCollected: 0 });
  expect(jest.mocked(pagoParcialEfectivoAction).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(crearCobroMercadoPagoAction).mock.invocationCallOrder[0]);
  expect(closeRegistrationAction).not.toHaveBeenCalled();
});

test('tarifa anterior: si pagó tarde, el descuento deja el precio del escalón anterior con un toque', async () => {
  jest.mocked(getCloseSummaryAction).mockResolvedValue({ ...summary(7000), tarifaAnterior: { precio: 3500, etiqueta: 'Hasta 1 hora', hastaMinutos: 70, descuento: 3500 } });
  jest.mocked(discountRegistrationAction).mockResolvedValue({ summary: summary(3500) });
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={jest.fn()} />);
  const button = await screen.findByRole('button', { name: 'Descuento' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(await screen.findByRole('button', { name: 'Tarifa anterior' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Se cobra Hasta 1 hora')).toBeInTheDocument();
  expect(screen.getByLabelText('Motivo del descuento')).toHaveValue('Se cobra la tarifa anterior (Hasta 1 hora): demoró en pagar');
  fireEvent.click(screen.getByRole('button', { name: /Aplicar descuento/ }));
  await waitFor(() => expect(discountRegistrationAction).toHaveBeenCalledWith('reg', { monto: 3500, motivo: 'Se cobra la tarifa anterior (Hasta 1 hora): demoró en pagar', expectedPrice: 7000, expectedCollected: 0 }));
});
