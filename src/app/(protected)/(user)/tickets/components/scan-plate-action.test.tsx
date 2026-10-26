/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScanPlateAction } from './scan-plate-action';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import type { PlateStatus } from '@/types/plate-status.type';
import { detectVehicleTypeAction } from '@/actions/tickets/detect-vehicle-type.action';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/get-plate-status.action', () => ({ getPlateStatusAction: jest.fn() }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: ({ onRecognized }: { onRecognized: (plate: string, foto?: File) => void }) => <>
  <button onClick={() => onRecognized('AB123CD')}>Escanear patente</button>
  <button onClick={() => onRecognized('AB123CD', new File(['x'], 'cuadro.jpg', { type: 'image/jpeg' }))}>Escanear con foto</button>
</> }));
jest.mock('@/actions/tickets/detect-vehicle-type.action', () => ({ detectVehicleTypeAction: jest.fn() }));
const callbacks = () => ({ onEntry: jest.fn(), onHourlyExit: jest.fn(), onDailyExit: jest.fn() });
beforeEach(() => jest.clearAllMocks());

test('una patente nueva abre la entrada precargada sin registrar ni cobrar', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [] } });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await waitFor(() => expect(handlers.onEntry).toHaveBeenCalledWith('AB123CD'));
  expect(handlers.onHourlyExit).not.toHaveBeenCalled();
  expect(handlers.onDailyExit).not.toHaveBeenCalled();
});

test('la estadía activa abre directamente su salida', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [{ id: 'hourly' }], daily: [] } as unknown as PlateStatus });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await waitFor(() => expect(handlers.onHourlyExit).toHaveBeenCalledWith('hourly', 'ESCANER'));
  expect(handlers.onEntry).not.toHaveBeenCalled();
});

test('un abono activo abre su detalle de salida', async () => {
  const daily = { id: 'daily', vehiclePlateCustomer: 'AB123CD' };
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [daily] } as unknown as PlateStatus });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await waitFor(() => expect(handlers.onDailyExit).toHaveBeenCalledWith(daily));
  expect(handlers.onEntry).not.toHaveBeenCalled();
});

test('una consulta fallida nunca se interpreta como vehículo nuevo y permite reintentar', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValueOnce({ error: 'Sin conexión' }).mockResolvedValueOnce({ data: { plate: 'AB123CD', hourly: [], daily: [] } });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await screen.findByRole('alert');
  expect(handlers.onEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Reintentar consulta/ }));
  await waitFor(() => expect(handlers.onEntry).toHaveBeenCalledWith('AB123CD'));
});

test('sin coincidencia exacta, una patente parecida adentro se ofrece antes de abrir una entrada', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [
    { id: 'parecida', licensePlateOriginal: 'AB128CD', entryDay: '2026-10-14', entryTime: '14:02:00' },
  ] } as unknown as PlateStatus });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await screen.findByRole('dialog');
  expect(handlers.onEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /AB128CD/ }));
  // Elegir una parecida es corregir la lectura del escáner.
  expect(handlers.onHourlyExit).toHaveBeenCalledWith('parecida', 'CORREGIDA');
});

test('si la parecida es otro auto, se registra la entrada de la patente leída', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [
    { id: 'parecida', licensePlateOriginal: 'AB128CD', entryDay: '2026-10-14', entryTime: '14:02:00' },
  ] } as unknown as PlateStatus });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  fireEvent.click(await screen.findByRole('button', { name: /No, es otro/ }));
  expect(handlers.onEntry).toHaveBeenCalledWith('AB123CD', true);
  expect(handlers.onHourlyExit).not.toHaveBeenCalled();
});

test('varios registros con la misma patente requieren elegir la estadía', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [
    { id: 'one', licensePlateOriginal: 'AB123CD', entryDay: '2026-10-06', entryTime: '08:00' },
    { id: 'two', licensePlateOriginal: 'AB123CD', entryDay: '2026-10-06', entryTime: '09:00' },
  ], daily: [] } as unknown as PlateStatus });
  const handlers = callbacks(); render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await screen.findByRole('dialog');
  expect(handlers.onHourlyExit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /09:00/ }));
  expect(handlers.onHourlyExit).toHaveBeenCalledWith('two', 'ESCANER');
});

test('una patente que no está adentro pregunta si entra o se va antes de abrir la entrada', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [] } });
  const handlers = { ...callbacks(), onSalidaSinEntrada: jest.fn() }; render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  await screen.findByText('AB123CD no está adentro');
  expect(handlers.onEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Está entrando/ }));
  expect(handlers.onEntry).toHaveBeenCalledWith('AB123CD');
});

test('mientras pregunta si entra o se va, ya detecta el vehículo y la entrada recibe esa detección', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [] } });
  jest.mocked(detectVehicleTypeAction).mockResolvedValue({ vehicleType: 'CAMIONETA', modelo: 'Fiat Strada' });
  const handlers = { ...callbacks(), onSalidaSinEntrada: jest.fn() }; render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear con foto' }));
  await screen.findByText('AB123CD no está adentro');
  // Empezó antes de que el operador responda.
  expect(detectVehicleTypeAction).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Está entrando/ }));
  const [plate, revisadas, vehiculo] = handlers.onEntry.mock.calls[0];
  expect([plate, revisadas]).toEqual(['AB123CD', undefined]);
  await expect(vehiculo).resolves.toEqual({ vehicleType: 'CAMIONETA', modelo: 'Fiat Strada' });
});

test('si se está yendo sin entrada, se cobra igual en vez de registrar una entrada', async () => {
  jest.mocked(getPlateStatusAction).mockResolvedValue({ data: { plate: 'AB123CD', hourly: [], daily: [], similares: [] } });
  const handlers = { ...callbacks(), onSalidaSinEntrada: jest.fn() }; render(<ScanPlateAction {...handlers} />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear patente' }));
  fireEvent.click(await screen.findByRole('button', { name: /Se está yendo/ }));
  expect(handlers.onSalidaSinEntrada).toHaveBeenCalledWith('AB123CD');
  expect(handlers.onEntry).not.toHaveBeenCalled();
});
