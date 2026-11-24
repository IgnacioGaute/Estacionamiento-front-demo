/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getCobrosEfectivoAction } from '@/actions/turnos/cobros-efectivo.action';
import type { CobroEfectivo, CobrosEfectivoTurno, Turno } from '@/types/turno.type';
import { CobrosEfectivoHistorial } from './cobros-efectivo-historial';

jest.mock('@/actions/turnos/cobros-efectivo.action', () => ({ getCobrosEfectivoAction: jest.fn() }));

const cobros: CobroEfectivo[] = [
  { id: 'm1', fecha: '2026-11-19T13:05:00.000Z', concepto: 'ANTICIPO', identificacion: 'AB123CD', importe: 3000, sinDetalle: false },
  { id: 'm2', fecha: '2026-11-19T14:10:00.000Z', concepto: 'DEVOLUCION', identificacion: 'AB123CD', importe: -1000, sinDetalle: false },
  { id: 'm3', fecha: '2026-11-19T15:00:00.000Z', concepto: 'SALDO', identificacion: 'Ticket 0042', importe: 2500, sinDetalle: false },
  { id: 'k1', fecha: '2026-11-19T16:00:00.000Z', concepto: 'PAGO_INQUILINO', identificacion: 'Pérez Juan', importe: 45000, sinDetalle: false },
  { id: 'd1', fecha: '2026-11-19T17:00:00.000Z', concepto: 'ESTADIA_PERIODO', identificacion: null, importe: 2000, sinDetalle: false, periodo: 'día' },
  { id: 'c1', fecha: '2026-11-19T18:00:00.000Z', concepto: 'COBRO', identificacion: null, importe: 1500, sinDetalle: true },
];
const detalle: CobrosEfectivoTurno = { cobros, cantidad: 6, ingresos: 54000, egresos: 1000, total: 53000, sinDetalle: 1 };
const resumen = { efectivoCobrado: 54000, devolucionesEfectivo: 1000, gastosEfectivo: 700, ingresosVarios: 0 } as Turno['resumen'];
const abrir = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ver cobros en efectivo' }));
  return screen.findByRole('region', { name: 'Cobros en efectivo del turno' });
};
const filas = (seccion: HTMLElement) => within(seccion).getAllByRole('row').slice(1).map((f) => within(f).getAllByRole('cell').map((c) => c.textContent));

beforeEach(() => jest.mocked(getCobrosEfectivoAction).mockReset());

test('se pide al tocar y muestra el total, el resumen por concepto y una fila por cobro con su signo', async () => {
  jest.mocked(getCobrosEfectivoAction).mockResolvedValue(detalle);
  render(<CobrosEfectivoHistorial turnoId="t1" resumen={resumen} />);
  expect(getCobrosEfectivoAction).not.toHaveBeenCalled();
  const seccion = await abrir();
  expect(getCobrosEfectivoAction).toHaveBeenCalledWith('t1');
  // Cobros, no vehículos: AB123CD tiene dos filas.
  expect(seccion).toHaveTextContent(/\$\s?53\.000en 6 cobros · cobrado .*54\.000, devuelto .*1\.000/);
  const conceptos = within(within(seccion).getByRole('list', { name: 'Por concepto' })).getAllByRole('listitem').map((l) => l.textContent);
  expect(conceptos).toEqual(expect.arrayContaining([expect.stringMatching(/^1 pago de inquilino/), expect.stringMatching(/^1 devolución\s*− /), expect.stringMatching(/^1 sin detalle/)]));
  expect(filas(seccion)).toEqual([
    ['10:05', 'AB123CD', 'AnticipoAnticipo', expect.stringMatching(/3\.000/)],
    ['11:10', 'AB123CD', 'DevoluciónDevolución', expect.stringMatching(/^− .*1\.000/)],
    ['12:00', 'Ticket 0042', 'SaldoSaldo al salir', expect.stringMatching(/2\.500/)],
    ['13:00', 'Pérez Juan', 'InquilinoPago de inquilino', expect.stringMatching(/45\.000/)],
    // Sin patente: el concepto, sin inventar una.
    ['14:00', '—', 'PeríodoEstadía por día', expect.stringMatching(/2\.000/)],
    ['15:00', 'Sin detalle', 'EfectivoCobro en efectivo', expect.stringMatching(/1\.500/)],
  ]);
  expect(seccion).toHaveTextContent('Coincide con el resumen del turno');
  expect(seccion).toHaveTextContent(/No incluye transferencias.*Varios \(el resumen los muestra aparte\)/);
  expect(seccion).toHaveTextContent(/«Sin detalle»: entró a la caja sin que se pueda saber de qué operación/);
});

test('con muchos cobros, el buscador filtra por patente; ocultar y volver a ver no vuelve a pedir', async () => {
  const muchos = Array.from({ length: 12 }, (_, i) => ({ ...cobros[2], id: 'x' + i, identificacion: i === 7 ? 'AH668EA' : 'AA' + i, fecha: `2026-11-19T1${i % 10}:00:00.000Z` }));
  jest.mocked(getCobrosEfectivoAction).mockResolvedValue({ ...detalle, cobros: muchos, cantidad: 12, egresos: 0, sinDetalle: 0 });
  render(<CobrosEfectivoHistorial turnoId="t1" />);
  const seccion = await abrir();
  expect(seccion).toHaveTextContent('12 cobros');
  fireEvent.change(within(seccion).getByPlaceholderText('Buscar patente'), { target: { value: 'ah 668' } });
  expect(filas(seccion).map((f) => f[1])).toEqual(['AH668EA']);
  expect(seccion).toHaveTextContent('1 de 12');
  fireEvent.change(within(seccion).getByPlaceholderText('Buscar patente'), { target: { value: 'ZZZ' } });
  expect(seccion).toHaveTextContent('Ningún cobro coincide con «ZZZ».');
  fireEvent.click(within(seccion).getByRole('button', { name: 'Ocultar' }));
  expect(screen.queryByRole('region', { name: 'Cobros en efectivo del turno' })).toBeNull();
  await abrir();
  expect(getCobrosEfectivoAction).toHaveBeenCalledTimes(1);
});

test('si falla se puede reintentar; sin cobros lo dice', async () => {
  jest.mocked(getCobrosEfectivoAction).mockResolvedValueOnce(null).mockResolvedValueOnce({ cobros: [], cantidad: 0, ingresos: 0, egresos: 0, total: 0, sinDetalle: 0 });
  render(<CobrosEfectivoHistorial turnoId="t1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver cobros en efectivo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron traer los cobros en efectivo');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Este turno no registró cobros ni devoluciones en efectivo.')).toBeInTheDocument();
  expect(getCobrosEfectivoAction).toHaveBeenCalledTimes(2);
});

test('si el total no coincide con el resumen, lo advierte con los dos importes', async () => {
  jest.mocked(getCobrosEfectivoAction).mockResolvedValue(detalle);
  render(<CobrosEfectivoHistorial turnoId="t1" resumen={{ ...resumen!, efectivoCobrado: 60000 }} />);
  const seccion = await abrir();
  expect(seccion).toHaveTextContent(/El resumen del turno da .*59\.000.*este detalle .*53\.000/);
  expect(seccion).not.toHaveTextContent('Coincide con el resumen');
});

test('muestra lo declarado al cobrar (entregó y vuelto) y los cobros anteriores quedan sin ese dato', async () => {
  jest.mocked(getCobrosEfectivoAction).mockResolvedValue({
    cobros: [
      { id: 'n1', fecha: '2026-11-19T13:05:00.000Z', concepto: 'SALDO', identificacion: 'AB123CD', importe: 3500, sinDetalle: false, recibido: 10000, vuelto: 6500 },
      { id: 'n2', fecha: '2026-11-19T13:10:00.000Z', concepto: 'SALDO', identificacion: 'CD456EF', importe: 2000, sinDetalle: false, recibido: 2000, vuelto: 0 },
      { id: 'v1', fecha: '2026-11-19T13:20:00.000Z', concepto: 'SALDO', identificacion: 'GH789IJ', importe: 1000, sinDetalle: false, recibido: null, vuelto: null },
    ],
    cantidad: 3, ingresos: 6500, egresos: 0, total: 6500, sinDetalle: 0,
  });
  render(<CobrosEfectivoHistorial turnoId="t1" />);
  const seccion = await abrir();
  const [conVuelto, justo, anterior] = filas(seccion);
  expect(conVuelto[3]).toMatch(/3\.500.*entregó .*10\.000 · vuelto .*6\.500/);
  expect(justo[3]).toMatch(/entregó .*2\.000 · justo/);
  expect(anterior[3]).not.toMatch(/entregó/);
  // El total sigue siendo lo que entró a la caja, y se aclara que es lo declarado.
  expect(seccion).toHaveTextContent(/\$\s?6\.500en 3 cobros/);
  expect(seccion).toHaveTextContent('lo que el operador indicó al cobrar');
});
