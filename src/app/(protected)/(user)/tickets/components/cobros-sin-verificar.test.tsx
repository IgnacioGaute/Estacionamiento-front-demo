/** @jest-environment jsdom */
// Fallos reales al consultar un cobro: 429 del proxy, 502/503, timeout y la acción que ni llega al
// servidor. Nunca se dice «sigue esperando» con una comprobación vieja ni «no pagó»; tampoco se
// crea otro cobro, se asigna una transferencia o se registra una salida para «recuperarse».
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CobroAliasPanel } from './cobro-alias';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';
import {
  asignarTransferenciaAliasAction,
  cancelarCobroAliasAction,
  consultarCobroAliasAction,
  iniciarCobroAliasAction,
} from '@/actions/mercadopago/verificacion-alias.action';
import { cancelarCobroMercadoPagoAction, consultarCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { toast } from '@/lib/toast';
import type { CobroAlias } from '@/types/verificacion-alias.type';
import type { CobroMercadoPago } from '@/types/mercadopago.type';

jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ consultarCobroMercadoPagoAction: jest.fn(), cancelarCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({
  consultarCobroAliasAction: jest.fn(),
  cancelarCobroAliasAction: jest.fn(),
  asignarTransferenciaAliasAction: jest.fn(),
  ampliarCobroAliasAction: jest.fn(),
  iniciarCobroAliasAction: jest.fn(),
}));
jest.mock('@/components/ui/action-dialog', () => ({
  ActionDialogFooterPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ActionDialogPrimaryButton: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  ActionDialogSecondaryButton: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
jest.mock('@/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const transitorio = (categoria: string, reintentarEnMs: number | null = null) => ({ error: 'No se pudo completar el pedido.', fallo: { categoria, transitorio: true, reintentarEnMs } }) as never;
const alias = (cambios: Partial<CobroAlias> = {}) => ({
  id: 'alias-1', estado: 'ESPERANDO', importe: 1500, alias: 'playa.mitre', tipo: 'HORA', creadoEl: new Date().toISOString(), buscarDesde: new Date().toISOString(),
  venceEl: new Date(Date.now() + 900_000).toISOString(), opciones: [], anteriores: [], transferencia: null, consulta: null, ...cambios,
}) as unknown as CobroAlias;
const qr = (): CobroMercadoPago => ({ id: 'qr-1', estado: 'PENDIENTE', monto: 1500, initPoint: 'https://mp.example/qr', qr: 'qr', interoperable: true, expiraEl: new Date(Date.now() + 600_000).toISOString(), acreditadoEl: null });

let hidden = false;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => jest.useRealTimers());

const avanzar = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };

test.each([
  ['429 en texto del proxy', () => transitorio('limite')],
  ['502', () => transitorio('servidor')],
  ['timeout', () => transitorio('tiempo')],
  ['respuesta inválida', () => transitorio('respuesta-invalida')],
])('alias: un %s muestra «no pudimos consultar» con la última consulta buena, no «buscando»', async (_caso, fallo) => {
  jest.mocked(consultarCobroAliasAction).mockResolvedValue(fallo());
  render(<CobroAliasPanel cobro={alias()} onTerminado={jest.fn()} onCancelado={jest.fn()} />);
  expect(screen.getByText('Buscando la transferencia')).toBeTruthy();
  expect(screen.getByText(/Última consulta:/)).toBeTruthy();
  await avanzar(4_000);
  await waitFor(() => expect(screen.getByText('No pudimos consultar el estado del pago')).toBeTruthy());
  expect(screen.getByText(/Última consulta exitosa:/)).toBeTruthy();
  expect(screen.getByText(/no quiere decir que el pago no llegó/)).toBeTruthy();
  expect(screen.queryByText('Buscando la transferencia')).toBeNull();
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
});

test('alias: la acción que ni llega al servidor (sin red) también se informa', async () => {
  jest.mocked(consultarCobroAliasAction).mockRejectedValue(new TypeError('Failed to fetch'));
  render(<CobroAliasPanel cobro={alias()} onTerminado={jest.fn()} onCancelado={jest.fn()} />);
  await avanzar(4_000);
  await waitFor(() => expect(screen.getByText('No pudimos consultar el estado del pago')).toBeTruthy());
});

test('alias: reintentar avisa que está reintentando y al recuperarse vuelve a «buscando» sin cerrar nada', async () => {
  let resolver!: (valor: unknown) => void;
  jest.mocked(consultarCobroAliasAction).mockResolvedValueOnce(transitorio('servidor'));
  const onTerminado = jest.fn();
  const onCancelado = jest.fn();
  render(<CobroAliasPanel cobro={alias()} onTerminado={onTerminado} onCancelado={onCancelado} />);
  await avanzar(4_000);
  await waitFor(() => screen.getByText('No pudimos consultar el estado del pago'));
  jest.mocked(consultarCobroAliasAction).mockImplementationOnce(() => new Promise((r) => { resolver = r; }) as never);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByText('Reintentando…')).toBeTruthy());
  await act(async () => { resolver({ datos: alias() }); });
  await waitFor(() => expect(screen.getByText('Buscando la transferencia')).toBeTruthy());
  expect(screen.queryByText('No pudimos consultar el estado del pago')).toBeNull();
  expect(onTerminado).not.toHaveBeenCalled();
  expect(onCancelado).not.toHaveBeenCalled();
  // Recuperarse es solo consultar: ningún otro cobro, asignación ni cancelación.
  expect(iniciarCobroAliasAction).not.toHaveBeenCalled();
  expect(asignarTransferenciaAliasAction).not.toHaveBeenCalled();
  expect(cancelarCobroAliasAction).not.toHaveBeenCalled();
});

test('alias: las consultas no se superponen aunque el backend tarde más que el intervalo', async () => {
  jest.mocked(consultarCobroAliasAction).mockImplementation(() => new Promise(() => {}) as never);
  render(<CobroAliasPanel cobro={alias()} onTerminado={jest.fn()} onCancelado={jest.fn()} />);
  await avanzar(4_000);
  await avanzar(4_000);
  await avanzar(4_000);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(1);
  // La consulta lenta se dice: «Consultando…».
  await avanzar(1_600);
  expect(screen.getByText('Consultando…')).toBeTruthy();
});

test('alias: con fallos seguidos las consultas se espacian y respetan Retry-After', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(1);
  jest.mocked(consultarCobroAliasAction).mockResolvedValue(transitorio('limite', 20_000));
  render(<CobroAliasPanel cobro={alias()} onTerminado={jest.fn()} onCancelado={jest.fn()} />);
  await avanzar(4_000);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(1);
  // Retry-After 20 s: los ticks de 4 s no consultan antes.
  for (let i = 0; i < 4; i++) await avanzar(4_000);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(1);
  await avanzar(4_000);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(2);
});

test('alias: un rechazo del backend (no transitorio) se muestra y no se reintenta solo', async () => {
  jest.mocked(consultarCobroAliasAction).mockResolvedValue({ error: 'No tenés acceso a ese cobro.', fallo: { categoria: 'permiso', transitorio: false, reintentarEnMs: null } } as never);
  render(<CobroAliasPanel cobro={alias()} onTerminado={jest.fn()} onCancelado={jest.fn()} />);
  await avanzar(4_000);
  await waitFor(() => screen.getByText(/No tenés acceso a ese cobro/));
  expect(screen.getByText('Tocá Reintentar para consultar de nuevo.')).toBeTruthy();
  for (let i = 0; i < 10; i++) await avanzar(4_000);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(1);
});

test('alias: si confirmar la transferencia queda sin respuesta, se consulta el estado y no se repite', async () => {
  const conOpcion = alias({ estado: 'REVISION', motivoRevision: 'VARIAS_TRANSFERENCIAS', opciones: [{ operacionId: 'op-1', nombre: 'Ana', documento: null, entidad: null, importe: 1500, fechaOperacion: new Date().toISOString() }] } as never);
  jest.mocked(asignarTransferenciaAliasAction).mockResolvedValue(transitorio('tiempo'));
  jest.mocked(consultarCobroAliasAction).mockResolvedValue({ datos: { ...conOpcion, estado: 'CONFIRMADO', transferencia: conOpcion.opciones[0] } } as never);
  const onTerminado = jest.fn();
  render(<CobroAliasPanel cobro={conOpcion} onTerminado={onTerminado} onCancelado={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio'));
  fireEvent.click(screen.getByRole('button', { name: /Confirmar pago y salida/ }));
  await waitFor(() => expect(onTerminado).toHaveBeenCalledTimes(1));
  expect(asignarTransferenciaAliasAction).toHaveBeenCalledTimes(1);
  expect(consultarCobroAliasAction).toHaveBeenCalledTimes(1);
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('No pudimos confirmar si se registró'));
});

test('QR: un 503 muestra que no se pudo verificar, sin perder el código ni cancelar', async () => {
  jest.mocked(consultarCobroMercadoPagoAction).mockResolvedValue(transitorio('servidor'));
  render(<CobroQrMercadoPago cobro={qr()} onAcreditado={jest.fn()} onCancelar={jest.fn()} />);
  expect(screen.getByText('Esperando el pago')).toBeTruthy();
  await avanzar(4_000);
  await waitFor(() => screen.getByText('No pudimos consultar el estado del pago'));
  expect(screen.queryByText('Esperando el pago')).toBeNull();
  expect(screen.getByText('Escaneá para pagar')).toBeTruthy();
  expect(cancelarCobroMercadoPagoAction).not.toHaveBeenCalled();
});

test('QR: si cancelar queda sin respuesta se consulta el estado (el cliente pudo haber pagado)', async () => {
  jest.mocked(cancelarCobroMercadoPagoAction).mockResolvedValue(transitorio('transporte'));
  jest.mocked(consultarCobroMercadoPagoAction).mockResolvedValue({ cobro: { ...qr(), estado: 'ACREDITADO', acreditadoEl: new Date().toISOString() } });
  const onAcreditado = jest.fn();
  const onCancelar = jest.fn();
  render(<CobroQrMercadoPago cobro={qr()} onAcreditado={onAcreditado} onCancelar={onCancelar} />);
  fireEvent.click(screen.getByRole('button', { name: /Cancelar QR/ }));
  await waitFor(() => expect(onAcreditado).toHaveBeenCalledTimes(1));
  expect(onCancelar).not.toHaveBeenCalled();
  expect(cancelarCobroMercadoPagoAction).toHaveBeenCalledTimes(1);
});
