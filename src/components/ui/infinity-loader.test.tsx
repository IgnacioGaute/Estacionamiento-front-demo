/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { InfinityLoader } from './infinity-loader';
import { LoadingScreen } from '../loading-screen';
import LatticeLoader from './lattice-loader';
import { DataLoading } from './data-loading';
import { Loader } from './loader';

jest.mock('../wave-loader', () => ({ WaveLoader: () => null }));

test('la carga de planilla queda dentro de su componente y se retira al terminar', () => {
  const { container, unmount } = render(<section><DataLoading label="Cargando planilla…" /></section>);
  const loader = screen.getByRole('status', { name: 'Cargando planilla…' });
  expect(container.querySelector('section')).toContainElement(loader);
  expect(loader.parentElement).not.toBe(document.body);
  unmount();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('la carga general conserva la escena del auto y la barrera', () => {
  const { container } = render(<LoadingScreen />);
  expect(container.querySelector('.gm-escena__auto')).toBeInTheDocument();
  expect(container.querySelector('.gm-escena__brazo')).toBeInTheDocument();
  expect(screen.getByText('Cargando el sistema')).toBeInTheDocument();
});

test('el loader genérico también queda en el componente desde el render inicial', () => {
  const { container } = render(<Loader />);
  expect(container).toContainElement(screen.getByRole('status', { name: 'Cargando…' }));
  expect(renderToString(<Loader />)).toContain('Cargando…');
});

test('el indicador compacto conserva su espacio y su descripción dentro del botón', () => {
  render(<button disabled><LatticeLoader compact label="Procesando…" showTimer={false} />Guardar</button>);
  expect(screen.getByRole('button')).toContainElement(screen.getByRole('status'));
  // El mismo infinito que el resto de las cargas, en chico (ya no la grilla de puntos).
  expect(screen.getByRole('button').querySelector('.lattice-loader__icono svg')).toBeInTheDocument();
  expect(screen.queryByText('Procesando…')).not.toBeInTheDocument();
});

test('el indicador interno conserva los estados finales y los textos de resultado', () => {
  const { rerender } = render(<InfinityLoader status="done" label="Listo" />);
  expect(screen.getByRole('status', { name: 'Listo' })).toHaveAttribute('data-status', 'done');
  rerender(<InfinityLoader status="error" label="Error al cargar" />);
  expect(screen.getByRole('status', { name: 'Error al cargar' })).toHaveAttribute('data-status', 'error');
});

test('el indicador local mantiene su etiqueta sin crear una pantalla de carga', () => {
  const { container } = render(<InfinityLoader label="Cargando vehículos…" />);
  expect(container).toContainElement(screen.getByRole('status', { name: 'Cargando vehículos…' }));
});
