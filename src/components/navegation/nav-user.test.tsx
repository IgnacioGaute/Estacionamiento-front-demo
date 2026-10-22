/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { NavUser, OperationalNavUser } from './nav-user';
import { signOut } from 'next-auth/react';

jest.mock('next/navigation', () => ({ usePathname: jest.fn(() => '/admin/caja') }));
jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ inquilinosEnabled: true, cobroHabilitado: true }) }));
jest.mock('@/hooks/use-notification', () => ({ useNotifications: jest.fn() }));
jest.mock('../box-list-dialog', () => ({ BoxListDialog: () => null }));
jest.mock('@/app/(protected)/admin/other-payments/components/create-other-payment-dialog', () => ({
  CreateOtherPaymentDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Gastos e ingresos" /> : null),
}));
jest.mock('./install-app-menu-item', () => ({ InstallAppMenuItem: () => null }));

const userNav = { name: 'Álvaro García', email: 'usuario@example.test', avatar: '', role: 'ADMIN' as const };
beforeAll(() => {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as typeof ResizeObserver;
});
beforeEach(() => jest.mocked(usePathname).mockReturnValue('/admin/caja'));
const open = () => fireEvent.pointerDown(screen.getByRole('button', { name: /Tu cuenta y el menú/ }), { button: 0, ctrlKey: false });

test('el contador identifica avisos sin leer y el acceso permanece fuera de las ramas cerradas', async () => {
  render(<OperationalNavUser userNav={userNav} notas={{ unreadIds: ['uno', 'dos', 'tres'], loaded: true }} />);
  expect(screen.getByRole('button', { name: /Tenés 3 avisos sin leer/ })).toBeInTheDocument();
  open();
  const notices = await screen.findByRole('menuitem', { name: /Avisos. Tenés 3 avisos sin leer/ });
  expect(notices).toHaveAttribute('href', '/notes');
  expect(screen.getByText('3 sin leer')).toBeInTheDocument();
  // Tanto escritorio como celular tienen Operación cerrada al estar en administración.
  screen.getAllByRole('menuitem', { name: 'Operación' }).forEach(section => expect(section).toHaveAttribute('aria-expanded', 'false'));
  expect(notices.closest('.branched-menu')).toBeNull();
  expect(document.querySelectorAll('a[href="/notes"]')).toHaveLength(1);
});

test('abrir Avisos no borra el contador y la lectura confirmada actualiza la cantidad', async () => {
  const { rerender } = render(<OperationalNavUser userNav={userNav} notas={{ unreadIds: ['uno'], loaded: true }} />);
  open();
  // jsdom no navega; el menú procesa el clic antes de cancelar la navegación nativa.
  document.addEventListener('click', event => event.preventDefault(), { once: true });
  fireEvent.click(await screen.findByRole('menuitem', { name: /Tenés 1 aviso sin leer/ }));
  expect(screen.getByRole('button', { name: /Tenés 1 aviso sin leer/ })).toBeInTheDocument();
  rerender(<OperationalNavUser userNav={userNav} notas={{ unreadIds: [], loaded: true }} />);
  expect(screen.getByRole('button', { name: /Tu cuenta y el menú/ })).not.toHaveAccessibleName(/sin leer/);
  open();
  expect(screen.queryByText('Sin pendientes')).not.toBeInTheDocument();
  expect(document.querySelectorAll('a[href="/notes"]')).toHaveLength(2);
  const desktopNotice = document.querySelector('.branched-menu a[href="/notes"]');
  expect(desktopNotice).toBeInTheDocument();
  expect(desktopNotice?.closest('.branched-menu__section')?.querySelector('.branched-menu__head')).toHaveTextContent('Operación');
  screen.getAllByRole('menuitem', { name: 'Operación' }).forEach(section => fireEvent.click(section));
  expect(screen.getAllByRole('menuitem', { name: 'Avisos' })).toHaveLength(2);

  rerender(<OperationalNavUser userNav={userNav} notas={{ unreadIds: ['nuevo'], loaded: true }} />);
  expect(await screen.findByRole('menuitem', { name: /Avisos. Tenés 1 aviso sin leer/ })).toBeInTheDocument();
  expect(document.querySelectorAll('a[href="/notes"]')).toHaveLength(1);
});

test('en Avisos sin pendientes se despliega Operación en escritorio y celular', () => {
  jest.mocked(usePathname).mockReturnValue('/notes');
  render(<OperationalNavUser userNav={userNav} notas={{ unreadIds: [], loaded: true }} />);
  open();
  screen.getAllByRole('menuitem', { name: 'Operación' }).forEach(section => expect(section).toHaveAttribute('aria-expanded', 'true'));
  expect(screen.getAllByRole('menuitem', { name: 'Avisos' })).toHaveLength(2);
  expect(screen.queryByText('Sin pendientes')).not.toBeInTheDocument();
});

test('el operador tiene Gastos e ingresos dentro de Operación y abre el diálogo sin navegar', async () => {
  jest.mocked(usePathname).mockReturnValue('/tickets');
  render(<OperationalNavUser userNav={{ ...userNav, role: 'USER' }} notas={{ unreadIds: [], loaded: true }} />);
  open();
  const gastos = await screen.findAllByRole('menuitem', { name: 'Gastos e ingresos' });
  // Uno en escritorio y otro en celular, los dos colgados de Operación y ninguno suelto.
  expect(gastos).toHaveLength(2);
  expect(gastos[0].closest('.branched-menu__section')?.querySelector('.branched-menu__head')).toHaveTextContent('Operación');
  gastos.forEach(item => expect(item).not.toHaveAttribute('href'));
  fireEvent.click(gastos[0]);
  expect(await screen.findByRole('dialog', { name: 'Gastos e ingresos' })).toBeInTheDocument();
});

test('la etiqueta accesible conserva el número real cuando el contador compacto muestra 99+', () => {
  render(<OperationalNavUser userNav={userNav} notas={{ unreadIds: Array.from({ length: 123 }, (_, i) => String(i)), loaded: true }} />);
  expect(screen.getByText('99+')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Tenés 123 avisos sin leer/ })).toBeInTheDocument();
});

test('el superadministrador puede cambiar de playa y cerrar sesión desde la operación', async () => {
  render(<OperationalNavUser userNav={{ ...userNav, role: 'SUPER_ADMIN' }} notas={{ unreadIds: [], loaded: true }} />);
  open();
  expect(await screen.findByRole('menuitem', { name: 'Cambiar de playa' })).toHaveAttribute('href', '/seleccionar-acceso');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
  expect(signOut).toHaveBeenCalled();
});

test('el menú de plataforma permite cambiar de playa y cerrar sesión sin montar avisos', async () => {
  jest.mocked(signOut).mockClear();
  render(<NavUser userNav={{ ...userNav, role: 'SUPER_ADMIN' }} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: /Tu cuenta:/ }), { button: 0, ctrlKey: false });
  expect(await screen.findByRole('menuitem', { name: 'Cambiar de playa' })).toHaveAttribute('href', '/seleccionar-acceso');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
  expect(signOut).toHaveBeenCalledTimes(1);
});
