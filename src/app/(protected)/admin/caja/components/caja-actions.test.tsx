/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { CashContext } from '@/types/turno.type';
import { CajaActions } from './caja-actions';
jest.mock('@/actions/turnos/cash-context.action', () => ({ getCashContextAction: jest.fn() }));
jest.mock('@/components/box-list-dialog', () => ({ BoxListDialog: () => null }));
jest.mock('@/app/(protected)/(user)/tickets/components/turno-bar', () => ({ TurnoBar: ({ turnoId }: { turnoId?: string }) => <button className="rounded-md border border-border px-3 py-2 text-sm font-semibold" data-turno={turnoId}>{turnoId ? 'Cerrar turno' : 'Abrir mi turno'}</button>, CashMovementForm: () => null }));
jest.mock('./turnos-historial-panel', () => ({ TurnosHistorialPanel: () => <h2>Historial de turnos</h2> }));
const context = { active: null, pending: null, efectivoDisponible: 0, multipleShiftsEnabled: true,
  cajas: [{ id: 'principal', nombre: 'Caja principal', session: { id: 'sesion1' }, efectivoDisponible: 12000 }, { id: 'lateral', nombre: 'Entrada lateral', session: { id: 'sesion2' }, efectivoDisponible: 18000 }],
  openTurnos: [{ id: 'ana', cajaId: 'principal', cashSessionId: 'sesion1', nombre: 'Ana López', efectivoDisponible: 12000, efectivoOperado: 5000, requiereArqueo: false }, { id: 'sofia', cajaId: 'principal', cashSessionId: 'sesion1', nombre: 'Sofía García', efectivoDisponible: 12000, efectivoOperado: 4000, requiereArqueo: false }, { id: 'luis', cajaId: 'lateral', cashSessionId: 'sesion2', nombre: 'Luis Pérez', efectivoDisponible: 18000, efectivoOperado: 15000, requiereArqueo: true }] } as unknown as CashContext;
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCashContextAction).mockResolvedValue({ context }); });
test('agrupa los usuarios por caja y suma cada saldo una sola vez', async () => {
  const view = render(<CajaActions shiftsEnabled />);
  expect(await screen.findByRole('heading', { name: 'Ana López' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sofía García' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Luis Pérez' })).toBeInTheDocument();
  expect(screen.getByText(/30.000/)).toBeInTheDocument();
  expect(screen.queryByText(/42.000/)).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Cerrar turno' }).map(b => b.getAttribute('data-turno'))).toEqual(['ana','sofia','luis']);
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-panel.html', view.container.innerHTML);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' })); await waitFor(() => expect(getCashContextAction).toHaveBeenCalledTimes(2));
});
test('una consulta fallida puede reintentarse', async () => {
  jest.mocked(getCashContextAction).mockResolvedValueOnce({ error: 'No se pudo consultar la caja' }); render(<CajaActions shiftsEnabled />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar la caja');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' })); expect(await screen.findByRole('heading', { name: 'Caja principal' })).toBeInTheDocument();
});
