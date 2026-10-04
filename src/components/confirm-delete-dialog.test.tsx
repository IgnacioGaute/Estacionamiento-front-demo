/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';

const props = () => ({ open: true, setOpen: jest.fn(), subject: 'la tarifa Nocturna', onConfirm: jest.fn() });

test('nombra lo que se va a eliminar y avisa que no se puede deshacer', () => {
  render(<ConfirmDeleteDialog {...props()} description="Las estadías abiertas conservan su precio." />);
  expect(screen.getByRole('dialog')).toHaveTextContent('¿Estás seguro de que querés eliminar la tarifa Nocturna?');
  expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  expect(screen.getByText('Las estadías abiertas conservan su precio.')).toBeInTheDocument();
});

test('Eliminar confirma y Cancelar solo cierra', () => {
  const p = props();
  render(<ConfirmDeleteDialog {...p} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(p.setOpen).toHaveBeenCalledWith(false);
  expect(p.onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
  expect(p.onConfirm).toHaveBeenCalledTimes(1);
});

test('mientras se procesa no deja confirmar dos veces ni cerrar', () => {
  render(<ConfirmDeleteDialog {...props()} isPending confirmLabel="Dar de baja" />);
  expect(screen.getByRole('button', { name: /Dar de baja/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
});

test('cerrado no muestra nada', () => {
  render(<ConfirmDeleteDialog {...props()} open={false} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
