/** @jest-environment jsdom */
// Los tipos de vehículo que no cargaban y obligaban a cerrar la aplicación: carga, error y lista
// realmente vacía son estados distintos, hay Reintentar, se recupera solo (con límite) y al volver
// la conexión o la app, y varias pantallas comparten un solo pedido.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VehicleTypeButtons, useVehicleTypes } from './vehicle-type-options';
import { cargarTiposDeVehiculoAction } from '@/actions/tickets/vehicle-types.action';

jest.mock('@/actions/tickets/vehicle-types.action', () => ({ cargarTiposDeVehiculoAction: jest.fn() }));
jest.mock('@/components/ui/lattice-loader', () => ({ __esModule: true, default: ({ label }: { label: string }) => <p>{label}</p> }));

const cargar = jest.mocked(cargarTiposDeVehiculoAction);
const tipos = [{ code: 'AUTO', name: 'Auto', enabled: true }, { code: 'MOTO', name: 'Moto', enabled: true }];
const fallo = (categoria = 'limite', transitorio = true, reintentarEnMs: number | null = null) => ({ error: 'No pudimos cargar los tipos de vehículo.', fallo: { categoria, transitorio, reintentarEnMs } }) as never;
let hidden = false;

beforeEach(() => {
  jest.useFakeTimers();
  cargar.mockReset();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  jest.spyOn(Math, 'random').mockReturnValue(1);
});
afterEach(async () => {
  // Desmontar y dejar que la carga compartida se descarte entre pruebas.
  const { cleanup } = await import('@testing-library/react');
  cleanup();
  await act(async () => { jest.runOnlyPendingTimers(); });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const Botones = () => <VehicleTypeButtons value="" onChange={() => {}} />;

test('carga y muestra los tipos habilitados', async () => {
  cargar.mockResolvedValue({ tipos });
  render(<Botones />);
  expect(screen.getByText('Cargando vehículos…')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('radio', { name: /Auto/ })).toBeTruthy());
});

test('una lista realmente vacía no se confunde con un error', async () => {
  cargar.mockResolvedValue({ tipos: [{ code: 'AUTO', name: 'Auto', enabled: false }] });
  render(<Botones />);
  await waitFor(() => screen.getByText(/No hay tipos de vehículo habilitados/));
  expect(screen.queryByRole('button', { name: /Reintentar/ })).toBeNull();
});

test('un 429 muestra el error con Reintentar y se recupera sin cerrar la aplicación', async () => {
  cargar.mockResolvedValueOnce(fallo());
  render(<Botones />);
  await waitFor(() => screen.getByText('No pudimos cargar los tipos de vehículo.'));
  expect(screen.getByText('Reintentamos solos en unos segundos.')).toBeTruthy();
  // Nunca se inventan opciones mientras tanto.
  expect(screen.queryByRole('radio')).toBeNull();
  cargar.mockResolvedValueOnce({ tipos });
  fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /Moto/ })).toBeTruthy());
  expect(cargar).toHaveBeenCalledTimes(2);
});

test('reintenta solo con espera creciente y se detiene después del límite', async () => {
  cargar.mockResolvedValue(fallo('servidor'));
  render(<Botones />);
  await waitFor(() => expect(cargar).toHaveBeenCalledTimes(1));
  const esperas = [2_000, 4_000, 8_000, 16_000];
  for (const [i, espera] of esperas.entries()) {
    await act(async () => { jest.advanceTimersByTime(espera - 1); });
    expect(cargar).toHaveBeenCalledTimes(i + 1);
    await act(async () => { jest.advanceTimersByTime(1); });
    await waitFor(() => expect(cargar).toHaveBeenCalledTimes(i + 2));
  }
  // Agotados los automáticos, la persona decide.
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(cargar).toHaveBeenCalledTimes(5);
  await waitFor(() => screen.getByText('Revisá la conexión y tocá Reintentar.'));
});

test('respeta Retry-After antes del próximo intento automático', async () => {
  cargar.mockResolvedValueOnce(fallo('limite', true, 30_000)).mockResolvedValue({ tipos });
  render(<Botones />);
  await waitFor(() => expect(cargar).toHaveBeenCalledTimes(1));
  await act(async () => { jest.advanceTimersByTime(29_000); });
  expect(cargar).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1_000); });
  await waitFor(() => expect(screen.getByRole('radio', { name: /Auto/ })).toBeTruthy());
});

test('al volver la conexión o la app reintenta lo que quedó con error', async () => {
  cargar.mockResolvedValueOnce(fallo('transporte'));
  render(<Botones />);
  await waitFor(() => screen.getByText('No pudimos cargar los tipos de vehículo.'));
  cargar.mockResolvedValueOnce({ tipos });
  await act(async () => { window.dispatchEvent(new Event('online')); });
  await waitFor(() => expect(screen.getByRole('radio', { name: /Auto/ })).toBeTruthy());
});

test('oculta (celular bloqueado) no reintenta; al volver sí', async () => {
  cargar.mockResolvedValueOnce(fallo('tiempo'));
  render(<Botones />);
  await waitFor(() => expect(cargar).toHaveBeenCalledTimes(1));
  hidden = true;
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(cargar).toHaveBeenCalledTimes(1);
  cargar.mockResolvedValueOnce({ tipos });
  hidden = false;
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  await waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
});

test('varias pantallas comparten un solo pedido en curso', async () => {
  let resolver!: (valor: unknown) => void;
  cargar.mockImplementation(() => new Promise((r) => { resolver = r; }) as never);
  function Nombres() { const { types } = useVehicleTypes(); return <p>{types.map((t) => t.name).join(',') || 'sin datos'}</p>; }
  render(<><Botones /><Nombres /><Nombres /></>);
  expect(cargar).toHaveBeenCalledTimes(1);
  await act(async () => { resolver({ tipos }); });
  await waitFor(() => expect(screen.getAllByText('Auto,Moto')).toHaveLength(2));
});

test('una actualización fallida no borra la lista ya recibida', async () => {
  cargar.mockResolvedValueOnce({ tipos });
  render(<Botones />);
  await waitFor(() => screen.getByRole('radio', { name: /Auto/ }));
  cargar.mockResolvedValueOnce(fallo());
  await act(async () => { window.dispatchEvent(new Event('vehicle-types-updated')); });
  await waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('radio', { name: /Auto/ })).toBeTruthy();
  expect(screen.queryByText('No pudimos cargar los tipos de vehículo.')).toBeNull();
});
