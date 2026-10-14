/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EliminarEstadia } from './eliminar-estadia';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import type { CloseSummary } from '@/services/tickets.service';

jest.mock('@/hooks/auth/use-current-role', () => ({ useCurrentRole: jest.fn() }));
jest.mock('@/actions/tickets/eliminar-estadia.action', () => ({ eliminarEstadiaAction: jest.fn() }));

const summary = (cobrado = 0) =>
  ({ registration: { id: 'reg', licensePlateOriginal: 'AB123CD' }, totalCollectedSoFar: cobrado } as unknown as CloseSummary);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useCurrentRole).mockReturnValue('ADMIN' as never);
});

test('el operador no ve la opción, ni el administrador si la estadía ya tiene cobros', () => {
  jest.mocked(useCurrentRole).mockReturnValue('USER' as never);
  const { rerender } = render(<EliminarEstadia summary={summary()} onEliminada={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /Eliminar estadía/ })).not.toBeInTheDocument();
  jest.mocked(useCurrentRole).mockReturnValue('ADMIN' as never);
  rerender(<EliminarEstadia summary={summary(500)} onEliminada={jest.fn()} />);
  expect(screen.queryByRole('button', { name: /Eliminar estadía/ })).not.toBeInTheDocument();
});

test('pide confirmación con la patente y recién ahí elimina', async () => {
  jest.mocked(eliminarEstadiaAction).mockResolvedValue({ ok: true });
  const onEliminada = jest.fn();
  render(<EliminarEstadia summary={summary()} onEliminada={onEliminada} />);
  fireEvent.click(screen.getByRole('button', { name: /Eliminar estadía/ }));
  expect(eliminarEstadiaAction).not.toHaveBeenCalled();
  expect(screen.getByText('AB123CD')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
  await waitFor(() => expect(onEliminada).toHaveBeenCalled());
  expect(eliminarEstadiaAction).toHaveBeenCalledWith('reg');
});

test('si el servidor la rechaza muestra el motivo y no cierra', async () => {
  jest.mocked(eliminarEstadiaAction).mockResolvedValue({ error: 'Esta estadía tiene cobros o anticipos: no se puede eliminar.' });
  const onEliminada = jest.fn();
  render(<EliminarEstadia summary={summary()} onEliminada={onEliminada} />);
  fireEvent.click(screen.getByRole('button', { name: /Eliminar estadía/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/cobros o anticipos/);
  expect(onEliminada).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'No, volver' }));
  expect(screen.getByRole('button', { name: /Eliminar estadía/ })).toBeInTheDocument();
});
