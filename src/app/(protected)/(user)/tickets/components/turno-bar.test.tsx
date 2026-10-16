/** @jest-environment jsdom */
import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { useSession } from 'next-auth/react';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { CashContext, CajaContext, OpenTurno } from '@/types/turno.type';
import { TurnoBar, CashMovementForm } from './turno-bar';
import { addCashMovementAction } from '@/actions/turnos/cajas.action';
import { getEstadiasAbiertasTurnoAction } from '@/actions/turnos/estadias-abiertas.action';
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/tickets' }));
jest.mock('@/actions/turnos/cash-context.action', () => ({ getCashContextAction: jest.fn() }));
jest.mock('@/actions/turnos/close-turno.action', () => ({ closeTurnoAction: jest.fn() }));
jest.mock('@/actions/turnos/open-turno.action', () => ({ openTurnoAction: jest.fn() }));
jest.mock('@/actions/turnos/cajas.action', () => ({ addCashMovementAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/actions/turnos/estadias-abiertas.action', () => ({ getEstadiasAbiertasTurnoAction: jest.fn().mockResolvedValue([]) }));
// Con la suite completa corriendo en paralelo, recargar la caja puede tardar más de 1 s.
configure({ asyncUtilTimeout: 4000 });
const user = { id: 'yo', email: 'yo@test', firstName: 'Ana', lastName: 'López', role: 'ADMIN' };
const other = { id: 'otro', email: 'otro@test', firstName: 'Luis', lastName: 'Pérez', role: 'USER' };
const caja = { id: 'principal', nombre: 'Caja principal', principal: true, activa: true, session: null, pending: { id: 'cierre-de-luis', efectivoParaSiguiente: 40000 }, legacyPending: null, efectivoDisponible: 40000, traspaso: { operador: 'Luis Pérez', fechaCierre: '2026-10-05T10:00:00Z', vehiculosDejados: 10, vehiculosActivos: 10 }, operadores: [] } as unknown as CajaContext;
const shift = (owner = user, shared = false): OpenTurno => ({ id: owner.id + '-turno', usuarioApertura: owner, nombre: owner.firstName, fechaApertura: '2026-10-05T10:00:00Z', estado: 'ABIERTO', caja, cajaId: caja.id, cashSessionId: 'sesion', efectivoDisponible: 900, requiereArqueo: !shared, usuariosEnCaja: shared ? 2 : 1 } as unknown as OpenTurno);
const context = (active: OpenTurno | null = null): CashContext => ({ active, pending: null, efectivoDisponible: active ? 900 : 40000, openTurnos: [shift(other)], cajas: [caja], multipleShiftsEnabled: false });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(useSession).mockReturnValue({ data: { user }, status: 'authenticated' } as ReturnType<typeof useSession>); jest.mocked(getCashContextAction).mockResolvedValue({ context: context() }); jest.mocked(openTurnoAction).mockResolvedValue({ error: 'Prueba' }); jest.mocked(closeTurnoAction).mockResolvedValue({ error: 'Prueba' }); });

test('una caja recibe el fondo del último cierre sin pedir elegir caja', async () => {
  render(<TurnoBar />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const input = await screen.findByLabelText('Efectivo que recibís');
  await waitFor(() => expect(input).toHaveValue(40000));
  expect(screen.queryByLabelText('¿En qué caja vas a trabajar?')).not.toBeInTheDocument();
  expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  expect(screen.getByText('Vehículos que dejó dentro')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Lo que recibís del turno anterior' })).toHaveTextContent('10');
  // Mientras recarga la caja el botón dice «Abriendo…»: se espera a que vuelva a su texto.
  const submit = await screen.findByRole('button', { name: 'Abrir caja y mi turno' });
  await waitFor(() => expect(submit).toBeEnabled());
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-open.html', document.body.innerHTML);
  fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 40000, sesionAnteriorId: 'cierre-de-luis', cajaId: 'principal' })));
});

test('permite recibir menos que el esperado cuando se explica la diferencia', async () => {
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const input = await screen.findByLabelText('Efectivo que recibís'); await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: '39000' } });
  const submit = await screen.findByRole('button', { name: 'Abrir caja y mi turno' }); expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo de la diferencia al recibir'), { target: { value: 'Faltante al recibir' } }); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 39000, motivoApertura: 'Faltante al recibir' })));
});

test('al unirse a la caja abierta no vuelve a cargar el fondo', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { ...context(), multipleShiftsEnabled: true, cajas: [{ ...caja, session: { id: 'compartida' } as CajaContext['session'], operadores: [{ turnoId: 'otro-turno', id: 'otro', nombre: 'Luis Pérez' }] }] } });
  render(<TurnoBar />); fireEvent.click(screen.getByRole('button', { name: 'Abrir mi turno' }));
  expect(await screen.findByText('Te vas a unir a una caja abierta')).toBeInTheDocument();
  expect(screen.queryByLabelText('Efectivo que recibís')).not.toBeInTheDocument();
  const submit = await screen.findByRole('button', { name: 'Abrir mi turno en esta caja' }); await waitFor(() => expect(submit).toBeEnabled()); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 0, sesionActivaId: 'compartida' })));
});

test('si comparte caja cierra sólo su turno sin pedir efectivo contado', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift(user, true)) });
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar sólo mi turno' }); await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  expect(screen.queryByLabelText('¿Cuánto efectivo contaste?')).not.toBeInTheDocument();
  // Se habilita cuando terminó de cargar el repaso de los vehículos que siguen adentro.
  const confirmar = screen.getByRole('button', { name: 'Confirmar cierre de turno' }); await waitFor(() => expect(confirmar).toBeEnabled()); fireEvent.click(confirmar);
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith('yo-turno', expect.objectContaining({ cerrarCaja: false })));
  expect(jest.mocked(closeTurnoAction).mock.calls[0][1]).not.toHaveProperty('efectivoContado');
});

test('para cerrar hay que marcar los autos de más de 4 horas como que siguen, o cobrarlos', async () => {
  jest.mocked(getEstadiasAbiertasTurnoAction).mockResolvedValueOnce([
    { id: 'vieja', patente: 'AF876EB', vehicleType: 'AUTO', entryDay: '2026-10-05', entryTime: '07:11:00', anticipo: 0 },
  ]);
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift(user, true)) });
  const onCobrarEstadia = jest.fn();
  render(<TurnoBar onCobrarEstadia={onCobrarEstadia} />); fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar sólo mi turno' }); await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  expect(await screen.findByText('Un auto lleva más de 4 h')).toBeInTheDocument();
  const confirmar = screen.getByRole('button', { name: 'Confirmar cierre de turno' });
  expect(confirmar).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Sigue en la playa/ }));
  await waitFor(() => expect(confirmar).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Se fue: cobrar' }));
  expect(onCobrarEstadia).toHaveBeenCalledWith('vieja');
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


test('confirma el conteo y conserva el fondo objetivo sin escribir importes', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift()) });
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar mi turno y contar la caja' });
  await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  expect(await screen.findByRole('button', { name: /^Dejar el fondo/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /^Conté todo/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Dejar el fondo/ }));
  expect(screen.getByLabelText('¿Cuánto efectivo contaste?')).toHaveValue(900);
  expect(screen.getByLabelText('Retiro de recaudación al cerrar (sin sueldo)')).toHaveValue(0);
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-close.html', document.body.innerHTML);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre de turno y caja' }));
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith('yo-turno', expect.objectContaining({ efectivoContado: 900, efectivoEsperado: 900, efectivoParaSiguiente: 900 })));
});

test('confirma el fondo recibido y suma cambio con botones, conservando diferencias', async () => {
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const received = await screen.findByLabelText('Efectivo que recibís'); await waitFor(() => expect(received).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Sin efectivo recibido' }));
  expect(received).toHaveValue(0);
  expect(screen.getByLabelText('Motivo de la diferencia al recibir')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Recibí todo/ }));
  fireEvent.click(screen.getByRole('button', { name: /500$/ }));
  fireEvent.click(screen.getByRole('button', { name: /1.000$/ }));
  expect(screen.getByLabelText('Cambio que agregás ahora')).toHaveValue(1500);
  fireEvent.click(screen.getByRole('button', { name: 'No agrego cambio' }));
  expect(screen.getByLabelText('Cambio que agregás ahora')).toHaveValue(0);
  fireEvent.click(screen.getByRole('button', { name: /1.000$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir caja y mi turno' }));
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ fondoInicial: 41000, cambioAgregado: 1000 })));
});

test('operadores no ven las acciones de retiro ni aporte, incluso en su propia caja', async () => {
  jest.mocked(useSession).mockReturnValue({ data: { user: { ...user, role: 'USER' } }, status: 'authenticated' } as ReturnType<typeof useSession>);
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift()) });
  render(<><TurnoBar /><CashMovementForm sesionId="sesion" expected={900} onUpdated={jest.fn()} /></>);
  fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  expect(await screen.findByRole('button', { name: 'Cerrar mi turno y contar la caja' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Movimientos de efectivo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retirar efectivo' })).not.toBeInTheDocument();
});

test('administración puede retirar todo con motivo y revisar el saldo resultante', async () => {
  const onUpdated = jest.fn();
  jest.mocked(addCashMovementAction).mockResolvedValue({ success: true });
  const view = render(<CashMovementForm sesionId="sesion" expected={900} onUpdated={onUpdated} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retirar efectivo' }));
  fireEvent.click(screen.getByRole('button', { name: /^Retirar todo/ }));
  expect(screen.getByRole('button', { name: 'Confirmar retiro' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo del retiro'), { target: { value: 'Entrega al encargado' } });
  expect(screen.getByText('Efectivo después del movimiento')).toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-movement.html', view.container.innerHTML);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  await waitFor(() => expect(addCashMovementAction).toHaveBeenCalledWith('sesion', { tipo: 'RETIRO', importe: 900, efectivoEsperado: 900, motivo: 'Entrega al encargado' }));
  expect(onUpdated).toHaveBeenCalled();
});


test('el selector permite elegir otra caja y utiliza exclusivamente su fondo', async () => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  const lateral = { ...caja, id: 'lateral', nombre: 'Entrada lateral', principal: false, efectivoDisponible: 20000, pending: { ...caja.pending!, id: 'cierre-lateral', efectivoParaSiguiente: 20000 } };
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { ...context(), multipleShiftsEnabled: true, cajas: [caja, lateral] } });
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Abrir mi turno' }));
  const select = await screen.findByRole('combobox', { name: '¿En qué caja vas a trabajar?' });
  await waitFor(() => expect(select).toBeEnabled()); fireEvent.keyDown(select, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: 'Entrada lateral · Disponible' });
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-select.html', document.body.innerHTML);
  fireEvent.click(option);
  await waitFor(() => expect(screen.getByLabelText('Efectivo que recibís')).toHaveValue(20000));
  const submit = await screen.findByRole('button', { name: 'Abrir caja y mi turno' }); await waitFor(() => expect(submit).toBeEnabled()); fireEvent.click(submit);
  await waitFor(() => expect(openTurnoAction).toHaveBeenCalledWith(expect.objectContaining({ cajaId: 'lateral', sesionAnteriorId: 'cierre-lateral', fondoInicial: 20000 })));
});


test.each([{ counted: 105000, salary: 25000, withdrawn: 65000 }, { counted: 23000, salary: 0, withdrawn: 8000 }])('sueldo protege el fondo al contar $counted', async ({ counted, salary, withdrawn }) => {
  const active = { ...shift(), efectivoDisponible: counted, fondoObjetivo: 15000, sueldoPrevisto: 25000 };
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(active) });
  render(<TurnoBar />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar mi turno y contar la caja' });
  await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  fireEvent.click(screen.getByRole('button', { name: /^Conté todo/ }));
  expect(screen.getByLabelText('Retiro de recaudación al cerrar (sin sueldo)')).toHaveValue(withdrawn);
  if (!salary) expect(screen.getByRole('alert')).toHaveTextContent('No se descontará el sueldo');
  if (process.env.TURNOS_VISUAL_QA) writeFileSync(`../estacionamiento-back-demo/.tmp/sueldo-${counted}.html`, document.body.innerHTML);
  const confirmar = screen.getByRole('button', { name: 'Confirmar cierre de turno y caja' }); await waitFor(() => expect(confirmar).toBeEnabled()); fireEvent.click(confirmar);
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith(active.id, expect.objectContaining({ sueldoEsperado: salary, efectivoParaSiguiente: 15000 })));
});


test('cierre con efectivo coincidente permite dejar una nota para el próximo turno', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: context(shift()) });
  render(<TurnoBar />); fireEvent.click(await screen.findByRole('button', { name: 'Mi turno' }));
  const close = await screen.findByRole('button', { name: 'Cerrar mi turno y contar la caja' });
  await waitFor(() => expect(close).toBeEnabled()); fireEvent.click(close);
  fireEvent.click(await screen.findByRole('button', { name: /^Conté todo/ }));
  fireEvent.change(screen.getByLabelText('Nota del turno (opcional)'), { target: { value: 'Revisar la camioneta que quedó dentro' } });
  expect(screen.getByText('Se publica automáticamente en Avisos.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre de turno y caja' }));
  await waitFor(() => expect(closeTurnoAction).toHaveBeenCalledWith('yo-turno', expect.objectContaining({ efectivoContado: 900, observaciones: 'Revisar la camioneta que quedó dentro' })));
});

// Al desbloquear el celular el reloj de la caja dispara antes de que vuelva la red. La consulta que
// falla con «Failed to fetch» corre en una transición: si se escapaba, React la mandaba a la
// pantalla de error y la app entera quedaba en «La aplicación tuvo un error».
test('una consulta de la caja que falla por la red no tira la pantalla de error', async () => {
  class Atrapa extends React.Component<{ children: React.ReactNode }, { roto: boolean }> {
    state = { roto: false };
    static getDerivedStateFromError() { return { roto: true }; }
    render() { return this.state.roto ? <p>pantalla de error</p> : this.props.children; }
  }
  render(<Atrapa><TurnoBar /></Atrapa>);
  expect(await screen.findByRole('button', { name: 'Abrir mi turno' })).toBeInTheDocument();
  const antes = jest.mocked(getCashContextAction).mock.calls.length;
  jest.mocked(getCashContextAction).mockRejectedValue(new TypeError('Failed to fetch'));
  window.dispatchEvent(new Event('online'));
  await waitFor(() => expect(jest.mocked(getCashContextAction).mock.calls.length).toBeGreaterThan(antes));
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByText('pantalla de error')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Abrir mi turno' })).toBeInTheDocument();
});
