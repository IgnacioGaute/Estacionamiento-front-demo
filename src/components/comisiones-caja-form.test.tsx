/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComisionesCajaForm } from './comisiones-caja-form';
import { guardarComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
const referencia = { qrSaldo: 0.968, qrDebito: 1.6335, qrCredito: 7.2479, aliasSaldo: 0, aliasDebito: 0, aliasCredito: null };
jest.mock('@/actions/box-lists/comisiones.action', () => ({ guardarComisionesCajaAction: jest.fn() }));
const guardar = jest.mocked(guardarComisionesCajaAction);
beforeEach(() => guardar.mockReset());
it('muestra seis medios, guarda decimales con coma y conserva alias crédito pendiente', async () => {
  guardar.mockResolvedValue({ datos: { conectada: true, tasas: referencia, referencia } });
  render(<ComisionesCajaForm inicial={referencia} referencia={referencia} />);
  expect(screen.getAllByRole('textbox')).toHaveLength(6);
  fireEvent.change(screen.getByLabelText('QR · tarjeta de débito'), { target: { value: '1,6335' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(referencia));
  expect(await screen.findByRole('status')).toHaveTextContent('todas las playas');
});
it('rechaza porcentajes fuera de rango o más de cuatro decimales', () => {
  render(<ComisionesCajaForm inicial={referencia} referencia={referencia} />);
  for (const value of ['-1', '101', '1.23456', 'abc']) {
    fireEvent.change(screen.getByLabelText('Alias · débito'), { target: { value } });
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  }
  expect(guardar).not.toHaveBeenCalled();
});
it('permite cero explícito, dejar a definir y restablecer referencias sin guardar automáticamente', () => {
  render(<ComisionesCajaForm inicial={referencia} referencia={referencia} />);
  fireEvent.change(screen.getByLabelText('QR · tarjeta de crédito'), { target: { value: '0' } });
  expect(screen.getByLabelText('QR · tarjeta de crédito')).toHaveValue('0');
  fireEvent.change(screen.getByLabelText('QR · tarjeta de débito'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Usar valores de referencia' }));
  expect(screen.getByLabelText('QR · tarjeta de crédito')).toHaveValue('7.2479');
  expect(guardar).not.toHaveBeenCalled();
});
it('muestra errores sin anunciar guardado', async () => {
  guardar.mockResolvedValue({ error: 'Vinculá una cuenta.' });
  render(<ComisionesCajaForm inicial={referencia} referencia={referencia} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Vinculá');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
