/** @jest-environment jsdom */
import { configure, act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UltimoCobroFranja } from './ultimo-cobro';
import { publicarUltimoCobro } from '@/lib/ultimo-cobro';
import { corregirAction, detalleOperacionAction, previsualizarCorreccionAction } from '@/actions/operaciones/operaciones.action';
import type { Correccion, DetalleEstadia } from '@/types/operaciones.type';

// useTenant vive junto a la acción de contexto (next-auth): se simula la playa.
const mockTenant = { playaId: 'playa-1' };
jest.mock('@/components/tenant-provider', () => ({ useTenant: () => mockTenant }));
jest.mock('@/actions/operaciones/operaciones.action', () => ({
  detalleOperacionAction: jest.fn(), previsualizarCorreccionAction: jest.fn(), corregirAction: jest.fn(), transferenciasParaCorreccionAction: jest.fn(),
}));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Con la suite completa corriendo en paralelo, cargar y revisar la operación puede tardar más de 1 s.
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(15000);

const cobro = { tipo: 'ESTADIA' as const, registroId: 'reg', identificacion: 'AB123CD', total: 3500, efectivo: 3500, medio: 'en efectivo', recibido: 10000, vuelto: 6500 };

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockTenant.playaId = 'playa-1';
});

test('sin un cobro confirmado no muestra nada', () => {
  const { container } = render(<UltimoCobroFranja />);
  expect(container).toBeEmptyDOMElement();
});

test('muestra patente, importe y medio, lo que entregó y el vuelto, y no la muestra en otra playa', () => {
  const vista = render(<UltimoCobroFranja />);
  act(() => publicarUltimoCobro(cobro));
  const franja = screen.getByRole('region', { name: 'Último cobro en efectivo' });
  expect(franja).toHaveTextContent('AB123CD');
  expect(franja).toHaveTextContent(/3\.500 en efectivo/);
  expect(franja).toHaveTextContent(/Entregó \$\s?10\.000/);
  expect(franja).toHaveTextContent(/Vuelto\$\s?6\.500/);
  expect(franja).toHaveTextContent('lo que se indicó al cobrar');
  vista.unmount();
  mockTenant.playaId = 'playa-2';
  const { container } = render(<UltimoCobroFranja />);
  expect(container).toBeEmptyDOMElement();
});

test('pago mixto: dice cuánto entregó por la parte en efectivo', () => {
  render(<UltimoCobroFranja />);
  act(() => publicarUltimoCobro({ ...cobro, total: 5000, efectivo: 2000, medio: 'efectivo + transferencia', recibido: 5000, vuelto: 3000 }));
  expect(screen.getByRole('region', { name: 'Último cobro en efectivo' })).toHaveTextContent(/Entregó \$\s?5\.000 por \$\s?2\.000 en efectivo/);
});

// Dos cobros de la misma estadía: desde la franja viene elegido el último (el que se está mirando).
const detalle = {
  tipo: 'ESTADIA', id: 'reg', identificacion: 'AB123CD', patente: 'AB123CD', vehicleType: 'AUTO', entrada: '2026-11-20T12:00:00.000Z', salida: '2026-11-20T15:00:00.000Z',
  entryOperatorName: 'Ana', exitOperatorName: 'Ana', exitTurnoId: 't1', precio: 5500, cobrado: 5500, medios: { CASH: 5500 }, ajustes: [], correcciones: [], version: 'v1',
  permiso: { directo: true, motivoRevision: null }, comprobantes: { entrada: true, salida: true },
  pagos: [
    { id: 'anticipo', tipo: 'ANTICIPO', metodo: 'CASH', monto: 2000, fecha: '2026-11-20T12:05:00.000Z', operador: 'Ana', turnoId: 't1', efectivoRecibido: 2000, vuelto: 0, recibidoCorregido: false, corregido: 0, confirmadoPorMp: false, directo: true, motivoRevision: null },
    { id: 'saldo', tipo: 'SALDO', metodo: 'CASH', monto: 3500, fecha: '2026-11-20T15:00:00.000Z', operador: 'Ana', turnoId: 't1', efectivoRecibido: 10000, vuelto: 6500, recibidoCorregido: false, corregido: 0, confirmadoPorMp: false, directo: true, motivoRevision: null },
  ],
} as DetalleEstadia;

test('corregir desde la franja: el último cobro viene elegido y la franja muestra lo vigente', async () => {
  jest.mocked(detalleOperacionAction).mockResolvedValue({ data: detalle });
  jest.mocked(previsualizarCorreccionAction).mockResolvedValue({ data: { estado: 'APLICADA', efecto: { lineas: ['Después: entregó $ 20.000 · vuelto $ 16.500.'] }, antes: {}, despues: {}, motivoRevision: null } });
  jest.mocked(corregirAction).mockResolvedValue({ data: { id: 'c1', tipo: 'RECIBIDO_VUELTO', estado: 'APLICADA', antes: { efectivoRecibido: 10000, vuelto: 6500 }, despues: { efectivoRecibido: 20000, vuelto: 16500 } } as unknown as Correccion });
  render(<UltimoCobroFranja />);
  act(() => publicarUltimoCobro(cobro));
  fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
  await waitFor(() => expect(detalleOperacionAction).toHaveBeenCalledWith('ESTADIA', 'reg'));
  fireEvent.click(await screen.findByRole('button', { name: /Recibido y vuelto/ }));
  expect(screen.getByRole('button', { name: /Cobro de la salida/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /Anticipo/ })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
  fireEvent.change(screen.getByLabelText('Importe que entrega'), { target: { value: '20000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cargué mal lo que entregó' }));
  fireEvent.click(screen.getByRole('button', { name: /Revisar corrección/ }));
  const aplicar = await screen.findByRole('button', { name: /Aplicar corrección/ });
  await waitFor(() => expect(aplicar).toBeEnabled());
  fireEvent.click(aplicar);
  await waitFor(() => expect(corregirAction).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'RECIBIDO_VUELTO', registrationId: 'reg', movimientoId: 'saldo', efectivoRecibido: 20000 })));
  const franja = screen.getByRole('region', { name: 'Último cobro en efectivo' });
  await waitFor(() => expect(franja).toHaveTextContent(/Vuelto\$\s?16\.500/));
  expect(franja).toHaveTextContent('Corregido: muestra lo vigente.');
});
