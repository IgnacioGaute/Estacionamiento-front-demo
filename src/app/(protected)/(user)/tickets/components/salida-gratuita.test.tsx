/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CloseTicketPanel } from './close-ticket-panel';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import { registrarSalidaGratuitaAction } from '@/actions/tickets/registrar-salida-gratuita.action';
import { toast } from '@/lib/toast';
import type { SalidaGratuitaSummary } from '@/services/tickets.service';
import type { TicketRegistration } from '@/types/ticket-registration.type';
// useTenant vive junto a la acción de contexto (next-auth): se simula con una playa con cobro.
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ cobroHabilitado: true }) }));
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/actions/tickets/search-active-registrations.action', () => ({ searchActiveRegistrationsAction: jest.fn().mockResolvedValue([]) }));
jest.mock('@/actions/tickets/get-close-summary.action', () => ({ getCloseSummaryAction: jest.fn() }));
jest.mock('@/actions/tickets/registrar-salida-gratuita.action', () => ({ registrarSalidaGratuitaAction: jest.fn() }));
jest.mock('@/actions/tickets/discount-registration.action', () => ({ discountRegistrationAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-datos.action', () => ({ corregirDatosEstadiaAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn().mockResolvedValue([]) }));
jest.mock('@/actions/tickets/close-registration.action', () => ({ closeRegistrationAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/tickets/pago-parcial.action', () => ({ pagoParcialEfectivoAction: jest.fn() }));
jest.mock('@/actions/tickets/salida-anterior.action', () => ({ registrarSalidaAnteriorAction: jest.fn() }));
const aliasCobroDeEstadia = jest.fn(async () => ({ cobro: null }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: async () => ({ datos: null }), cobroAliasDeEstadiaAction: (...a: unknown[]) => aliasCobroDeEstadia(...(a as [])), iniciarCobroAliasAction: jest.fn() }));
jest.mock('./cobro-qr-mercadopago', () => ({ CobroQrMercadoPago: () => null }));
jest.mock('./cobro-alias', () => ({ CobroAliasPanel: () => null }));
jest.mock('./eliminar-estadia', () => ({ EliminarEstadia: () => null }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: () => null }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

// La salida de una estadía que ingresó gratis: el panel compartido de salida (lo abren la lista,
// el buscador, el lector de tarjetas y la cámara) muestra el vehículo y la permanencia, sin
// importes ni medios de pago, y registra la salida con su propia ruta.
const gratuita = (): SalidaGratuitaSummary => ({
  modalidad: 'GRATUITO',
  elapsedMinutes: 95,
  registration: { id: 'reg', vehicleType: 'AUTO', entryMode: 'PLATE', modalidad: 'GRATUITO', licensePlateOriginal: 'AB123CD', entryDay: '2026-10-19', entryTime: '10:00:00', entryOperatorName: 'Ana Operadora' } as TicketRegistration,
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.mocked(getCloseSummaryAction).mockResolvedValue(gratuita());
  jest.mocked(registrarSalidaGratuitaAction).mockResolvedValue({ registration: gratuita().registration });
});

test('una estadía gratuita sale sin importes, medios de pago ni descuentos', async () => {
  const onOpenChange = jest.fn();
  const onSuccess = jest.fn();
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={onOpenChange} onSuccess={onSuccess} onAdvance={jest.fn()} />);
  const boton = await screen.findByRole('button', { name: /Registrar salida/ });
  expect(screen.getByRole('heading', { name: 'Registrar salida' })).toBeInTheDocument();
  expect(screen.getAllByText('1 h 35 min', { exact: false }).length).toBeGreaterThan(0);
  expect(screen.getByText('Ana Operadora')).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\$|Cortesía|Descuento|Anticipo|Efectivo|Cobrar/);
  // Sin importes no hay un cobro por alias que retomar.
  expect(aliasCobroDeEstadia).not.toHaveBeenCalled();
  fireEvent.click(boton);
  await waitFor(() => expect(registrarSalidaGratuitaAction).toHaveBeenCalledWith('reg'));
  expect(closeRegistrationAction).not.toHaveBeenCalled();
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(onSuccess).toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith('Salida registrada');
});

test('si la salida falla se avisa y se vuelve a cargar la estadía, sin cerrar', async () => {
  jest.mocked(registrarSalidaGratuitaAction).mockResolvedValue({ error: 'Esta estadía ingresó con cobro: registrá la salida desde Cobrar salida.', code: 'ESTADIA_CON_COBRO' });
  const onOpenChange = jest.fn();
  render(<CloseTicketPanel open initialRegistrationId="reg" onOpenChange={onOpenChange} />);
  fireEvent.click(await screen.findByRole('button', { name: /Registrar salida/ }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('ingresó con cobro')));
  expect(getCloseSummaryAction).toHaveBeenCalledTimes(2);
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
});
