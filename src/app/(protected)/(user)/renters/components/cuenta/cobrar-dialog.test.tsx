/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CobrarDialog } from './cobrar-dialog';
import { getCuentaMostradorAction, registrarPagoAction } from '@/actions/cuentas/cuentas.action';
import * as alias from '@/actions/mercadopago/verificacion-alias.action';
import * as mp from '@/actions/mercadopago/mercadopago.action';
import { CobroAlias } from '@/types/verificacion-alias.type';
import { ResultadoPago } from '@/types/cuenta.type';

jest.mock('@/components/tenant-provider', () => ({ useTenant: () => ({ context: { playas: [{ id: 'playa', nombre: 'Playa' }] }, playaId: 'playa' }) }));
jest.mock('@/actions/cuentas/cuentas.action', () => ({ getCuentaMostradorAction: jest.fn(), registrarPagoAction: jest.fn() }));
jest.mock('@/actions/mercadopago/verificacion-alias.action', () => ({ disponibilidadAliasAction: jest.fn(), cobroAliasDeEstadiaAction: jest.fn(), iniciarCobroAliasAction: jest.fn(), cancelarCobroAliasAction: jest.fn(), consultarCobroAliasAction: jest.fn(), ampliarCobroAliasAction: jest.fn(), asignarTransferenciaAliasAction: jest.fn() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ crearCobroMercadoPagoAction: jest.fn(), consultarCobroMercadoPagoAction: jest.fn(), cancelarCobroMercadoPagoAction: jest.fn() }));
jest.mock('./entrega-recibo', () => ({ EntregaRecibo: () => <div>Entregar recibo</div> }));
jest.mock('@/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const now = new Date().toISOString();
const recibo: ResultadoPago = { id: 'pago', numero: '00000001', fecha: now, cliente: 'Ana', total: 1000, medios: [{ metodo: 'TRANSFER', importe: 1000 }], imputaciones: [], aFavor: 0, saldoAnterior: 1000, saldo: 0, nota: null };
const intento: CobroAlias = { id: 'alias-1', registrationId: 'cliente', tipo: 'INQUILINO', estado: 'ESPERANDO', importe: 1000, moneda: 'ARS', alias: 'playa.fixture', creadoEl: now, buscarDesde: now, ventanaMinutos: 5, puedeAmpliar: false, venceEl: new Date(Date.now() + 900000).toISOString(), cerradoEl: null, modo: null, salidaRegistrada: false, saldoPendiente: null, transferencia: null, consulta: { ok: true, consultadoEl: now }, motivoRevision: null, opciones: [] };
const qr = { id: 'qr-1', estado: 'PENDIENTE' as const, monto: 1000, initPoint: '', qr: '000201010212fixture', interoperable: true, expiraEl: intento.venceEl, acreditadoEl: null };
const abrir = () => {
  const onCobrado = jest.fn(), onOpenChange = jest.fn();
  render(<CobrarDialog customerId="cliente" nombre="Ana" open onOpenChange={onOpenChange} onCobrado={onCobrado} />);
  return { onCobrado, onOpenChange };
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCuentaMostradorAction).mockResolvedValue({ data: { cliente: { id: 'cliente', nombre: 'Ana', apellido: 'Perez', baja: null, abono: 1000, cocheras: [] }, saldo: 1000, vencido: 0, deudas: [{ id: 'cargo', numero: '1', concepto: 'Octubre', tipoCargo: 'ABONO', periodo: '2026-10', fecha: '2026-10-01', vencimiento: '2026-10-10', vencido: false, total: 1000, pagado: 0, bonificado: 0, aFavorAplicado: 0, saldo: 1000, estado: 'PENDING', situacion: 'PENDIENTE' }], pagos: [] } });
  jest.mocked(alias.disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: true, qrDisponible: true, alias: 'playa.fixture' } });
  jest.mocked(alias.cobroAliasDeEstadiaAction).mockResolvedValue({ datos: null });
  jest.mocked(alias.iniciarCobroAliasAction).mockResolvedValue({ datos: intento });
  jest.mocked(mp.crearCobroMercadoPagoAction).mockResolvedValue({ cobro: qr });
});

test('sin MP sólo ofrece efectivo, transferencia y su combinación explícita', async () => {
  jest.mocked(alias.disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: false, qrDisponible: false, code: 'DESCONECTADO', motivo: '' } });
  abrir();
  await screen.findByRole('radio', { name: 'Efectivo + transferencia' });
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.queryByRole('radio', { name: /QR|alias/ })).not.toBeInTheDocument();
});
test('QR disponible aunque la verificación por alias no esté activada', async () => {
  jest.mocked(alias.disponibilidadAliasAction).mockResolvedValue({ datos: { disponible: false, qrDisponible: true, code: 'INACTIVA', motivo: '' } });
  abrir();
  expect(await screen.findByRole('radio', { name: 'QR / celular' })).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Al alias de MP' })).not.toBeInTheDocument();
});
test('mixto registra exclusivamente efectivo y transferencia', async () => {
  jest.mocked(registrarPagoAction).mockResolvedValue({ data: recibo });
  abrir();
  fireEvent.click(await screen.findByRole('radio', { name: 'Efectivo + transferencia' }));
  fireEvent.change(screen.getByLabelText('Importe en efectivo'), { target: { value: '400' } });
  fireEvent.click(screen.getByRole('button', { name: /Cobrar \$/ }));
  await waitFor(() => expect(registrarPagoAction).toHaveBeenCalledWith('cliente', expect.objectContaining({ pagos: [{ metodo: 'CASH', importe: 400 }, { metodo: 'TRANSFER', importe: 600 }], receiptIds: ['cargo'] })));
  expect(mp.crearCobroMercadoPagoAction).not.toHaveBeenCalled();
  expect(alias.iniciarCobroAliasAction).not.toHaveBeenCalled();
});
test('QR usa el flujo compartido, conserva el pie y no cambia de medio si falla cancelar', async () => {
  const { onOpenChange, onCobrado } = abrir();
  fireEvent.click(await screen.findByRole('radio', { name: 'QR / celular' }));
  fireEvent.click(screen.getByRole('button', { name: 'Generar QR' }));
  const cancelar = await screen.findByRole('button', { name: 'Cancelar QR y cobrar de otra forma' });
  expect(mp.crearCobroMercadoPagoAction).toHaveBeenCalledWith('cliente', 'INQUILINO', { monto: 1000, receiptIds: ['cargo'], nota: undefined });
  jest.mocked(mp.cancelarCobroMercadoPagoAction).mockResolvedValueOnce({ error: 'Falló cancelar' });
  fireEvent.click(cancelar);
  await waitFor(() => expect(cancelar).not.toBeDisabled());
  expect(screen.queryByRole('radio', { name: 'Efectivo' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(onOpenChange).not.toHaveBeenCalled();
  // Si el pago se acreditó mientras cancelaba, entrega el recibo sin cobrar otra vez.
  jest.mocked(mp.cancelarCobroMercadoPagoAction).mockResolvedValueOnce({ cobro: { ...qr, estado: 'ACREDITADO', recibo } });
  fireEvent.click(cancelar);
  expect(await screen.findByText('Entregar recibo')).toBeInTheDocument();
  expect(onCobrado).toHaveBeenCalledTimes(1);
  expect(registrarPagoAction).not.toHaveBeenCalled();
});
test('alias muestra CUIT ante duplicados y confirma el recibo en el pie del diálogo', async () => {
  jest.mocked(alias.iniciarCobroAliasAction).mockResolvedValue({ datos: { ...intento, estado: 'REVISION', motivoRevision: 'VARIAS_TRANSFERENCIAS', opciones: ['20111111112', '20222222223'].map((documento, i) => ({ operacionId: String(i + 1), importe: 1000, moneda: 'ARS', fechaOperacion: now, detectadaEl: now, nombre: null, entidad: null, documento: `CUIT ${documento}` })) } });
  jest.mocked(alias.asignarTransferenciaAliasAction).mockResolvedValue({ datos: { ...intento, estado: 'CONFIRMADO', recibo } });
  const { onCobrado } = abrir();
  fireEvent.click(await screen.findByRole('radio', { name: 'Al alias de MP' }));
  fireEvent.click(screen.getByRole('button', { name: 'Esperar transferencia' }));
  fireEvent.click(await screen.findByRole('radio', { name: /20111111112/ }));
  expect(screen.getByRole('button', { name: 'Cancelar y cobrar de otra forma' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Confirmar pago CUIT 20111111112$/ }));
  expect(await screen.findByText('Entregar recibo')).toBeInTheDocument();
  expect(alias.iniciarCobroAliasAction).toHaveBeenCalledWith('cliente', 'INQUILINO', { monto: 1000, receiptIds: ['cargo'], nota: undefined });
  expect(alias.asignarTransferenciaAliasAction).toHaveBeenCalledWith('alias-1', '1');
  expect(onCobrado).toHaveBeenCalledTimes(1);
  expect(registrarPagoAction).not.toHaveBeenCalled();
});
test('recupera un alias pendiente y conserva la espera si cancelar falla', async () => {
  jest.mocked(alias.cobroAliasDeEstadiaAction).mockResolvedValue({ datos: intento });
  jest.mocked(alias.cancelarCobroAliasAction).mockResolvedValue({ error: 'Falló cancelar' });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar y cobrar de otra forma' }));
  await waitFor(() => expect(alias.cancelarCobroAliasAction).toHaveBeenCalledWith('alias-1'));
  expect(screen.queryByRole('radio', { name: 'Efectivo' })).not.toBeInTheDocument();
  expect(alias.cobroAliasDeEstadiaAction).toHaveBeenCalledWith('cliente', 'INQUILINO');
});
