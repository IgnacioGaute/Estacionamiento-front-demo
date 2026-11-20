/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getCobrosEfectivoAction } from '@/actions/turnos/cobros-efectivo.action';
import type { CobrosEfectivoTurno, Turno } from '@/types/turno.type';
import { CobrosEfectivoHistorial } from './cobros-efectivo-historial';

jest.mock('@/actions/turnos/cobros-efectivo.action', () => ({ getCobrosEfectivoAction: jest.fn() }));

const detalle: CobrosEfectivoTurno = {
  cobros: [
    { id: 'm1', fecha: '2026-11-19T13:05:00.000Z', concepto: 'ANTICIPO', identificacion: 'AB123CD', importe: 3000, sinDetalle: false },
    { id: 'm2', fecha: '2026-11-19T14:10:00.000Z', concepto: 'DEVOLUCION', identificacion: 'AB123CD', importe: -1000, sinDetalle: false },
    { id: 'm3', fecha: '2026-11-19T15:00:00.000Z', concepto: 'SALDO', identificacion: 'Ticket 0042', importe: 2500, sinDetalle: false },
    { id: 'k1', fecha: '2026-11-19T16:00:00.000Z', concepto: 'PAGO_INQUILINO', identificacion: 'Pérez Juan', importe: 45000, sinDetalle: false },
    { id: 'd1', fecha: '2026-11-19T17:00:00.000Z', concepto: 'ESTADIA_PERIODO', identificacion: null, importe: 2000, sinDetalle: false, periodo: 'día' },
    { id: 'c1', fecha: '2026-11-19T18:00:00.000Z', concepto: 'COBRO', identificacion: null, importe: 1500, sinDetalle: true },
  ],
  cantidad: 6, ingresos: 54000, egresos: 1000, total: 53000, sinDetalle: 1,
};
const resumen = { efectivoCobrado: 54000, devolucionesEfectivo: 1000, gastosEfectivo: 700, ingresosVarios: 0 } as Turno['resumen'];

beforeEach(() => jest.mocked(getCobrosEfectivoAction).mockReset());

test('se pide al tocar, no al abrir el historial, y muestra cada cobro con su signo y el total', async () => {
  jest.mocked(getCobrosEfectivoAction).mockResolvedValue(detalle);
  render(<CobrosEfectivoHistorial turnoId="t1" resumen={resumen} />);
  expect(getCobrosEfectivoAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ver cobros en efectivo' }));
  expect(getCobrosEfectivoAction).toHaveBeenCalledWith('t1');
  const seccion = await screen.findByRole('region', { name: 'Cobros en efectivo del turno' });
  // Cobros, no vehículos: AB123CD tiene dos filas.
  expect(within(seccion).getByText(/6 cobros/)).toBeInTheDocument();
  expect(within(seccion).getAllByText('AB123CD')).toHaveLength(2);
  const filas = within(seccion).getAllByRole('listitem');
  expect(filas.map((f) => f.textContent)).toEqual([
    expect.stringMatching(/10:05Anticipo.*AB123CD.*3\.000/),
    expect.stringMatching(/11:10Devolución.*AB123CD.*− .*1\.000/),
    expect.stringMatching(/Saldo al salir.*Ticket 0042/),
    expect.stringMatching(/Pago de inquilino.*Pérez Juan.*45\.000/),
    // Sin patente: el concepto, sin inventar una.
    expect.stringMatching(/Estadía por día.*Sin vehículo asociado/),
    expect.stringMatching(/Cobro en efectivo.*Sin detalle de la operación/),
  ]);
  expect(seccion).toHaveTextContent(/Total.*53\.000/);
  expect(seccion).toHaveTextContent('Coincide con el resumen del turno');
  expect(seccion).toHaveTextContent(/No incluye transferencias.*Varios, que el resumen muestra aparte/);
  expect(seccion).toHaveTextContent(/Un movimiento entró a la caja sin que se pueda saber de qué operación/);
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
  fireEvent.click(screen.getByRole('button', { name: 'Ver cobros en efectivo' }));
  const seccion = await screen.findByRole('region', { name: 'Cobros en efectivo del turno' });
  expect(seccion).toHaveTextContent(/El resumen del turno da .*59\.000.*este detalle .*53\.000/);
  expect(seccion).not.toHaveTextContent('Coincide con el resumen');
});
