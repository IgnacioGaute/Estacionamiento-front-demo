/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SalidaSinEntradaDialog } from './salida-sin-entrada-dialog';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/create-registration-by-plate.action', () => ({ createRegistrationByPlateAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getVehicleTypesAction).mockResolvedValue([{ code: 'AUTO', name: 'Auto', enabled: true }]);
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ success: 'ok', registrationId: 'nueva' } as never);
  jest.mocked(corregirEntradaAction).mockResolvedValue({ summary: {} as never });
});

test('registra la entrada con la hora en que llegó y abre el cobro', async () => {
  const onCobrar = jest.fn();
  render(<SalidaSinEntradaDialog plate="AB123CD" onClose={jest.fn()} onCobrar={onCobrar} />);
  await screen.findByRole('radio', { name: 'Auto' });
  fireEvent.click(screen.getByRole('button', { name: 'Hace 2 h' }));
  const confirmar = screen.getByRole('button', { name: /Registrar y cobrar/ });
  await waitFor(() => expect(confirmar).toBeEnabled());
  fireEvent.click(confirmar);
  await waitFor(() => expect(onCobrar).toHaveBeenCalledWith('nueva'));
  expect(createRegistrationByPlateAction).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: 'AB123CD', vehicleType: 'AUTO' }));
  const entrada = new Date(jest.mocked(corregirEntradaAction).mock.calls[0][1]).getTime();
  expect(Math.round((Date.now() - entrada) / 60000)).toBeGreaterThanOrEqual(119);
});

test('si ya estaba adentro, cobra esa estadía', async () => {
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ error: { code: 'DUPLICATE_ACTIVE_PLATE', message: 'Ya está', existingRegistrationId: 'existente' } } as never);
  const onCobrar = jest.fn();
  render(<SalidaSinEntradaDialog plate="AB123CD" onClose={jest.fn()} onCobrar={onCobrar} />);
  await screen.findByRole('radio', { name: 'Auto' });
  fireEvent.click(screen.getByRole('button', { name: 'Hace 1 h' }));
  const confirmar = screen.getByRole('button', { name: /Registrar y cobrar/ });
  await waitFor(() => expect(confirmar).toBeEnabled());
  fireEvent.click(confirmar);
  await waitFor(() => expect(onCobrar).toHaveBeenCalledWith('existente'));
  expect(corregirEntradaAction).not.toHaveBeenCalled();
});
