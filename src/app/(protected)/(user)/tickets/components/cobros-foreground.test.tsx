/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';
import { CobroAliasPanel } from './cobro-alias';
import { consultarCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { consultarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { CobroMercadoPago } from '@/types/mercadopago.type';
import type { CobroAlias } from '@/types/verificacion-alias.type';
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ consultarCobroMercadoPagoAction: jest.fn(), cancelarCobroMercadoPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ consultarCobroAliasAction: jest.fn(), cancelarCobroAliasAction: jest.fn(), asignarTransferenciaAliasAction: jest.fn(), ampliarBusquedaAliasAction: jest.fn() }));
jest.mock('@/components/ui/action-dialog', () => ({ ActionDialogFooterPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>, ActionDialogPrimaryButton: ({ children }: { children: ReactNode }) => <button>{children}</button>, ActionDialogSecondaryButton: ({ children }: { children: ReactNode }) => <button>{children}</button> }));
jest.mock('@/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
let hidden = false;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => jest.useRealTimers());

test('el QR deja de consultar oculto y recupera el pago una sola vez al volver', async () => {
  const cobro: CobroMercadoPago = { id: 'qr', estado: 'PENDIENTE', monto: 1000, initPoint: '', qr: 'qr', interoperable: true, expiraEl: new Date(Date.now() + 60000).toISOString(), acreditadoEl: null };
  const onAcreditado = jest.fn();
  jest.mocked(consultarCobroMercadoPagoAction).mockResolvedValue({ cobro: { ...cobro, estado: 'ACREDITADO' } });
  render(<CobroQrMercadoPago cobro={cobro} onAcreditado={onAcreditado} onCancelar={jest.fn()} />);
  act(() => { hidden = true; fireEvent(document, new Event('visibilitychange')); jest.advanceTimersByTime(600000); });
  expect(consultarCobroMercadoPagoAction).not.toHaveBeenCalled();
  await act(async () => { hidden = false; fireEvent(document, new Event('visibilitychange')); });
  await waitFor(() => expect(onAcreditado).toHaveBeenCalledTimes(1));
  act(() => { jest.advanceTimersByTime(60000); });
  expect(consultarCobroMercadoPagoAction).toHaveBeenCalledTimes(1);
});

test('la espera de alias recupera una transferencia confirmada mientras el teléfono estaba bloqueado', async () => {
  const cobro = { id: 'alias', estado: 'ESPERANDO', importe: 1000, creadoEl: new Date().toISOString(), venceEl: new Date(Date.now() + 60000).toISOString(), opciones: [], transferencia: null, consulta: null } as unknown as CobroAlias;
  const onTerminado = jest.fn();
  jest.mocked(consultarCobroAliasAction).mockResolvedValue({ datos: { ...cobro, estado: 'CONFIRMADO' } });
  render(<CobroAliasPanel cobro={cobro} onTerminado={onTerminado} onCancelado={jest.fn()} />);
  act(() => { hidden = true; fireEvent(document, new Event('visibilitychange')); jest.advanceTimersByTime(600000); });
  expect(consultarCobroAliasAction).not.toHaveBeenCalled();
  await act(async () => { hidden = false; fireEvent(document, new Event('visibilitychange')); });
  await waitFor(() => expect(onTerminado).toHaveBeenCalledTimes(1));
});
