/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BarraNavegacion } from './barra-navegacion';

let mockPath = '/admin/plan';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath, useSearchParams: () => new URLSearchParams() }));

beforeEach(() => { jest.useFakeTimers(); mockPath = '/admin/plan'; window.history.replaceState(null, '', '/admin/plan'); });
afterEach(() => { jest.useRealTimers(); });

const pantalla = (destino: string) => (
  <>
    <BarraNavegacion />
    <a href={destino} onClick={(e) => e.preventDefault()}>Ir</a>
  </>
);

test('al tocar un enlace a otra pantalla aparece la barra y se va cuando llega la pantalla nueva', () => {
  const { rerender } = render(pantalla('/admin/tarifas'));
  // El preventDefault del enlace de prueba corre después de la captura de la barra.
  fireEvent.click(screen.getByText('Ir'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(150); });
  expect(screen.getByRole('status')).toHaveTextContent('Cargando la pantalla…');
  mockPath = '/admin/tarifas';
  rerender(pantalla('/admin/tarifas'));
  act(() => { jest.advanceTimersByTime(400); });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('no aparece con un enlace a la misma pantalla, a otro sitio o con Ctrl', () => {
  render(<><BarraNavegacion /><a href="/admin/plan">Misma</a><a href="https://example.com/x">Afuera</a><a href="/admin/users">Usuarios</a></>);
  for (const nombre of ['Misma', 'Afuera']) fireEvent.click(screen.getByText(nombre));
  fireEvent.click(screen.getByText('Usuarios'), { ctrlKey: true });
  act(() => { jest.advanceTimersByTime(500); });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
