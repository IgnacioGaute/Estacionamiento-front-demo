/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { Subpaginas } from './subpaginas';

let mockPathname = '/admin/configuracion/turnos';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const ITEMS = [
  { label: 'Turnos de caja', url: '/admin/configuracion/turnos' },
  { label: 'Mercado Pago', url: '/admin/configuracion/mercadopago' },
];

describe('Subpaginas', () => {
  it('marca la página actual, también en una página interna', () => {
    mockPathname = '/admin/configuracion/mercadopago/comisiones';
    render(<Subpaginas items={ITEMS} seccion="Configuración" />);
    const nav = screen.getByRole('navigation', { name: 'Páginas de Configuración' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mercado Pago' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Turnos de caja' })).not.toHaveAttribute('aria-current');
  });

  it('con una sola página no muestra la fila', () => {
    const { container } = render(<Subpaginas items={ITEMS.slice(0, 1)} seccion="Caja" />);
    expect(container).toBeEmptyDOMElement();
  });
});
