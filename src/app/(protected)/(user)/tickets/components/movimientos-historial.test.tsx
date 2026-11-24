/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MovimientosHistorial } from './movimientos-historial';
import { detalleOperacionAction, historialMovimientosAction, resolverCorreccionAction } from '@/actions/operaciones/operaciones.action';
import { getCashContextAction, getOperadoresAction } from '@/actions/turnos/cash-context.action';
import type { Correccion, DetalleEstadia, MovimientoHistorial, ResumenHistorial } from '@/types/operaciones.type';

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
const RESUMEN: ResumenHistorial = {
  total: 45, porTipo: { ENTRADA: 20, SALIDA: 18, ANTICIPO: 2, PASE: 3, CORRECCION: 2 },
  cobrado: { total: 54500, porMedio: { CASH: 31000, TRANSFER: 18500, MERCADOPAGO: 5000 } }, pendientes: 1,
};
const respuesta = (data: MovimientoHistorial[], total = data.length, resumen: ResumenHistorial | null = RESUMEN) =>
  ({ data: { data, meta: { totalItems: total }, filtros: { desde: '2026-11-23', hasta: '2026-11-23' }, ...(resumen ? { resumen } : {}) } });
const ultimaConsulta = () => jest.mocked(historialMovimientosAction).mock.calls.at(-1)![0];

const montar = (props: Partial<React.ComponentProps<typeof MovimientosHistorial>> = {}) => render(
  <MovimientosHistorial today="2026-11-23" isAdmin={false} turnos cobro comprobantes adentro={[]} onReceipt={jest.fn()} {...props} />,
);

beforeEach(() => {
  jest.clearAllMocks();
  // El turno abrió a las 14:00 (17:00 UTC).
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { active: { id: 'turno-mio', fechaApertura: '2026-11-23T17:00:00.000Z' } } } as never);
  jest.mocked(getOperadoresAction).mockResolvedValue({ operadores: [{ id: 'u-ana', firstName: 'Ana', lastName: 'Paz' }] });
  jest.mocked(historialMovimientosAction).mockResolvedValue(respuesta([
    fila({ duracion: 130, patente: 'AB123CD' }),
    fila({ id: 'E:reg-2', tipo: 'ENTRADA', registrationId: 'reg-2', identificacion: 'AC999ZZ', patente: 'AC999ZZ', vehiculo: 'AUTO', importe: null, medios: null, recibido: null, vuelto: null, correccion: 'CORREGIDA' }),
    fila({ id: 'M:mov-3', tipo: 'ANTICIPO', registrationId: 'reg-3', identificacion: 'AD789HJ', patente: 'AD789HJ', importe: 2000, medios: { CASH: 2000 }, recibido: null, vuelto: null }),
  ], 45));
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: detalle() });
});

test('arranca en hoy y en mi turno, con el resumen y las cantidades del servidor, y «Ver más» trae la página siguiente', async () => {
  montar();
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenCalledTimes(1));
  expect(historialMovimientosAction).toHaveBeenCalledWith(expect.objectContaining({ desde: '2026-11-23', hasta: '2026-11-23', turnoId: 'turno-mio', page: 1 }));
  expect(await screen.findByRole('switch', { name: 'Solo mi turno · desde 14:00' })).toHaveAttribute('aria-checked', 'true');
  // El resumen: movimientos, lo cobrado por medio y lo que espera revisión.
  const resumen = screen.getByRole('region', { name: 'Resumen del período' });
  expect(resumen).toHaveTextContent('20 entradas · 18 salidas');
  expect(resumen).toHaveTextContent(/Efectivo \$\s?31\.000/);
  expect(resumen).toHaveTextContent(/QR \$\s?5\.000/);
  // Los tipos con su cantidad (sin el filtro de tipo).
  expect(screen.getByRole('button', { name: /^Salidas/ })).toHaveTextContent('18');
  expect(screen.getByRole('button', { name: /^Todos/ })).toHaveTextContent('45');
  // Plata y evento operativo: la salida lleva importe, cuánto estuvo y lo recibido; la entrada no.
  const salida = screen.getByRole('button', { name: /^Salida de AB123CD/ });
  expect(salida).toHaveTextContent(/\$\s?3\.500/);
  expect(salida).toHaveTextContent(/Estuvo 2 h 10 min · Ana · entregó \$\s?5\.000 · vuelto \$\s?3\.000/);
  const entrada = screen.getByRole('button', { name: /^Entrada de AC999ZZ/ });
  expect(entrada).not.toHaveTextContent('$');
  expect(entrada).toHaveTextContent('Corregida');
  // Un cobro en efectivo sin lo que entregó lo dice, sin suponer que pagó justo.
  expect(screen.getByRole('button', { name: /^Anticipo de AD789HJ/ })).toHaveTextContent('sin informar con cuánto pagó');

  fireEvent.click(screen.getByRole('switch', { name: /Solo mi turno/ }));
  await waitFor(() => expect(ultimaConsulta()).not.toHaveProperty('turnoId', 'turno-mio'));
  expect(ultimaConsulta().turnoId).toBeUndefined();
  const llamadas = jest.mocked(historialMovimientosAction).mock.calls.length;
  fireEvent.click(await screen.findByRole('button', { name: 'Ver 20 más' }));
  await waitFor(() => expect(jest.mocked(historialMovimientosAction).mock.calls.length).toBe(llamadas + 1));
  expect(ultimaConsulta()).toMatchObject({ page: 2 });
});

test('período, tipo, búsqueda y «Más filtros» viajan al servidor; «Para revisar» filtra las pendientes', async () => {
  jest.mocked(getCashContextAction).mockResolvedValue({ context: { active: null } } as never);
  montar({ isAdmin: true });
  await waitFor(() => expect(historialMovimientosAction).toHaveBeenCalledTimes(1));
  expect(ultimaConsulta().turnoId).toBeUndefined();
  expect(screen.queryByRole('switch', { name: /Solo mi turno/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));
  await waitFor(() => expect(ultimaConsulta()).toMatchObject({ desde: '2026-11-22', hasta: '2026-11-22' }));
  fireEvent.click(screen.getByRole('button', { name: '7 días' }));
  await waitFor(() => expect(ultimaConsulta()).toMatchObject({ desde: '2026-11-17', hasta: '2026-11-23' }));
  fireEvent.click(screen.getByRole('button', { name: /^Salidas/ }));
  fireEvent.change(screen.getByLabelText('Buscar movimientos'), { target: { value: 'ab123' } });
  await waitFor(() => expect(ultimaConsulta()).toMatchObject({ tipo: 'SALIDA', q: 'ab123', page: 1 }));

  // «Más filtros»: la hoja aplica al tocar y el botón dice cuántos quedan.
  fireEvent.click(screen.getByRole('button', { name: /^Más filtros/ }));
  const hoja = await screen.findByRole('dialog');
  fireEvent.click(within(hoja).getByRole('button', { name: 'Transferencia' }));
  fireEvent.click(within(hoja).getByRole('button', { name: 'Rechazadas' }));
  fireEvent.change(await within(hoja).findByLabelText('Operador'), { target: { value: 'u-ana' } });
  await waitFor(() => expect(ultimaConsulta()).toMatchObject({ medio: 'TRANSFER', correccion: 'RECHAZADA', operadorId: 'u-ana' }));
  fireEvent.click(within(hoja).getByRole('button', { name: /^Ver 45 movimientos/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  // Los filtros de la hoja quedan a la vista y se sacan con la X.
  expect(screen.getByRole('button', { name: /^Más filtros · 3/ })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: /Quitar el filtro Transferencia/ })[0]);
  await waitFor(() => expect(ultimaConsulta().medio).toBeUndefined());

  // «Para revisar» lleva a las correcciones esperando revisión.
  fireEvent.click(screen.getAllByRole('button', { name: /esperando a administración|esperan revisión|espera revisión/ })[0]);
  await waitFor(() => expect(ultimaConsulta()).toMatchObject({ correccion: 'PENDIENTE' }));
  expect(ultimaConsulta().tipo).toBeUndefined();
});

test('sin movimientos en mi turno lo explica y ofrece ver todo el día', async () => {
  jest.mocked(historialMovimientosAction).mockResolvedValue(respuesta([], 0, { ...RESUMEN, total: 0, porTipo: {}, cobrado: { total: 0, porMedio: {} }, pendientes: 0 }));
  montar();
  expect(await screen.findByRole('heading', { name: 'Todavía no hay movimientos en tu turno' })).toBeInTheDocument();
  expect(screen.getByText(/Tu turno empezó a las 14:00/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver todo el día' }));
  await waitFor(() => expect(ultimaConsulta().turnoId).toBeUndefined());
  expect(await screen.findByRole('heading', { name: 'Todavía no hay movimientos hoy' })).toBeInTheDocument();
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
