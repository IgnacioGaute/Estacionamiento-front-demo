/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { useSession } from 'next-auth/react';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { CashContext, CajaContext, OpenTurno } from '@/types/turno.type';
import { TurnoBar } from './turno-bar';
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/tickets' }));
jest.mock('@/actions/turnos/cash-context.action', () => ({ getCashContextAction: jest.fn() }));
jest.mock('@/actions/turnos/close-turno.action', () => ({ closeTurnoAction: jest.fn() }));
jest.mock('@/actions/turnos/open-turno.action', () => ({ openTurnoAction: jest.fn() }));
jest.mock('@/actions/turnos/cajas.action', () => ({ addCashMovementAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const user = { id: 'yo', email: 'yo@test', firstName: 'Ana', lastName: 'López', role: 'ADMIN' };
const other = { id: 'otro', email: 'otro@test', firstName: 'Luis', lastName: 'Pérez', role: 'USER' };
const caja = { id: 'principal', nombre: 'Caja principal', principal: true, activa: true, session: null, pending: { id: 'cierre-de-luis', efectivoParaSiguiente: 40000 }, legacyPending: null, efectivoDisponible: 40000, operadores: [] } as unknown as CajaContext;
const shift = (owner = user, shared = false): OpenTurno => ({ id: owner.id + '-turno', usuarioApertura: owner, nombre: owner.firstName, fechaApertura: '2026-10-05T10:00:00Z', estado: 'ABIERTO', caja, cajaId: caja.id, cashSessionId: 'sesion', efectivoDisponible: 900, requiereArqueo: !shared, usuariosEnCaja: shared ? 2 : 1 } as unknown as OpenTurno);
const context = (active: OpenTurno | null = null): CashContext => ({ active, pending: null, efectivoDisponible: active ? 900 : 40000, openTurnos: [shift(other)], cajas: [caja], multipleShiftsEnabled: false });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(useSession).mockReturnValue({ data: { user }, status: 'authenticated' } as ReturnType<typeof useSession>); jest.mocked(getCashContextAction).mockResolvedValue({ context: context() }); jest.mocked(openTurnoAction).mockResolvedValue({ error: 'Prueba' }); jest.mocked(closeTurnoAction).mockResolvedValue({ error: 'Prueba' }); });

test('una caja recibe el fondo del último cierre sin pedir elegir caja', async () => {
  render(<TurnoBar />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const input = await screen.findByLabelText('¿Cuánto efectivo recibiste en la caja?');
  await waitFor(() => expect(input).toHaveValue(40000));
  expect(screen.queryByLabelText('¿En qué caja vas a trabajar?')).not.toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-open.html', document.body.innerHTML);
  // Mientras recarga la caja el botón dice «Abriendo…»: se espera a que vuelva a su texto.
  const submit = await screen.findByRole('button', { name: 'Abrir caja y mi turno' });
  await waitFor(() => expect(submit).toBeEnabled()); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 40000, sesionAnteriorId: 'cierre-de-luis', cajaId: 'principal' })));
});

test('permite recibir menos que el esperado cuando se explica la diferencia', async () => {
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const input = await screen.findByLabelText('¿Cuánto efectivo recibiste en la caja?'); await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: '39000' } });
  const submit = await screen.findByRole('button', { name: 'Abrir caja y mi turno' }); expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo de la diferencia al recibir'), { target: { value: 'Faltante al recibir' } }); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 39000, motivoApertura: 'Faltante al recibir' })));
});

test('al unirse a la caja abierta no vuelve a cargar el fondo', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { ...context(), multipleShiftsEnabled: true, cajas: [{ ...caja, session: { id: 'compartida' } as CajaContext['session'], operadores: [{ turnoId: 'otro-turno', id: 'otro', nombre: 'Luis Pérez' }] }] } });
  render(<TurnoBar />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mi turno' }));
  expect(await screen.findByText('Te vas a unir a una caja abierta')).toBeInTheDocument();
  expect(screen.queryByLabelText('¿Cuánto efectivo recibiste en la caja?')).not.toBeInTheDocument();
  const submit = await screen.findByRole('button', { name: 'Abrir mi turno en esta caja' }); await waitFor(() => expect(submit).toBeEnabled()); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 0, sesionActivaId: 'compartida' })));
});

test('si comparte caja cierra sólo su turno sin pedir efectivo contado', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift(user, true)) });
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar sólo mi turno' }); await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  expect(screen.queryByLabelText('¿Cuánto efectivo contaste?')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre de turno' }));
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith('yo-turno', expect.objectContaining({ cerrarCaja: false })));
  expect(jest.mocked(closeTurnoAction).mock.calls[0][1]).not.toHaveProperty('efectivoContado');
});

test('el administrador cierra el último turno con arqueo y motivo, preservando el formulario si falla', async () => {
  render(<TurnoBar turnoId="otro-turno" />); fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }));
  const input = await screen.findByLabelText('¿Cuánto efectivo contaste?'); await waitFor(() => expect(input).toBeEnabled()); fireEvent.change(input, { target: { value: '900' } });
  const submit = await screen.findByRole('button', { name: 'Confirmar cierre de turno y caja' }); expect(submit).toBeDisabled(); fireEvent.change(screen.getByLabelText('¿Por qué cerrás el turno de otra persona?'), { target: { value: 'Fin de jornada' } }); fireEvent.click(submit);
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith('otro-turno', expect.objectContaining({ cerrarCaja: true, efectivoContado: 900, efectivoEsperado: 900, motivoCierreForzado: 'Fin de jornada' })));
  expect(input).toHaveValue(900);
});

test('un turno ya cerrado muestra un error y no ofrece abrir uno ajeno', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { ...context(), openTurnos: [] } });
  render(<TurnoBar turnoId="otro-turno" />); fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este turno ya no está abierto');
});
