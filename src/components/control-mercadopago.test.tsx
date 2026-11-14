/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ControlMercadoPagoHistorial, ControlMercadoPagoPanel } from './control-mercadopago';
import { getControlMercadoPagoAction } from '@/actions/turnos/control-mercadopago.action';
import { ControlMercadoPago, Turno } from '@/types/turno.type';

jest.mock('@/actions/turnos/control-mercadopago.action', () => ({ getControlMercadoPagoAction: jest.fn() }));

const base = { consultadoEl: '2026-11-13T18:10:05Z', desde: '2026-11-13T09:57:00Z', hasta: '2026-11-13T18:10:00Z' };
const ok = (mp: number, sistema: number, extra: Partial<Extract<ControlMercadoPago, { estado: 'OK' }>> = {}): ControlMercadoPago => ({
  ...base, estado: 'OK',
  mercadoPago: { total: mp, transferencias: mp - 35500, qr: 35500, otros: 0, cantidad: 40 },
  sistema: { total: sistema, alias: sistema - 35500, qr: 35500, transferencias: 0 },
  diferencia: mp - sistema, variasPlayas: false, ...extra,
});

test('entró más a Mercado Pago de lo registrado: lo explica como un pago cargado como efectivo', () => {
  render(<ControlMercadoPagoPanel control={ok(151000, 141000)} />);
  expect(screen.getByText(/De 06:57 a 15:10/)).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/Entraron \$\s?10\.000 más de lo registrado/);
  expect(screen.getByRole('status')).toHaveTextContent(/cargó como efectivo/);
});

test('se registró más de lo que entró, y con varias playas lo advierte', () => {
  render(<ControlMercadoPagoPanel control={ok(131000, 141000, { variasPlayas: true })} />);
  expect(screen.getByRole('status')).toHaveTextContent(/Se registraron \$\s?10\.000 más de lo que entró/);
  expect(screen.getByText(/incluye los cobros de las otras playas/)).toBeInTheDocument();
});

test('si coincide lo dice y no muestra aviso', () => {
  render(<ControlMercadoPagoPanel control={ok(141000, 141000)} />);
  expect(screen.getByText('Coincide')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

const turno = (extra: Partial<Turno> = {}) => ({ id: 't1', estado: 'CERRADO', fechaApertura: '2026-11-12T18:05:00Z', fechaCierre: '2026-11-13T00:05:00Z', controlMercadoPago: null, ...extra }) as Turno;

test('si la consulta del cierre falló, el historial la puede volver a pedir', async () => {
  jest.mocked(getControlMercadoPagoAction).mockResolvedValue({ control: ok(141000, 141000) });
  render(<ControlMercadoPagoHistorial disponible={false} turno={turno({ controlMercadoPago: { ...base, estado: 'ERROR', message: 'No se pudo consultar Mercado Pago (respondió 500).' } })} />);
  expect(screen.getByText(/respondió 500/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Consultar de nuevo' }));
  await waitFor(() => expect(screen.getByText('Coincide')).toBeInTheDocument());
  expect(getControlMercadoPagoAction).toHaveBeenCalledWith('t1');
});

test('un turno viejo sin control se consulta con su horario y después se ve lo guardado', async () => {
  jest.mocked(getControlMercadoPagoAction).mockResolvedValue({ control: ok(151000, 141000) });
  render(<ControlMercadoPagoHistorial disponible turno={turno()} />);
  // El horario del turno de Brian de ayer: 15:05 a 21:05 del 12/11.
  expect(screen.getByText(/de 15:05 a 21:05 del 12\/11/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Consultar Mercado Pago' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Entraron \$\s?10\.000 más/));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('sin Mercado Pago disponible no ofrece nada en los turnos sin control; si falla lo explica', async () => {
  const { container, unmount } = render(<ControlMercadoPagoHistorial disponible={false} turno={turno()} />);
  expect(container).toBeEmptyDOMElement();
  unmount();
  jest.mocked(getControlMercadoPagoAction).mockResolvedValue({ error: 'Solo un administrador puede consultar Mercado Pago para un turno cerrado.' });
  render(<ControlMercadoPagoHistorial disponible turno={turno()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar Mercado Pago' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Solo un administrador'));
});

test('un turno abierto no muestra el control del historial', () => {
  const { container } = render(<ControlMercadoPagoHistorial disponible turno={turno({ estado: 'ABIERTO', fechaCierre: null })} />);
  expect(container).toBeEmptyDOMElement();
});
