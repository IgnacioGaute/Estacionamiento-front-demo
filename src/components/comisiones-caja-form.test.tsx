/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComisionesCajaForm } from './comisiones-caja-form';
import { guardarComisionesCajaAction } from '@/actions/box-lists/comisiones.action';

jest.mock('@/actions/box-lists/comisiones.action', () => ({ guardarComisionesCajaAction: jest.fn() }));
const guardar = jest.mocked(guardarComisionesCajaAction);
beforeEach(() => guardar.mockReset());

it('permite porcentajes con coma y guarda los dos canales, incluido cero', async () => {
  guardar.mockResolvedValue({ datos: { qrPorcentaje: 7.25, transferenciaPorcentaje: 0 } });
  render(<ComisionesCajaForm inicial={{ qrPorcentaje: 0, transferenciaPorcentaje: 0 }} />);
  fireEvent.change(screen.getByLabelText('Mercado Pago / QR'), { target: { value: '7,25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comisiones' }));
  await waitFor(() => expect(guardar).toHaveBeenCalledWith({ qrPorcentaje: 7.25, transferenciaPorcentaje: 0 }));
  expect(await screen.findByRole('status')).toHaveTextContent('todas las playas de esta empresa');
});

it('no guarda campos vacíos, tasas fuera de rango o más de dos decimales', () => {
  render(<ComisionesCajaForm inicial={{ qrPorcentaje: 0, transferenciaPorcentaje: 0 }} />);
  for (const value of ['', '-1', '101', '1.234', 'abc']) {
    fireEvent.change(screen.getByLabelText('Transferencias / alias'), { target: { value } });
    expect(screen.getByRole('button', { name: 'Guardar comisiones' })).toBeDisabled();
  }
  expect(guardar).not.toHaveBeenCalled();
});

it('muestra el error del servidor sin anunciar que guardó', async () => {
  guardar.mockResolvedValue({ error: 'Sin permiso para editar.' });
  render(<ComisionesCajaForm inicial={{ qrPorcentaje: 0, transferenciaPorcentaje: 0 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar comisiones' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
