/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { getConsumoPatentesAction, quitarPatentesAction } from '@/actions/tenancy/tenancy.action';
import { PatentesPlayas } from './patentes-playas';
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/components/plataforma/mono', () => ({ EJE: '#999' }));
jest.mock('@/components/plataforma/graficos', () => ({ AMARILLO: '#ff0' }));
jest.mock('@/actions/tenancy/tenancy.action', () => ({ configurarPatentesAction: jest.fn(), getConsumoPatentesAction: jest.fn(), quitarPatentesAction: jest.fn() }));
const free = { playaId: 'playa', nombre: 'Entrada principal', configurado: false, gratuito: true };
beforeEach(() => jest.clearAllMocks());
test('una playa sin token muestra reconocimiento gratuito y no exige contratar un plan', async () => {
  jest.mocked(getConsumoPatentesAction).mockResolvedValue({ consumo: [free] });
  render(<PatentesPlayas empresaId="empresa" />);
  expect(await screen.findByText(/Reconocimiento gratuito/)).toBeInTheDocument();
  expect(screen.queryByText(/Sin reconocimiento:/)).not.toBeInTheDocument();
});
test('quitar el token conserva el reconocimiento cuando está configurado fast-alpr', async () => {
  jest.mocked(getConsumoPatentesAction).mockResolvedValueOnce({ consumo: [{ ...free, configurado: true, gratuito: false, uso: { total: 100, usadas: 10, restantes: 90, seRenueva: null } }] }).mockResolvedValue({ consumo: [free] });
  jest.mocked(quitarPatentesAction).mockResolvedValue({ ok: true });
  render(<PatentesPlayas empresaId="empresa" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
  expect(await screen.findByText(/Reconocimiento gratuito/)).toBeInTheDocument();
  await waitFor(() => expect(quitarPatentesAction).toHaveBeenCalledWith('playa'));
  expect(toast.success).toHaveBeenCalledWith('Token de Plate Recognizer quitado de Entrada principal.');
});
