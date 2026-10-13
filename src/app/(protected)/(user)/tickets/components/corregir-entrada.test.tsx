/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import type { CloseSummary } from '@/services/tickets.service';
import { CorregirEntrada, entradaDesdeHora } from './corregir-entrada';

jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

const resumen = (elapsedMinutes: number) => ({ registration: { id: 'estadia' }, elapsedMinutes }) as unknown as CloseSummary;

beforeEach(() => jest.clearAllMocks());

test('pregunta solo cuando la estadía tiene menos de 5 minutos', () => {
  const { rerender } = render(<CorregirEntrada summary={resumen(1)} onCorregido={jest.fn()} />);
  expect(screen.getByText(/Entró hace 1 min/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '¿Entró antes?' })).toBeInTheDocument();
  rerender(<CorregirEntrada summary={resumen(5)} onCorregido={jest.fn()} />);
  expect(screen.queryByRole('button', { name: '¿Entró antes?' })).not.toBeInTheDocument();
});

test('con la hora real recalcula y entrega el resumen nuevo', async () => {
  const nuevo = resumen(120);
  jest.mocked(corregirEntradaAction).mockResolvedValue({ summary: nuevo });
  const onCorregido = jest.fn();
  render(<CorregirEntrada summary={resumen(0)} onCorregido={onCorregido} />);
  fireEvent.click(screen.getByRole('button', { name: '¿Entró antes?' }));
  const hora = dayjs().tz(TZ).subtract(2, 'hour').format('HH:mm');
  fireEvent.change(screen.getByLabelText(/Desde qué hora está/i), { target: { value: hora } });
  fireEvent.click(screen.getByRole('button', { name: 'Recalcular' }));
  await waitFor(() => expect(onCorregido).toHaveBeenCalledWith(nuevo));
  const [id, entrada] = jest.mocked(corregirEntradaAction).mock.calls[0];
  expect(id).toBe('estadia');
  expect(dayjs(entrada).tz(TZ).format('HH:mm')).toBe(hora);
});

test('un error se muestra sin romper el panel', async () => {
  jest.mocked(corregirEntradaAction).mockRejectedValue(new TypeError('Failed to fetch'));
  render(<CorregirEntrada summary={resumen(0)} onCorregido={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '¿Entró antes?' }));
  fireEvent.change(screen.getByLabelText(/Desde qué hora está/i), { target: { value: '08:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Recalcular' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Revisá la conexión');
});

test('una hora que todavía no llegó es de ayer (pasada la medianoche)', () => {
  const ahora = dayjs.tz('2026-10-13 00:20', 'YYYY-MM-DD HH:mm', TZ);
  expect(dayjs(entradaDesdeHora('23:30', ahora)).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-10-12 23:30');
  expect(dayjs(entradaDesdeHora('00:05', ahora)).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-10-13 00:05');
  expect(entradaDesdeHora('', ahora)).toBeNull();
});

test('los atajos completan la hora sin abrir el reloj del teléfono', async () => {
  jest.mocked(corregirEntradaAction).mockResolvedValue({ summary: resumen(120) });
  render(<CorregirEntrada summary={resumen(0)} onCorregido={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '¿Entró antes?' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hace 2 h' }));
  const esperada = dayjs().tz(TZ).subtract(2, 'hour').format('HH:mm');
  expect(screen.getByLabelText(/Desde qué hora está/i)).toHaveValue(esperada);
  fireEvent.click(screen.getByRole('button', { name: 'Recalcular' }));
  await waitFor(() => expect(corregirEntradaAction).toHaveBeenCalled());
  expect(dayjs(jest.mocked(corregirEntradaAction).mock.calls[0][1]).tz(TZ).format('HH:mm')).toBe(esperada);
});
