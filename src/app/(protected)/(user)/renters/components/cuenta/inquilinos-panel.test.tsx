/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { getResumenCuentasAction } from '@/actions/cuentas/cuentas.action';
import type { InquilinoResumen, ResumenCuentas } from '@/types/cuenta.type';
import { InquilinosPanel } from './inquilinos-panel';
import { mensajeRecordatorio } from './util';

const params = { filtro: 'vencido' as string | null };
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(params.filtro ? `filtro=${params.filtro}` : '') }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'yo', role: 'ADMIN' } } }) }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ playaId: 'p1', context: { playas: [{ id: 'p1', nombre: 'Playa Centro' }] } }) }));
jest.mock('@/actions/cuentas/cuentas.action', () => ({ getResumenCuentasAction: jest.fn() }));
jest.mock('../create-renter-dialog', () => ({ CreateRenterDialog: () => null }));
jest.mock('./cobrar-dialog', () => ({ CobrarDialog: () => null }));
jest.mock('./cuenta-mostrador', () => ({ CuentaMostradorDialog: () => null }));
jest.mock('./acciones', () => ({ CargarAbonosDialog: () => null }));
jest.mock('./anulaciones', () => ({ AnulacionesDialog: () => null }));

const base: InquilinoResumen = {
  id: 'x', nombre: '', apellido: '', telefono: null, whatsapp: null, cocheras: [], patentes: [], abono: 30000, baja: null,
  saldo: 0, vencido: 0, vencidoDesde: null, estado: 'AL_DIA', tramo: null, cargosPendientes: 0, ultimoPago: null,
};
const moroso: InquilinoResumen = { ...base, id: 'moroso', nombre: 'Juan', apellido: 'Pérez', telefono: '011 5555-1234', whatsapp: '5491155551234', saldo: 45000, vencido: 45000, vencidoDesde: '2026-10-10', estado: 'VENCIDO', tramo: 'VENCIDO_60' };
const sinCelular: InquilinoResumen = { ...moroso, id: 'sin-celular', nombre: 'Ana', apellido: 'Gómez', telefono: null, whatsapp: null, vencidoDesde: '2026-11-10', tramo: 'VENCIDO_30' };
const alDia: InquilinoResumen = { ...base, id: 'al-dia', nombre: 'Luis', apellido: 'Ruiz', whatsapp: '5491144443333' };
const resumen = { kpis: null, inquilinos: [alDia, sinCelular, moroso] } as unknown as ResumenCuentas;

beforeEach(() => {
  params.filtro = 'vencido';
  jest.mocked(getResumenCuentasAction).mockResolvedValue({ data: resumen });
});

test('desde el menú abre filtrada por deuda vencida, la más vieja primero', async () => {
  render(<InquilinosPanel />);
  const tabla = await screen.findByRole('table', { name: 'Inquilinos' });
  await within(tabla).findAllByText('Pérez Juan');
  const filas = within(tabla).getAllByRole('row').slice(1);
  expect(filas.map((f) => within(f).getAllByRole('cell')[0].textContent)).toEqual([expect.stringContaining('Pérez Juan'), expect.stringContaining('Gómez Ana')]);
  expect(screen.queryAllByText('Ruiz Luis')).toHaveLength(0);
});

test('«Recordar» solo en quien debe y tiene celular, con el mensaje armado', async () => {
  params.filtro = null;
  render(<InquilinosPanel />);
  await screen.findAllByText('Pérez Juan');
  const recordar = screen.getAllByRole('link', { name: 'Recordar el pago por WhatsApp a Pérez Juan' });
  expect(recordar).toHaveLength(2); // escritorio y celular
  const url = new URL(recordar[0].getAttribute('href')!);
  expect(url.origin + url.pathname).toBe('https://wa.me/5491155551234');
  expect(url.searchParams.get('text')).toBe(mensajeRecordatorio(moroso, 'Playa Centro'));
  expect(url.searchParams.get('text')).toMatch(/^Hola Juan, te escribimos de Playa Centro\. Tenés un saldo vencido de .*45\.000 desde el 10\/10\/2026\./);
  expect(recordar[0]).toHaveAttribute('target', '_blank');
  expect(screen.queryByRole('link', { name: /a Gómez Ana/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /a Ruiz Luis/ })).toBeNull();
});
