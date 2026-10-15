import type { TicketRegistration } from '@/types/ticket-registration.type';
import { agruparEstadiasAbiertas } from './estadias-abiertas-reporte';

const estadia = (id: string, operador: string | null, entrada: string, salida = false) =>
  ({ id, entryOperatorName: operador, entryDay: '2026-10-14', entryTime: entrada, departureDay: salida ? '2026-10-14' : null, departureTime: salida ? '20:00:00' : null }) as unknown as TicketRegistration;
const ahora = new Date('2026-10-14T20:30:00-03:00').getTime();

test('agrupa las abiertas por quién las registró, con las de más horas primero', () => {
  const grupos = agruparEstadiasAbiertas([
    estadia('a', 'Franco Pizarro', '07:11:00'),
    estadia('b', 'Franco Pizarro', '14:09:00'),
    estadia('c', 'Brian Paolasso', '19:00:00'),
    estadia('d', 'Brian Paolasso', '15:00:00', true),
    estadia('e', null, '20:00:00'),
  ], ahora);
  expect(grupos.map((g) => [g.operador, g.filas.map((f) => f.r.id), g.largas])).toEqual([
    ['Franco Pizarro', ['a', 'b'], 2],
    ['Brian Paolasso', ['c'], 0],
    ['Sin operador registrado', ['e'], 0],
  ]);
});
