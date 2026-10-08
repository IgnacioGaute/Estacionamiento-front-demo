/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EntryByPlateDialog } from './entry-by-plate-dialog';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import type { FrequentCustomer } from '@/types/frequent-customer.type';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { token: 'test' } }) }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ playaId: 'playa' }) }));
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/actions/tickets/get-frequent-customers.action', () => ({ getFrequentCustomersAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn() }));
jest.mock('@/actions/tickets/create-registration-by-plate.action', () => ({ createRegistrationByPlateAction: jest.fn() }));
jest.mock('@/services/scanner.service', () => ({ startScanner: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: ({ onRecognized }: { onRecognized: (plate: string) => void }) => <button type="button" onClick={() => onRecognized('AB123CD')}>Escanear patente con la cámara</button> }));
const customer = { licensePlateOriginal: 'AB123CD', licensePlateNormalized: 'AB123CD', lastNameCustomer: 'Pérez', phoneCustomer: '5491112345678', vehicleType: 'MOTO', visits: 4 } as FrequentCustomer;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getFrequentCustomersAction).mockResolvedValue([]);
  jest.mocked(getVehicleTypesAction).mockResolvedValue([
    { code: 'AUTO', name: 'Auto', enabled: true }, { code: 'MOTO', name: 'Moto', enabled: true },
    { code: 'VAN', name: 'Utilitario', enabled: true }, { code: 'BUS', name: 'Bus', enabled: false },
  ]);
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ success: 'Entrada registrada', registrationId: 'created' });
});
async function open() {
  render(<EntryByPlateDialog />);
  fireEvent.click(screen.getByRole('button', { name: /Registrar entrada/ }));
  await screen.findByRole('radio', { name: 'Auto' });
  return screen.getByLabelText('Patente, apellido o teléfono');
}

test('un solo campo busca frecuentes y permite editar los datos y el vehículo antes de confirmar', async () => {
  jest.mocked(getFrequentCustomersAction).mockResolvedValue([customer]);
  const input = await open();
  fireEvent.change(input, { target: { value: 'AB' } });
  fireEvent.click(await screen.findByRole('button', { name: /AB123CD.*Pérez/ }));
  expect(input).toHaveValue('AB123CD');
  expect(screen.getByLabelText('Apellido')).toHaveValue('Pérez');
  expect(screen.getByLabelText('WhatsApp')).toHaveValue('5491112345678');
  expect(screen.getByRole('radio', { name: 'Moto' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.queryByRole('radio', { name: 'Bus' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Utilitario' }));
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'García' } });
  // El botón repite qué se registra: «Registrar entrada · AB123CD · Utilitario».
  const confirmar = within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ });
  expect(confirmar).toHaveTextContent('AB123CD · Utilitario');
  fireEvent.click(confirmar);
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: 'AB123CD', vehicleType: 'VAN', lastNameCustomer: 'García' })));
});

test('el escaneo identifica automáticamente al frecuente sin crear la entrada', async () => {
  jest.mocked(getFrequentCustomersAction).mockResolvedValue([customer]);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  await screen.findByText('Cliente frecuente identificado');
  expect(screen.getByLabelText('Patente, apellido o teléfono')).toHaveValue('AB123CD');
  expect(screen.getByLabelText('Apellido')).toHaveValue('Pérez');
  expect(createRegistrationByPlateAction).not.toHaveBeenCalled();
});

test('el acceso rápido abre el formulario con la patente y descarta coincidencias tardías de otra búsqueda', async () => {
  let finish!: (rows: FrequentCustomer[]) => void;
  jest.mocked(getFrequentCustomersAction).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue([]);
  render(<EntryByPlateDialog scanRequest={{ plate: 'AB123CD', sequence: 1 }} />);
  const input = await screen.findByLabelText('Patente, apellido o teléfono');
  expect(input).toHaveValue('AB123CD');
  await waitFor(() => expect(getFrequentCustomersAction).toHaveBeenCalled());
  fireEvent.change(input, { target: { value: 'ZZ999ZZ' } });
  await act(async () => finish([customer]));
  expect(input).toHaveValue('ZZ999ZZ');
  expect(screen.getByLabelText('Apellido')).toHaveValue('');
  expect(screen.queryByText('Cliente frecuente identificado')).not.toBeInTheDocument();
});
