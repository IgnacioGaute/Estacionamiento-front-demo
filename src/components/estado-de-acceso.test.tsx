/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EstadoDeAcceso } from './estado-de-acceso';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('@/actions/auth/logout.action', () => ({ logoutAction: jest.fn() }));
jest.mock('@/components/brand/logo', () => ({ AppIcon: () => null }));

let hidden = false;
beforeEach(() => {
  jest.useFakeTimers();
  mockRefresh.mockReset();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  jest.spyOn(Math, 'random').mockReturnValue(1);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('sesión pendiente: explica que la sesión sigue abierta y ofrece reintentar y cerrar sesión', () => {
  render(<EstadoDeAcceso motivo="sesion-pendiente" intento="a" />);
  expect(screen.getByRole('heading', { name: 'No pudimos validar tu sesión' })).toBe(document.activeElement);
  expect(screen.getByText(/Tu sesión sigue abierta/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /Reintentar ahora/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toMatch(/Reintentamos solos/);
});

test('falla temporal del contexto: reintenta solo con espera creciente y vuelve a cargar sin cerrar la app', async () => {
  const { rerender } = render(<EstadoDeAcceso motivo="contexto-no-disponible" intento="1" />);
  expect(screen.getByText(/no un cambio en tus permisos/)).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(2_999); });
  expect(mockRefresh).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  // El servidor volvió a fallar: nuevo intento, espera el doble.
  rerender(<EstadoDeAcceso motivo="contexto-no-disponible" intento="2" />);
  await act(async () => { jest.advanceTimersByTime(5_999); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(mockRefresh).toHaveBeenCalledTimes(2);
});

test('respeta Retry-After', async () => {
  render(<EstadoDeAcceso motivo="contexto-no-disponible" intento="1" reintentarEnMs={45_000} />);
  await act(async () => { jest.advanceTimersByTime(44_000); });
  expect(mockRefresh).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1_000); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

test('sin conexión no reintenta ni deja reintentar; al volver la conexión reintenta', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  render(<EstadoDeAcceso motivo="contexto-no-disponible" intento="1" />);
  await act(async () => { window.dispatchEvent(new Event('offline')); });
  expect(screen.getByRole('status').textContent).toMatch(/Sin conexión/);
  expect((screen.getByRole('button', { name: /Reintentar ahora/ }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(mockRefresh).not.toHaveBeenCalled();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  await act(async () => { window.dispatchEvent(new Event('online')); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

test('el botón reintenta a pedido', async () => {
  render(<EstadoDeAcceso motivo="contexto-no-disponible" intento="1" />);
  fireEvent.click(screen.getByRole('button', { name: /Reintentar ahora/ }));
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

test('sin empresa activa: mensaje del backend, comprobar de nuevo a pedido, sin reintentos solos', async () => {
  render(<EstadoDeAcceso motivo="sin-empresa" mensaje="Tu cuenta no tiene una empresa activa." intento="1" />);
  expect(screen.getByText('Tu cuenta no tiene una empresa activa.', { selector: 'p' })).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Comprobar de nuevo/ })).toBeTruthy();
});

test('sesión inválida: la única acción es iniciar sesión de nuevo', () => {
  render(<EstadoDeAcceso motivo="sesion-invalida" intento="1" />);
  expect(screen.getByRole('button', { name: 'Iniciar sesión de nuevo' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Reintentar/ })).toBeNull();
});
