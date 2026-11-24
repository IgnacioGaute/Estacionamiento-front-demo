/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MovimientosHistorial } from './movimientos-historial';
import { detalleOperacionAction, historialMovimientosAction, resolverCorreccionAction } from '@/actions/operaciones/operaciones.action';
import { getCashContextAction, getOperadoresAction } from '@/actions/turnos/cash-context.action';
import type { Correccion, DetalleEstadia, MovimientoHistorial } from '@/types/operaciones.type';

jest.mock('@/actions/operaciones/operaciones.action', () => ({
  historialMovimientosAction: jest.fn(),
  detalleOperacionAction: jest.fn(),
  resolverCorreccionAction: jest.fn(),
  previsualizarCorreccionAction: jest.fn(),
  corregirAction: jest.fn(),
  transferenciasParaCorreccionAction: jest.fn(),
}));
jest.mock('@/actions/turnos/cash-context.action', () => ({ getCashContextAction: jest.fn(), getOperadoresAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Con la suite completa corriendo en paralelo, cargar y revisar la operación puede tardar más de 1 s.
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(15000);
// La lista con desplazamiento usa IntersectionObserver, que jsdom no tiene: acá alcanza con sus hijos.
jest.mock('@/components/animated-scroll-list', () => ({
  AnimatedScrollList: ({ children, label }: { children: React.ReactNode; label: string }) => <div role="region" aria-label={label}>{children}</div>,
}));

const fila = (extra: Partial<MovimientoHistorial>): MovimientoHistorial => ({
  id: 'S:reg-1', tipo: 'SALIDA', fecha: '2026-11-23T15:00:00.000Z', registrationId: 'reg-1', paseId: null, identificacion: 'AB123CD', operador: 'Ana',
  turnoId: 't1', importe: 3500, medios: { CASH: 2000, TRANSFER: 1500 }, recibido: 5000, vuelto: 3000, correccion: null, detalle: null, ...extra,
});
const correccion = (extra: Partial<Correccion> = {}): Correccion => ({
  id: 'c1', solicitudId: 's1', tipo: 'MEDIO_PAGO', estado: 'PENDIENTE', registrationId: 'reg-1', paseId: null, movimientoId: 'mov-1', destinoRegistrationId: null,
  turnoId: 't1', imputadaTurnoId: null, posteriorAlCierre: false, usuarioNombre: 'Beto', motivo: 'Pagó con otro medio', detalle: 'Me mostró la transferencia',
  antes: { metodo: 'CASH' }, despues: { metodo: 'TRANSFER' }, efecto: { lineas: ['Antes: efectivo.', 'Después: transferencia (falta verificarla).'] },
  evidencia: null, revisadoPorNombre: null, revisadoEl: null, resolucion: null, aplicadaEl: null, createdAt: '2026-11-23T15:10:00.000Z', ...extra,
});
const detalle = (extra: Partial<DetalleEstadia> = {}): DetalleEstadia => ({
  tipo: 'ESTADIA', id: 'reg-1', identificacion: 'AB123CD', patente: 'AB123CD', vehicleType: 'AUTO', entrada: '2026-11-23T13:00:00.000Z', salida: '2026-11-23T15:00:00.000Z',
  entryOperatorName: 'Ana', exitOperatorName: 'Ana', exitTurnoId: 't1', precio: 3500, cobrado: 3500, medios: { CASH: 2000, TRANSFER: 1500 },
  pagos: [{ id: 'mov-1', tipo: 'SALDO', metodo: 'CASH', monto: 3500, fecha: '2026-11-23T15:00:00.000Z', operador: 'Ana', turnoId: 't1', efectivoRecibido: 5000, vuelto: 1500,
    recibidoCorregido: false, corregido: 1500, confirmadoPorMp: false, directo: true, motivoRevision: null }],
  ajustes: [{ id: 'a1', tipo: 'AJUSTE', metodo: 'CASH', monto: -1500, motivo: 'Corrección de medio de pago: efectivo → transferencia', fecha: '2026-11-23T15:05:00.000Z', correccionId: 'c0', operador: 'Ana' }],
  correcciones: [correccion()], version: 'v7', permiso: { directo: true, motivoRevision: null }, comprobantes: { entrada: true, salida: true }, ...extra,
});
const respuesta = (data: MovimientoHistorial[], total = data.length) => ({ data: { data, meta: { totalItems: total }, filtros: { desde: '2026-11-23', hasta: '2026-11-23' } } });

const montar = (props: Partial<React.ComponentProps<typeof MovimientosHistorial>> = {}) => render(
  <MovimientosHistorial today="2026-11-23" isAdmin={false} turnos cobro comprobantes adentro={[]} onReceipt={jest.fn()} {...props} />,
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { active: { id: 'turno-mio' } } } as never);
  jest.mocked(getOperadoresAction).mockResolvedValue({ operadores: [{ id: 'u-ana', firstName: 'Ana', lastName: 'Paz' }] });
  jest.mocked(historialMovimientosAction).mockResolvedValue(respuesta([fila({}), fila({ id: 'E:reg-2', tipo: 'ENTRADA', registrationId: 'reg-2', identificacion: 'AC999ZZ', importe: null, medios: null, recibido: null, vuelto: null, correccion: 'CORREGIDA' })], 45));
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: detalle() });
});

test('arranca en el día de hoy y en mi turno, con la consulta paginada en el servidor', async () => {
  montar();
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenCalledTimes(1));
  expect(historialMovimientosAction).toHaveBeenCalledWith(expect.objectContaining({ desde: '2026-11-23', hasta: '2026-11-23', turnoId: 'turno-mio', page: 1 }));
  expect(await screen.findByRole('status')).toHaveTextContent('45 movimientos · Hoy · Mi turno');
  const lista = screen.getByRole('region', { name: /Movimientos: desplazá/ });
  // Plata y evento operativo: la salida lleva importe, medios vigentes y lo recibido; la entrada no.
  const salida = within(lista).getByRole('button', { name: /^Salida de AB123CD/ });
  expect(salida).toHaveTextContent(/\$\s?3\.500/);
  expect(salida).toHaveTextContent(/Efectivo \$\s?2\.000 · Transferencia \$\s?1\.500 · Entregó \$\s?5\.000 · vuelto \$\s?3\.000/);
  const entrada = within(lista).getByRole('button', { name: /^Entrada de AC999ZZ/ });
  expect(entrada).not.toHaveTextContent('$');
  expect(entrada).toHaveTextContent('Corregida');

  fireEvent.click(screen.getByRole('button', { name: 'Mi turno' }));
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenLastCalledWith(expect.not.objectContaining({ turnoId: expect.anything() })));
  fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
});

test('sin turno abierto muestra el día entero y los filtros viajan al servidor', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { active: null } } as never);
  montar({ isAdmin: true });
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenCalledTimes(1));
  expect(historialMovimientosAction).toHaveBeenCalledWith(expect.not.objectContaining({ turnoId: expect.anything() }));
  expect(screen.queryByRole('button', { name: 'Mi turno' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'SALIDA' } });
  fireEvent.change(screen.getByLabelText('Medio de pago'), { target: { value: 'TRANSFER' } });
  fireEvent.change(screen.getByLabelText('Correcciones'), { target: { value: 'PENDIENTE' } });
  fireEvent.change(await screen.findByLabelText('Operador'), { target: { value: 'u-ana' } });
  fireEvent.change(screen.getByLabelText('Patente, ticket o apellido'), { target: { value: 'ab123' } });
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenLastCalledWith(expect.objectContaining({
    tipo: 'SALIDA', medio: 'TRANSFER', correccion: 'PENDIENTE', operadorId: 'u-ana', q: 'ab123', page: 1,
  })));
  expect(screen.getByRole('button', { name: /Filtros · 4/ })).toBeInTheDocument();
});

test('el detalle muestra el cobro como se registró, los ajustes y el historial de cambios', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /^Salida de AB123CD/ }));
  await waitFor(() => expect(detalleOperacionAction).toHaveBeenCalledWith('ESTADIA', 'reg-1'));
  const dialogo = await screen.findByRole('dialog');
  expect(within(dialogo).getByText(/Cobro de la salida · Efectivo/)).toBeInTheDocument();
  expect(dialogo).toHaveTextContent(/Entregó \$\s?5\.000 · vuelto \$\s?1\.500/);
  expect(dialogo).toHaveTextContent(/\$\s?1\.500 se corrigió a otro medio/);
  const historial = within(dialogo).getByRole('region', { name: 'Historial de cambios' });
  expect(historial).toHaveTextContent('Medio de pago');
  expect(historial).toHaveTextContent('Pendiente');
  expect(historial).toHaveTextContent('Después: transferencia (falta verificarla).');
  // Un operador no resuelve: solo administración.
  expect(within(historial).queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
  expect(within(dialogo).getByRole('button', { name: /Entrada/ })).toBeInTheDocument();
  expect(within(dialogo).getByRole('button', { name: /Corregir/ })).toBeInTheDocument();
});

test('administración resuelve una corrección pendiente con lo que hizo', async () => {
  jest.mocked(resolverCorreccionAction).mockResolvedValue({ data: correccion({ estado: 'RECHAZADA' }) });
  montar({ isAdmin: true });
  fireEvent.click(await screen.findByRole('button', { name: /^Salida de AB123CD/ }));
  const historial = await screen.findByRole('region', { name: 'Historial de cambios' });
  fireEvent.click(within(historial).getByRole('button', { name: 'Rechazar' }));
  const confirmar = within(historial).getByRole('button', { name: 'Rechazar' });
  expect(confirmar).toBeDisabled();
  fireEvent.change(within(historial).getByLabelText('Por qué se rechaza'), { target: { value: 'No hay acreditación en Mercado Pago' } });
  fireEvent.click(confirmar);
  await waitFor(() => expect(resolverCorreccionAction).toHaveBeenCalledWith('c1', { accion: 'RECHAZAR', resolucion: 'No hay acreditación en Mercado Pago', version: 'v7' }));
  // Se vuelve a pedir el detalle y la lista.
  await waitFor(() => expect(detalleOperacionAction).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenCalledTimes(2));
});
