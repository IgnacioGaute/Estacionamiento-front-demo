/** @jest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
import { getDeudoresAction, marcarDeudasVistasAction } from '@/actions/cuentas/cuentas.action';
import type { Deudores } from '@/types/cuenta.type';
import { AvisosPestanas } from './avisos-pestanas';

const estado = { tab: 'inquilinos' as string | null, rol: 'ADMIN', inquilinos: true };
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(estado.tab ? `tab=${estado.tab}` : ''),
  useRouter: () => ({ replace }),
  usePathname: () => '/notes',
}));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'yo', role: estado.rol } } }) }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ playaId: 'p1', inquilinosEnabled: estado.inquilinos, context: { playas: [{ id: 'p1', nombre: 'Playa Centro' }] } }) }));
jest.mock('@/actions/cuentas/cuentas.action', () => ({ getDeudoresAction: jest.fn(), marcarDeudasVistasAction: jest.fn() }));
jest.mock('./avisos-body', () => ({ AvisosBody: () => <p>Lista de avisos</p> }));

const deudores: Deudores = {
  cantidad: 2, total: 75000, masDe60: 1, nuevos: 1,
  deudores: [
    { id: 'c1', nombre: 'Juan', apellido: 'Pérez', whatsapp: '5491155551234', baja: false, vencido: 45000, vencidoDesde: '2026-08-10', tramo: 'VENCIDO_MAS', nuevo: true },
    { id: 'c2', nombre: 'Ana', apellido: 'Gómez', whatsapp: null, baja: false, vencido: 30000, vencidoDesde: '2026-11-10', tramo: 'VENCIDO_30', nuevo: false },
  ],
};

beforeEach(() => {
  Object.assign(estado, { tab: 'inquilinos', rol: 'ADMIN', inquilinos: true });
  jest.clearAllMocks();
  jest.mocked(getDeudoresAction).mockResolvedValue({ data: deudores });
  jest.mocked(marcarDeudasVistasAction).mockResolvedValue({ data: { ...deudores, nuevos: 0 } });
});

test('la pestaña Inquilinos lista las deudas con «Ver» a cada inquilino y se marcan vistas solas', async () => {
  const cambiaron = jest.fn();
  window.addEventListener('cuentas-cambiaron', cambiaron);
  render(<AvisosPestanas inicial={null} />);
  expect(screen.getByRole('tab', { name: /Inquilinos con deuda/ })).toHaveAttribute('aria-selected', 'true');
  const lista = await screen.findByRole('region', { name: 'Inquilinos con deuda vencida' });
  const juan = (await within(lista).findByText('Pérez Juan')).closest('li')!;
  expect(within(juan).getByRole('link', { name: 'Ver la cuenta de Pérez Juan' })).toHaveAttribute('href', '/renters/c1');
  expect(within(juan).getByText('Nueva')).toBeInTheDocument();
  expect(juan).toHaveTextContent('vencido desde el 10/08/2026');
  expect(within(juan).getByRole('link', { name: /Recordar el pago por WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('https://wa.me/5491155551234'));
  const ana = within(lista).getByText('Gómez Ana').closest('li')!;
  expect(within(ana).queryByText('Nueva')).toBeNull();
  expect(within(ana).queryByRole('link', { name: /WhatsApp/ })).toBeNull();
  // Sin tocar nada: abrir la pestaña las da por vistas y avisa al menú.
  await waitFor(() => expect(marcarDeudasVistasAction).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(cambiaron).toHaveBeenCalled());
  window.removeEventListener('cuentas-cambiaron', cambiaron);
});

test('sin deudas nuevas no marca nada; en la pestaña Avisos no se pide nada', async () => {
  jest.mocked(getDeudoresAction).mockResolvedValue({ data: { ...deudores, nuevos: 0, deudores: deudores!.deudores.map((d) => ({ ...d, nuevo: false })) } });
  const { unmount } = render(<AvisosPestanas inicial={null} />);
  await screen.findByText('Pérez Juan');
  expect(marcarDeudasVistasAction).not.toHaveBeenCalled();
  unmount();
  estado.tab = null;
  jest.clearAllMocks();
  render(<AvisosPestanas inicial={null} />);
  expect(screen.getByText('Lista de avisos')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Avisos' })).toHaveAttribute('aria-selected', 'true');
  expect(marcarDeudasVistasAction).not.toHaveBeenCalled();
});

test('el operador no tiene pestañas: solo los avisos', () => {
  estado.rol = 'USER';
  render(<AvisosPestanas inicial={null} />);
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(screen.getByText('Lista de avisos')).toBeInTheDocument();
});
