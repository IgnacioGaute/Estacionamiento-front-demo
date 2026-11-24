/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DepartureHistory } from './departure-history';
import { receiptHistoryAction, type FilaComprobante } from '@/actions/tickets/receipt-history.action';

jest.mock('@/actions/tickets/receipt-history.action', () => ({ receiptHistoryAction: jest.fn() }));
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(15000);

const fila = (extra: Partial<FilaComprobante>): FilaComprobante => ({
  id: 'r1', identification: 'AB123CD', patente: 'AB123CD', type: 'Por hora', vehicleType: 'AUTO', departed: true, time: '18:42:00',
  entryTime: '16:32', exitTime: '18:42', entryOperatorName: 'Ana Paz', exitOperatorName: 'Beto Díaz', ...extra,
});
const ultima = () => jest.mocked(receiptHistoryAction).mock.calls.at(-1)!;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(receiptHistoryAction).mockResolvedValue({
    data: [fila({}), fila({ id: 'r2', identification: 'AE012KL', patente: 'AE012KL', departed: false, time: '18:05:00', entryTime: '18:05', exitTime: null, exitOperatorName: null })],
    meta: { totalItems: 14 }, conteo: { todas: 14, adentro: 6, salieron: 8 },
  });
});

const montar = (onReceipt = jest.fn()) => {
  render(<DepartureHistory today="2026-11-24" registrations={[]} dailyRegistrations={[]} onReceipt={onReceipt} />);
  return onReceipt;
};

test('cada estadía muestra la chapa, cuándo entró y salió y sus comprobantes', async () => {
  const onReceipt = montar();
  const salio = await screen.findByRole('button', { name: 'Abrir comprobante de salida de AB123CD' });
  const tarjeta = salio.closest('li')!;
  expect(tarjeta).toHaveTextContent('Salió');
  expect(tarjeta).toHaveTextContent('Entró 16:32 · Ana Paz');
  expect(tarjeta).toHaveTextContent('Salió 18:42 · Beto Díaz');
  fireEvent.click(salio);
  expect(onReceipt).toHaveBeenCalledWith('r1', 'EXIT');
  // La que sigue en la playa solo tiene el de entrada.
  const adentro = screen.getByRole('button', { name: 'Abrir comprobante de entrada de AE012KL' }).closest('li')!;
  expect(adentro).toHaveTextContent('En la playa');
  expect(within(adentro).queryByRole('button', { name: /de salida/ })).not.toBeInTheDocument();
});

test('día, estado (con sus cantidades) y búsqueda viajan al servidor, y «Ver más» trae la página siguiente', async () => {
  montar();
  await waitFor(() => expect(receiptHistoryAction).toHaveBeenCalledWith('2026-11-24', '', 1, undefined));
  const estado = screen.getByRole('group', { name: 'Estado' });
  expect(within(estado).getByRole('button', { name: /^En la playa/ })).toHaveTextContent('6');
  expect(within(estado).getByRole('button', { name: /^Salieron/ })).toHaveTextContent('8');
  fireEvent.click(within(estado).getByRole('button', { name: /^En la playa/ }));
  await waitFor(() => expect(ultima()).toEqual(['2026-11-24', '', 1, 'ADENTRO']));
  fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));
  fireEvent.change(screen.getByLabelText('Buscar comprobantes'), { target: { value: 'ab1' } });
  await waitFor(() => expect(ultima()).toEqual(['2026-11-23', 'ab1', 1, 'ADENTRO']));
  fireEvent.click(await screen.findByRole('button', { name: 'Ver 12 más' }));
  await waitFor(() => expect(ultima()).toEqual(['2026-11-23', 'ab1', 2, 'ADENTRO']));
});

test('sin comprobantes con la búsqueda, ofrece quitar los filtros', async () => {
  jest.mocked(receiptHistoryAction).mockResolvedValue({ data: [], meta: { totalItems: 0 }, conteo: { todas: 0, adentro: 0, salieron: 0 } });
  montar();
  fireEvent.change(screen.getByLabelText('Buscar comprobantes'), { target: { value: 'zz' } });
  expect(await screen.findByRole('heading', { name: 'No hay comprobantes con esta búsqueda' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
  await waitFor(() => expect(ultima()).toEqual(['2026-11-24', '', 1, undefined]));
});
