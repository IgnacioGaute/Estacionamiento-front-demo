/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { PantallaError } from './pantalla-error';

// En el celular la consola del navegador no se ve: la pantalla de error tiene que mandar el error
// al servidor y mostrarlo para poder sacarle una foto.
test('manda el error al servidor y lo muestra en «Ver detalle del error»', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const error = new TypeError("Cannot read properties of undefined (reading 'id')");
  render(<PantallaError error={error} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/errores', expect.objectContaining({ method: 'POST', keepalive: true })));
  const enviado = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(enviado).toMatchObject({ nombre: 'TypeError', mensaje: error.message, ruta: '/' });
  expect(screen.getByText('Ver detalle del error')).toBeInTheDocument();
  expect(screen.getByText(/TypeError: Cannot read properties of undefined/)).toBeInTheDocument();
});
