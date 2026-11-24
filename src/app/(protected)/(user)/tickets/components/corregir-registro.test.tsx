/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CorregirRegistro } from './corregir-registro';
import {
  corregirAction, detalleOperacionAction, previsualizarCorreccionAction, transferenciasParaCorreccionAction,
} from '@/actions/operaciones/operaciones.action';
import type { Correccion, DetalleEstadia, DetallePase, PrevisualizacionCorreccion } from '@/types/operaciones.type';

jest.mock('@/actions/operaciones/operaciones.action', () => ({
  detalleOperacionAction: jest.fn(),
  previsualizarCorreccionAction: jest.fn(),
  corregirAction: jest.fn(),
  transferenciasParaCorreccionAction: jest.fn(),
}));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Con la suite completa corriendo en paralelo, cargar y revisar la operación puede tardar más de 1 s.
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(15000);

const cobroEfectivo = {
  id: 'mov-1', tipo: 'SALDO' as const, metodo: 'CASH' as const, monto: 3500, fecha: '2026-11-20T15:00:00.000Z', operador: 'Ana', turnoId: 't1',
  efectivoRecibido: 5000, vuelto: 1500, recibidoCorregido: false, corregido: 0, confirmadoPorMp: false, directo: true, motivoRevision: null,
};
const estadia = (extra: Partial<DetalleEstadia> = {}): DetalleEstadia => ({
  tipo: 'ESTADIA', id: 'reg-1', identificacion: 'AB123CD', patente: 'AB123CD', vehicleType: 'AUTO',
  entrada: '2026-11-20T13:00:00.000Z', salida: '2026-11-20T15:00:00.000Z', entryOperatorName: 'Ana', exitOperatorName: 'Ana', exitTurnoId: 't1',
  precio: 3500, cobrado: 3500, medios: { CASH: 3500 }, pagos: [cobroEfectivo], ajustes: [], correcciones: [], version: 'v1',
  permiso: { directo: true, motivoRevision: null }, comprobantes: { entrada: true, salida: true }, ...extra,
});
const pase: DetallePase = {
  tipo: 'PASE', id: 'pase-1', identificacion: 'AC111AA', ticketTimeType: 'DIA', alta: '2026-11-20T12:00:00.000Z', retiro: null, precio: 8000,
  pagado: true, metodo: 'CASH', efectivoRecibido: 10000, vuelto: 2000, recibidoCorregido: false, entryOperatorName: 'Ana', paymentOperatorName: 'Ana',
  exitOperatorName: null, correcciones: [], version: 'p1', permiso: { directo: true, motivoRevision: null },
};
const previa = (estado: 'APLICADA' | 'PENDIENTE', lineas: string[], extra: Partial<PrevisualizacionCorreccion> = {}): PrevisualizacionCorreccion =>
  ({ estado, efecto: { lineas, efectivo: estado === 'APLICADA' ? -3500 : 0, digital: 0 }, antes: {}, despues: {}, motivoRevision: null, ...extra });
const guardada = (estado: 'APLICADA' | 'PENDIENTE') => ({ id: 'c1', estado, tipo: 'MEDIO_PAGO', antes: {}, despues: {} }) as unknown as Correccion;

const abrir = (props: Partial<React.ComponentProps<typeof CorregirRegistro>> = {}) =>
  render(<CorregirRegistro operacion={{ tipo: 'ESTADIA', id: 'reg-1' }} open onOpenChange={jest.fn()} {...props} />);
// En el resumen, el botón se habilita cuando termina la revisión (con la suite en paralelo tarda).
const confirmarResumen = async () => {
  const boton = await screen.findByRole('button', { name: /Aplicar corrección/ });
  await waitFor(() => expect(boton).toBeEnabled());
  fireEvent.click(boton);
};
const primario = () => screen.getAllByRole('button').find((b) => /Revisar corrección|Aplicar corrección|Enviar a revisión|Revisando|Guardando/.test(b.textContent ?? ''))!;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: estadia() });
});

test('nada viene elegido y lo que no aplica dice por qué', async () => {
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: estadia({ salida: null, precio: null, pagos: [{ ...cobroEfectivo, tipo: 'ANTICIPO', metodo: 'MERCADOPAGO', confirmadoPorMp: true }] }) });
  abrir();
  expect(await screen.findByText('¿Qué hay que corregir?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Patente.*Sigue adentro/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Medio de pago.*Mercado Pago confirmó/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Vehículo equivocado.*Todavía no salió/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Otro error/ })).toBeEnabled();
  expect(screen.getByText(/El importe, la tarifa y los horarios no se editan/)).toBeInTheDocument();
});

test('efectivo a transferencia con la acreditación de Mercado Pago: resumen, confirmar y la misma solicitud', async () => {
  jest.mocked(transferenciasParaCorreccionAction).mockResolvedValue({ data: { disponible: true, motivo: null, opciones: [
    { operacionId: '987', importe: 3500, fecha: '2026-11-20T15:02:00.000Z', nombre: 'Juan Pérez', entidad: 'Banco', documento: null },
  ] } });
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('APLICADA', ['Antes: efectivo.', 'Después: transferencia verificada en Mercado Pago.']) });
  jest.mocked(corregirAction).mockResolvedValue({ data: guardada('APLICADA') });
  const onListo = jest.fn();
  abrir({ onListo });
  fireEvent.click(await screen.findByRole('button', { name: /Medio de pago/ }));
  // Un solo cobro: es ese. El importe no viene elegido.
  expect(screen.getByRole('button', { name: /Cobro de la salida · Efectivo/ })).toHaveAttribute('aria-pressed', 'true');
  expect(primario()).toBeDisabled();
  expect(primario()).toHaveTextContent('Elegí cuánto fue por el otro medio');
  fireEvent.click(screen.getByRole('button', { name: /^Todo/ }));
  await waitFor(() => expect(transferenciasParaCorreccionAction).toHaveBeenCalledWith('mov-1', 3500));
  await waitFor(() => expect(primario()).toHaveTextContent('Elegí la transferencia o «No la encuentro»'));
  fireEvent.click(await screen.findByRole('button', { name: /Juan Pérez/ }));
  expect(primario()).toHaveTextContent('Elegí el motivo');
  fireEvent.click(screen.getByRole('button', { name: 'Pagó con otro medio' }));
  fireEvent.click(primario());
  await waitFor(() => expect(previsualizarCorreccionAction).toHaveBeenCalled());
  const enviado = jest.mocked(previsualizarCorreccionAction).mock.calls[0][0];
  expect(enviado).toMatchObject({ tipo: 'MEDIO_PAGO', registrationId: 'reg-1', version: 'v1', movimientoId: 'mov-1', metodo: 'TRANSFER', importe: 3500, operacionId: '987', motivo: 'Pagó con otro medio' });
  expect(await screen.findByText('Se aplica al confirmar')).toBeInTheDocument();
  expect(screen.getByText('Después: transferencia verificada en Mercado Pago.')).toBeInTheDocument();
  // El efecto en la caja lo redacta el servidor (caja abierta o planilla del día): no se repite.
  expect(screen.queryByText(/Efectivo esperado:/)).not.toBeInTheDocument();
  const aplicar = screen.getByRole('button', { name: /Aplicar corrección/ });
  await waitFor(() => expect(aplicar).toBeEnabled());
  fireEvent.click(aplicar);
  await waitFor(() => expect(corregirAction).toHaveBeenCalledWith(expect.objectContaining({ solicitudId: enviado.solicitudId, operacionId: '987' })));
  await waitFor(() => expect(onListo).toHaveBeenCalled());
});

test('sin encontrar la transferencia queda para revisión y no manda una acreditación', async () => {
  jest.mocked(transferenciasParaCorreccionAction).mockResolvedValue({ data: { disponible: false, motivo: 'La cuenta de Mercado Pago no está conectada.', opciones: [] } });
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('PENDIENTE', ['Antes: efectivo.'], { motivoRevision: 'Sin una transferencia verificada en Mercado Pago la revisa administración.' }) });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: /Medio de pago/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Todo/ }));
  expect(await screen.findByText('La cuenta de Mercado Pago no está conectada.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^No la encuentro/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Pagó con otro medio' }));
  fireEvent.click(primario());
  expect(await screen.findByText('Queda para revisión')).toBeInTheDocument();
  expect(screen.getByText(/la revisa administración/)).toBeInTheDocument();
  expect(jest.mocked(previsualizarCorreccionAction).mock.calls[0][0]).not.toHaveProperty('operacionId');
  await waitFor(() => expect(screen.getByRole('button', { name: /Enviar a revisión/ })).toBeEnabled());
});

test('pago mixto: corrige una parte, nunca más que lo que queda del cobro', async () => {
  jest.mocked(transferenciasParaCorreccionAction).mockResolvedValue({ data: { disponible: true, motivo: null, opciones: [] } });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: /Medio de pago/ }));
  fireEvent.click(screen.getByRole('button', { name: /Una parte/ }));
  fireEvent.change(screen.getByLabelText('Importe por el otro medio'), { target: { value: '5000' } });
  expect(primario()).toHaveTextContent(/Como máximo \$\s?3\.500/);
  fireEvent.change(screen.getByLabelText('Importe por el otro medio'), { target: { value: '1500' } });
  await waitFor(() => expect(transferenciasParaCorreccionAction).toHaveBeenCalledWith('mov-1', 1500));
});

test('si la operación cambió mientras se corregía, la vuelve a cargar y pide revisar', async () => {
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('APLICADA', ['Antes: AB123CD.', 'Después: AB124CD.']) });
  jest.mocked(corregirAction).mockResolvedValue({ error: 'La operación cambió mientras la corregías (otro cobro, otra corrección). Revisala de nuevo.', code: 'OPERACION_CAMBIO' });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: /^Patente/ }));
  fireEvent.change(screen.getByLabelText('Patente correcta'), { target: { value: 'ab124cd' } });
  fireEvent.click(screen.getByRole('button', { name: 'Error de tipeo' }));
  fireEvent.click(primario());
  await confirmarResumen();
  expect(await screen.findByRole('alert')).toHaveTextContent('La operación cambió');
  expect(detalleOperacionAction).toHaveBeenCalledTimes(2);
  // Vuelve a los datos, con lo escrito.
  expect(screen.getByLabelText('Patente correcta')).toHaveValue('AB124CD');
});

test('sin respuesta al confirmar se puede reintentar con la misma solicitud', async () => {
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('APLICADA', ['Después: AB124CD.']) });
  jest.mocked(corregirAction)
    .mockResolvedValueOnce({ error: 'No se pudo confirmar si la corrección se guardó. Revisá la conexión e intentá de nuevo.' })
    .mockResolvedValueOnce({ data: guardada('APLICADA') });
  const onOpenChange = jest.fn();
  abrir({ onOpenChange });
  fireEvent.click(await screen.findByRole('button', { name: /^Patente/ }));
  fireEvent.change(screen.getByLabelText('Patente correcta'), { target: { value: 'AB124CD' } });
  fireEvent.click(screen.getByRole('button', { name: 'Error de tipeo' }));
  fireEvent.click(primario());
  await confirmarResumen();
  expect(await screen.findByRole('alert')).toHaveTextContent('Podés reintentar: no se guarda dos veces.');
  await confirmarResumen();
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  const [primero, segundo] = jest.mocked(corregirAction).mock.calls.map((c) => c[0].solicitudId);
  expect(segundo).toBe(primero);
});

test('vehículo equivocado: elige entre los que figuran adentro, sin el mismo', async () => {
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('APLICADA', ['La salida de las 12:00 pasa de AB123CD a AC999ZZ.']) });
  abrir({ adentro: [
    { id: 'reg-1', identificacion: 'AB123CD', entrada: '10:00' },
    { id: 'reg-2', identificacion: 'AC999ZZ', entrada: '11:30' },
    { id: 'reg-3', identificacion: 'AD555BB', entrada: '11:40' },
  ] });
  fireEvent.click(await screen.findByRole('button', { name: /Vehículo equivocado/ }));
  const lista = screen.getByRole('group', { name: '¿Qué vehículo se fue de verdad?' });
  expect(within(lista).queryByRole('button', { name: /AB123CD/ })).not.toBeInTheDocument();
  expect(primario()).toHaveTextContent('Elegí el vehículo que se fue');
  fireEvent.change(screen.getByLabelText('Buscar patente'), { target: { value: 'ac 999' } });
  expect(within(lista).queryByRole('button', { name: /AD555BB/ })).not.toBeInTheDocument();
  fireEvent.click(within(lista).getByRole('button', { name: /AC999ZZ/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegí otro de la lista' }));
  fireEvent.click(primario());
  await waitFor(() => expect(previsualizarCorreccionAction).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'VEHICULO', destinoRegistrationId: 'reg-2' })));
});

test('pase: lo que entregó se indica de nuevo, sin preelegir, y no acepta lo mismo que figura', async () => {
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: pase });
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('APLICADA', ['Después: entregó $ 20.000 · vuelto $ 12.000.']) });
  abrir({ operacion: { tipo: 'PASE', id: 'pase-1' } });
  fireEvent.click(await screen.findByRole('button', { name: /Recibido y vuelto/ }));
  expect(screen.getByText(/Figura: entregó/)).toHaveTextContent(/10\.000.*vuelto.*2\.000/);
  expect(primario()).toHaveTextContent('Tocá «Justo» o con cuánto paga');
  fireEvent.click(screen.getByRole('button', { name: '10.000' }));
  expect(primario()).toHaveTextContent('Es lo mismo que figura');
  fireEvent.click(screen.getByRole('button', { name: '20.000' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cargué mal lo que entregó' }));
  fireEvent.click(primario());
  await waitFor(() => expect(previsualizarCorreccionAction).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'RECIBIDO_VUELTO', paseId: 'pase-1', efectivoRecibido: 20000 })));
  expect(jest.mocked(previsualizarCorreccionAction).mock.calls[0][0]).not.toHaveProperty('registrationId');
});

test('otro error pide contar qué pasó y avisa que no cambia nada', async () => {
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('PENDIENTE', ['Queda para revisar: no cambia nada hasta que administración lo resuelva.']) });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: /Otro error/ }));
  expect(screen.getByText(/No cambia nada: queda en Avisos/)).toBeInTheDocument();
  expect(primario()).toHaveTextContent('Contá qué estuvo mal');
  fireEvent.change(screen.getByLabelText('¿Qué estuvo mal?'), { target: { value: 'Le cobré tarifa de camioneta a un auto' } });
  fireEvent.click(primario());
  await waitFor(() => expect(previsualizarCorreccionAction).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'OTRO', motivo: 'Otro error', detalle: 'Le cobré tarifa de camioneta a un auto' })));
});

test('si la corrección va a revisión no busca transferencias: las busca administración', async () => {
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: estadia({ pagos: [{ ...cobroEfectivo, directo: false, motivoRevision: 'La operación la registró otro operador: la revisa administración.' }] }) });
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: previa('PENDIENTE', ['Antes: efectivo.'], { motivoRevision: 'La operación la registró otro operador: la revisa administración.' }) });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: /Medio de pago/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Todo/ }));
  expect(screen.getByText(/Administración busca la transferencia en Mercado Pago/)).toHaveTextContent('La operación la registró otro operador');
  expect(screen.queryByRole('button', { name: /^No la encuentro/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pagó con otro medio' }));
  fireEvent.click(primario());
  expect(await screen.findByText('Queda para revisión')).toBeInTheDocument();
  expect(transferenciasParaCorreccionAction).not.toHaveBeenCalled();
  expect(jest.mocked(previsualizarCorreccionAction).mock.calls[0][0]).not.toHaveProperty('operacionId');
});

test('un cobro que pasó a otra estadía no se ofrece para corregir', async () => {
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: estadia({ salida: null, precio: null, pagos: [{ ...cobroEfectivo, movido: true }] }) });
  abrir();
  expect(await screen.findByRole('button', { name: /Medio de pago.*No tiene cobros/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Recibido y vuelto.*No tiene cobros en efectivo/ })).toBeDisabled();
});
