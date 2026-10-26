/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormasDePago } from './formas-de-pago';
import { pagarConQrAction, verificarQrAction } from '@/actions/suscripciones/suscripciones.action';
import type { ResumenCuenta } from '@/types/suscripcion.type';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('./formulario-tarjeta', () => ({ FormularioTarjeta: () => null }));
jest.mock('@/actions/suscripciones/suscripciones.action', () => ({
  activarDebitoAction: jest.fn(),
  desactivarDebitoAction: jest.fn(),
  pagarConMercadoPagoAction: jest.fn(),
  verificarPagosAction: jest.fn(),
  pagarConQrAction: jest.fn(),
  verificarQrAction: jest.fn(),
}));

// Una cuenta con un pago vencido: solo se puede pagar una vez (el débito espera).
const cuenta = { debito: null, pagadoHasta: '2026-09-30', periodo: { meses: 1, nombre: 'Mensual', descuento: 0 }, importePeriodo: 113, proximoVencimiento: '2026-10-18' } as unknown as ResumenCuenta;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('con la caja de la plataforma, «Pagar con QR» muestra el código y se actualiza solo al pagarse', async () => {
  jest.mocked(pagarConQrAction).mockResolvedValue({
    data: { ordenId: 'ORD1', qrData: '000201qr', importe: 113, desde: '2026-10-18', hasta: '2026-10-31', vence: new Date(Date.now() + 15 * 60_000).toISOString() },
  });
  jest.mocked(verificarQrAction)
    .mockResolvedValueOnce({ data: { pagada: false, vencida: false, acreditado: false } })
    .mockResolvedValueOnce({ data: { pagada: true, vencida: false, acreditado: true } });
  render(<FormasDePago cuenta={cuenta} importe={113} debe email="admin@playa.test" clavePublica={null} qr />);

  fireEvent.click(screen.getByRole('button', { name: /Pagar con QR/ }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /Mostrar QR/ })));
  expect(screen.getByTitle('Escaneá con cualquier banco o billetera')).toBeInTheDocument();
  expect(screen.getByText('Esperando el pago')).toBeInTheDocument();

  // La primera revisión todavía no lo ve pagado; la segunda sí.
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(screen.getByText('Esperando el pago')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(verificarQrAction).toHaveBeenLastCalledWith('ORD1');
  expect(screen.getByText('¡Listo! Recibimos tu pago')).toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});

test('sin la caja de la plataforma no se ofrece el QR', () => {
  render(<FormasDePago cuenta={cuenta} importe={113} debe email="admin@playa.test" clavePublica={null} qr={false} />);
  expect(screen.queryByRole('button', { name: /Pagar con QR/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Pagar una vez con MercadoPago/ })).toBeInTheDocument();
});
