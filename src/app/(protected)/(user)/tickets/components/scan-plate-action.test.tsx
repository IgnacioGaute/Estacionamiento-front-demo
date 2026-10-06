/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScanPlateAction } from './scan-plate-action';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import type { PlateStatus } from '@/types/plate-status.type';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/get-plate-status.action', () => ({ getPlateStatusAction: jest.fn() }));
jest.mock('./plate-camera-scan-button', () => ({ PlateCameraScanButton: ({ onRecognized }: { onRecognized: (plate: string) => void }) => <button onClick={() => onRecognized('AB123CD')}>Escanear patente</button> }));
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
  await waitFor(() => expect(handlers.onHourlyExit).toHaveBeenCalledWith('hourly'));
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
  expect(handlers.onHourlyExit).toHaveBeenCalledWith('two');
});
