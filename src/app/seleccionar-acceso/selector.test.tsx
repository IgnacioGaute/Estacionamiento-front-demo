/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { selectPlayaAction, selectPlatformAction } from '@/actions/tenancy/context.action';
import { AccessSelector } from './selector';

jest.mock('@/actions/tenancy/context.action', () => ({ selectPlayaAction: jest.fn(), selectPlatformAction: jest.fn() }));
jest.mock('@/actions/auth/logout.action', () => ({ logoutAction: jest.fn() }));

const playas = [
  { id: 'p1', nombre: 'Centro', empresaId: 'e1' },
  { id: 'p2', nombre: 'Costanera', empresaId: 'e2' },
];
beforeEach(() => jest.clearAllMocks());

test('ofrece primero Plataforma y todas las playas, incluso de distintas empresas', () => {
  render(<AccessSelector playas={playas} />);
  expect(screen.getByRole('group', { name: 'Destino' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Plataforma/ })).toBeChecked();
  expect(screen.getAllByRole('radio').map(radio => radio.closest('label')?.textContent)).toEqual([
    'PlataformaEmpresas, playas, usuarios, planes y métricas', 'Centro', 'Costanera',
  ]);
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
});

test('con muchas playas se pueden buscar', () => {
  const muchas = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, nombre: i === 5 ? 'Costanera Sur' : `Playa ${i}`, empresaId: 'e1' }));
  render(<AccessSelector playas={muchas} />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar playa' }), { target: { value: 'costa' } });
  expect(screen.getAllByRole('radio').map(radio => radio.closest('label')?.textContent)).toEqual([
    'PlataformaEmpresas, playas, usuarios, planes y métricas', 'Costanera Sur',
  ]);
});

test('si el servidor rechaza la playa, conserva el selector para reintentar', async () => {
  jest.mocked(selectPlayaAction).mockResolvedValue({ error: 'No tenés acceso a esa playa.' });
  render(<AccessSelector playas={playas} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Costanera' }));
  fireEvent.click(screen.getByRole('button', { name: 'Entrar a la playa' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No tenés acceso a esa playa.');
  expect(selectPlayaAction).toHaveBeenCalledWith('p2');
  expect(selectPlatformAction).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar a la playa' })).toBeEnabled());
});

test('informa una caída de conexión y permite volver a intentar', async () => {
  jest.mocked(selectPlatformAction).mockRejectedValue(new Error('sin conexión'));
  render(<AccessSelector playas={[]} loadError="No se pudieron cargar las playas." />);
  expect(screen.getByRole('button', { name: 'Volver a cargar las playas' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar a la plataforma' }));
  expect(await screen.findByText('No se pudo ingresar. Intentá de nuevo.')).toBeVisible();
  expect(selectPlayaAction).not.toHaveBeenCalled();
});
