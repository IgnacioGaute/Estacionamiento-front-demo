/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EntryByPlateDialog } from './entry-by-plate-dialog';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import { detectVehicleTypeAction } from '@/actions/tickets/detect-vehicle-type.action';
import type { FrequentCustomer } from '@/types/frequent-customer.type';
import type { PlateStatus } from '@/types/plate-status.type';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/get-plate-status.action', () => ({ getPlateStatusAction: jest.fn() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { token: 'test' } }) }));
const tenant = { playaId: 'playa', cobroHabilitado: true };
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => tenant }));
jest.mock('@/components/parking-receipt-delivery', () => ({ ParkingReceiptDelivery: () => null }));
jest.mock('@/actions/tickets/get-frequent-customers.action', () => ({ getFrequentCustomersAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn() }));
jest.mock('@/actions/tickets/create-registration-by-plate.action', () => ({ createRegistrationByPlateAction: jest.fn() }));
jest.mock('@/services/scanner.service', () => ({ startScanner: jest.fn() }));
jest.mock('@/actions/tickets/detect-vehicle-type.action', () => ({ detectVehicleTypeAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: ({ onRecognized }: { onRecognized: (plate: string, foto?: File) => void }) => <button type="button" onClick={() => onRecognized('AB123CD', new File(['x'], 'cuadro.jpg', { type: 'image/jpeg' }))}>Escanear patente con la cámara</button> }));
const customer = { licensePlateOriginal: 'AB123CD', licensePlateNormalized: 'AB123CD', lastNameCustomer: 'Pérez', phoneCustomer: '5491112345678', vehicleType: 'MOTO', visits: 4 } as FrequentCustomer;
beforeEach(() => {
  jest.clearAllMocks();
  tenant.cobroHabilitado = true;
  jest.mocked(getFrequentCustomersAction).mockResolvedValue([]);
  jest.mocked(getVehicleTypesAction).mockResolvedValue([
    { code: 'AUTO', name: 'Auto', enabled: true }, { code: 'MOTO', name: 'Moto', enabled: true },
    { code: 'VAN', name: 'Utilitario', enabled: true }, { code: 'BUS', name: 'Bus', enabled: false },
  ]);
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ success: 'Entrada registrada', registrationId: 'created' });
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [] } });
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
  // Con cobro también se puede cargar el modelo; el DNI es solo de la playa gratuita.
  expect(screen.getByLabelText('Modelo del vehículo')).toBeInTheDocument();
  expect(screen.queryByLabelText('DNI')).not.toBeInTheDocument();
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

test('en la playa gratuita los datos opcionales son apellido, DNI y modelo, sin WhatsApp', async () => {
  tenant.cobroHabilitado = false;
  const input = await open();
  fireEvent.click(screen.getByRole('button', { name: /Agregar apellido, DNI o modelo/ }));
  expect(screen.queryByLabelText('WhatsApp')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Moto' }));
  fireEvent.change(input, { target: { value: 'AB123CD' } });
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Gómez' } });
  fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '30.123.456' } });
  // Al escribir aparecen sugerencias; elegir una completa el nombre exacto y cierra la lista.
  const modelo = screen.getByLabelText('Modelo del vehículo');
  fireEvent.focus(modelo);
  fireEvent.change(modelo, { target: { value: 'wave' } });
  fireEvent.click(screen.getByRole('option', { name: /Honda Wave 110/ }));
  expect(modelo).toHaveValue('Honda Wave 110');
  expect(screen.queryByRole('listbox', { name: 'Modelos sugeridos' })).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenCalledWith(expect.objectContaining({
    lastNameCustomer: 'Gómez', documentoCustomer: '30123456', modeloVehiculo: 'Honda Wave 110', vehicleType: 'MOTO',
  })));
});

test('la foto del escaneo sugiere el tipo y el modelo, sin pisar el modelo escrito', async () => {
  let responder!: (valor: Awaited<ReturnType<typeof detectVehicleTypeAction>>) => void;
  jest.mocked(detectVehicleTypeAction).mockImplementation(() => new Promise((resolve) => { responder = resolve; }));
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  // Una sola carga, en el lugar de los botones de tipo.
  expect(await screen.findByText('Detectando el vehículo…')).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Auto' })).not.toBeInTheDocument();
  await act(async () => responder({ vehicleType: 'MOTO', modelo: 'Honda Wave 110' }));
  expect(screen.getByRole('radio', { name: 'Moto' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByText(/Tipo detectado: Moto/)).toBeInTheDocument();
  // El modelo completa el campo vacío y abre los datos opcionales.
  expect(screen.getByLabelText('Modelo del vehículo')).toHaveValue('Honda Wave 110');
  expect(screen.getByText(/Modelo: Honda Wave 110/)).toBeInTheDocument();

  // Otro escaneo: el tipo se vuelve a sugerir, pero el modelo ya cargado no se pisa.
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  await act(async () => responder({ vehicleType: 'AUTO', modelo: 'Fiat Strada' }));
  expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByLabelText('Modelo del vehículo')).toHaveValue('Honda Wave 110');
});

test('en la playa gratuita también se detecta el vehículo', async () => {
  tenant.cobroHabilitado = false;
  jest.mocked(detectVehicleTypeAction).mockResolvedValue({ vehicleType: 'MOTO', modelo: null });
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  expect(await screen.findByText(/Tipo detectado: Moto/)).toBeInTheDocument();
  expect(screen.queryByText(/Modelo:/)).not.toBeInTheDocument();
});

test('la entrada abierta desde el escáner usa la detección que ya empezó', async () => {
  const { rerender } = render(<EntryByPlateDialog />);
  rerender(<EntryByPlateDialog scanRequest={{ plate: 'AD920HV', sequence: 1, vehiculo: Promise.resolve({ vehicleType: 'MOTO', modelo: 'Fiat Strada' }) }} />);
  expect(await screen.findByText(/Tipo detectado: Moto/)).toBeInTheDocument();
  expect(screen.getByLabelText('Patente, apellido o teléfono')).toHaveValue('AD920HV');
  expect(screen.getByLabelText('Modelo del vehículo')).toHaveValue('Fiat Strada');
  expect(detectVehicleTypeAction).not.toHaveBeenCalled();
});

test('una patente escrita a mano entra como manual', async () => {
  const input = await open();
  fireEvent.change(input, { target: { value: 'AA111BB' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenLastCalledWith(expect.objectContaining({ licensePlate: 'AA111BB', origen: 'MANUAL' })));
});

test('la patente que leyó el escáner, sin cambios, entra como escáner', async () => {
  const input = await open();
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  expect(input).toHaveValue('AB123CD');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenLastCalledWith(expect.objectContaining({ licensePlate: 'AB123CD', origen: 'ESCANER' })));
});

test('si el operador corrige la patente que leyó el escáner, la entrada queda como corregida', async () => {
  const input = await open();
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente con la cámara' }));
  fireEvent.change(input, { target: { value: 'AB128CD' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenLastCalledWith(expect.objectContaining({ licensePlate: 'AB128CD', origen: 'CORREGIDA' })));
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

test('una patente parecida adentro se ofrece antes de registrar la entrada', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [
    { id: 'parecida', licensePlateOriginal: 'AB128CD', entryTime: '14:02:00' },
  ] } as unknown as PlateStatus });
  const onGoToRegistration = jest.fn();
  render(<EntryByPlateDialog onGoToRegistration={onGoToRegistration} />);
  fireEvent.click(screen.getByRole('button', { name: /Registrar entrada/ }));
  await screen.findByRole('radio', { name: 'Auto' });
  fireEvent.change(screen.getByLabelText('Patente, apellido o teléfono'), { target: { value: 'AB123CD' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  await screen.findByText('Hay una patente parecida adentro', undefined, { timeout: 4000 });
  expect(createRegistrationByPlateAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Entró a las 14:02/ }));
  expect(onGoToRegistration).toHaveBeenCalledWith('parecida');
});

test('si la parecida es otro auto, la entrada se registra igual', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [
    { id: 'parecida', licensePlateOriginal: 'AB128CD', entryTime: '14:02:00' },
  ] } as unknown as PlateStatus });
  const input = await open();
  fireEvent.change(input, { target: { value: 'AB123CD' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Registrar entrada/ }));
  // Aparece mientras termina la consulta anterior: se toca cuando ya está habilitado.
  const esOtro = await screen.findByRole('button', { name: /Es otro auto/ }, { timeout: 4000 });
  await waitFor(() => expect(esOtro).toBeEnabled(), { timeout: 4000 });
  fireEvent.click(esOtro);
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: 'AB123CD' })), { timeout: 4000 });
});
