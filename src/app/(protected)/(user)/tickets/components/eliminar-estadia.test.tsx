/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EliminarEstadia } from './eliminar-estadia';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { toast } from '@/lib/toast';
import type { CloseSummary } from '@/services/tickets.service';

jest.mock('@/hooks/auth/use-current-role', () => ({ useCurrentRole: jest.fn() }));
jest.mock('@/actions/tickets/eliminar-estadia.action', () => ({ eliminarEstadiaAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const summary = (cobrado = 0) =>
  ({ registration: { id: 'reg', licensePlateOriginal: 'AB123CD' }, totalCollectedSoFar: cobrado } as unknown as CloseSummary);

// Mantener apretado con el teclado (Enter), como hace un lector de pantalla.
const mantener = async (boton: HTMLElement, ms: number) => {
  fireEvent.keyDown(boton, { key: 'Enter' });
  await act(async () => { jest.advanceTimersByTime(ms); });
  fireEvent.keyUp(boton, { key: 'Enter' });
  await act(async () => { await Promise.resolve(); });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.mocked(useCurrentRole).mockReturnValue('ADMIN' as never);
});
afterEach(() => jest.useRealTimers());

test('el operador no ve la opción, ni el administrador si la estadía ya tiene cobros', () => {
  jest.mocked(useCurrentRole).mockReturnValue('USER' as never);
  const { rerender } = render(<EliminarEstadia summary={summary()} onEliminada={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /borrar la estadía/ })).not.toBeInTheDocument();
  jest.mocked(useCurrentRole).mockReturnValue('ADMIN' as never);
  rerender(<EliminarEstadia summary={summary(500)} onEliminada={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /borrar la estadía/ })).not.toBeInTheDocument();
});

test('se elimina manteniendo apretado; si se suelta antes, no pasa nada', async () => {
  jest.mocked(eliminarEstadiaAction).mockResolvedValue({ ok: true });
  const onEliminada = jest.fn();
  render(<EliminarEstadia summary={summary()} onEliminada={onEliminada} />);
  const boton = screen.getByRole('button', { name: /Mantené para borrar la estadía de AB123CD/ });
  await mantener(boton, 400);
  expect(eliminarEstadiaAction).not.toHaveBeenCalled();
  await mantener(boton, 1500);
  expect(eliminarEstadiaAction).toHaveBeenCalledWith('reg');
  expect(onEliminada).toHaveBeenCalled();
});

test('si el servidor la rechaza avisa el motivo y no la saca', async () => {
  jest.mocked(eliminarEstadiaAction).mockResolvedValue({ error: 'Esta estadía tiene cobros o anticipos: no se puede eliminar.' });
  const onEliminada = jest.fn();
  render(<EliminarEstadia summary={summary()} onEliminada={onEliminada} />);
  await mantener(screen.getByRole('button', { name: /borrar la estadía/ }), 1500);
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/cobros o anticipos/));
  expect(onEliminada).not.toHaveBeenCalled();
});
