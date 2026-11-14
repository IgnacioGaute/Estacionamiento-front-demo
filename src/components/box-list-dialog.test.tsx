/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { BoxListDialog } from './box-list-dialog';
import { findBoxByDate } from '@/services/box-lists.service';
import type { BoxList, BoxListResponse, TurnoDelDia } from '@/types/box-list.type';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { token: 'test', user: { email: 'test@example.test' } } }) }));
jest.mock('@/services/box-lists.service', () => ({ findBoxByDate: jest.fn() }));
jest.mock('@/actions/turnos/shifts-enabled.action', () => ({ getShiftsEnabledAction: async () => true }));
jest.mock('@/utils/generate-box-list', () => ({ __esModule: true, default: jest.fn() }));

const entry = (id: string, nombre: string): TurnoDelDia => ({
  turnoId: id, efectivoDelDia: 106350, movimientos: 1, desde: '2026-10-10T11:00:00Z', hasta: '2026-10-10T15:00:00Z', abarcaOtrosDias: false,
  turno: { id, nombre, estado: 'CERRADO', caja: { nombre: 'Caja principal' }, fondoInicial: 15000,
    resumen: { efectivoCobrado: 106350, mercadoPagoAlias: 0, mercadoPagoQr: 0, transferencias: 0,
      gastosEfectivo: 0, sueldoRetirado: 50000, retirosRecaudacion: 56350, totalRetirado: 106350,
      vehiculosInicio: 9, salidas: 1, vehiculosFin: 8, efectivoParaSiguiente: 15000, movimientos: [] } },
} as unknown as TurnoDelDia);
const response = (turnos: TurnoDelDia[]) => ({ data: { totalPrice: 106350, cobrosInquilinos: null, turnosDelDia: turnos } as BoxList } as BoxListResponse);

test('despliega el primer turno y mantiene uno solo abierto al cambiar turno o fecha', async () => {
  jest.mocked(findBoxByDate).mockResolvedValueOnce(response([entry('ultimo', 'Último cierre'), entry('anterior', 'Cierre anterior'), entry('primero', 'Primer cierre')]))
    .mockResolvedValueOnce(response([entry('ayer', 'Turno de ayer')]));
  render(<BoxListDialog open setOpen={jest.fn()} />);
  const last = await screen.findByRole('button', { name: /Último cierre/ });
  const previous = screen.getByRole('button', { name: /Cierre anterior/ });
  const first = screen.getByRole('button', { name: /Primer cierre/ });
  expect(last).toHaveAttribute('aria-expanded', 'true');
  expect(previous).toHaveAttribute('aria-expanded', 'false');
  expect(first).toHaveAttribute('aria-expanded', 'false');
  const summary = within(screen.getByRole('region', { name: /Último cierre/ }));
  expect(summary.getByText(/Fondo inicial de caja:/)).toHaveTextContent(/15.000/);
  expect(summary.getByText(/Lo que queda no se incluye en lo retirado/)).toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-accordion.html', document.body.innerHTML);
  fireEvent.click(previous);
  expect(last).toHaveAttribute('aria-expanded', 'false');
  expect(previous).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(previous);
  expect(previous).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
  expect(await screen.findByRole('button', { name: /Turno de ayer/ })).toHaveAttribute('aria-expanded', 'true');
  await waitFor(() => expect(screen.queryByRole('button', { name: /Último cierre/ })).not.toBeInTheDocument());
});
