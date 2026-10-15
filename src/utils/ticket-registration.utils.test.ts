import { TicketRegistration } from '@/types/ticket-registration.type';
import { anticipoDe, mergeServerSnapshot } from './ticket-registration.utils';

const r = (id: string, hora: string, salida = false) =>
  ({ id, updatedAt: `2026-10-14T${hora}:00.000Z`, departureDay: salida ? '2026-10-14' : null, departureTime: salida ? `${hora}:00` : null }) as unknown as TicketRegistration;
const ids = (lista: TicketRegistration[]) => lista.map((x) => x.id).sort();

describe('mergeServerSnapshot', () => {
  test('descarta los que acá figuran adentro y el servidor ya no lista: salieron mientras se perdían avisos', () => {
    const local = [r('a', '08:00'), r('b', '09:00'), r('c', '10:00')];
    const server = [r('a', '08:00'), r('d', '11:00')];
    expect(ids(mergeServerSnapshot(local, server))).toEqual(['a', 'd']);
  });

  test('conserva las salidas que el servidor no trae, para «Últimos movimientos»', () => {
    const local = [r('a', '08:00'), r('x', '10:30', true)];
    const server = [r('a', '08:00'), r('y', '11:13', true)];
    expect(ids(mergeServerSnapshot(local, server))).toEqual(['a', 'x', 'y']);
  });

  test('conserva lo que llegó en vivo después de la foto del servidor', () => {
    const local = [r('a', '08:00'), r('nuevo', '11:20')];
    const server = [r('a', '08:00'), r('y', '11:13', true)];
    expect(ids(mergeServerSnapshot(local, server))).toEqual(['a', 'nuevo', 'y']);
  });

  test('si el mismo registro está en los dos, gana el más nuevo', () => {
    const salidaEnVivo = r('a', '11:30', true);
    expect(mergeServerSnapshot([salidaEnVivo], [r('a', '08:00')])[0]).toBe(salidaEnVivo);
    const delServidor = r('a', '11:30', true);
    expect(mergeServerSnapshot([r('a', '08:00')], [delServidor])[0]).toBe(delServidor);
  });
});

describe('anticipoDe', () => {
  const conAnticipo = (extra: Partial<TicketRegistration>) =>
    ({ id: 'a', updatedAt: '', entryDay: '2026-10-14', entryTime: '14:00:00', advancePaidAmount: 7000, expectedUptoMinutes: 120, departureDay: null, departureTime: null, ...extra }) as unknown as TicketRegistration;
  const a = (hora: string) => new Date(`2026-10-14T${hora}:00-03:00`).getTime();

  test('marca cuánto pagó y hasta qué hora le alcanza', () => {
    expect(anticipoDe(conAnticipo({}), a('15:00'))).toEqual({ monto: 7000, hasta: '16:00', vencido: false });
  });
  test('pasada la hora pagada queda vencido, para cobrar la diferencia', () => {
    expect(anticipoDe(conAnticipo({}), a('16:30'))?.vencido).toBe(true);
  });
  test('sin duración avisada no hay hora tope', () => {
    expect(anticipoDe(conAnticipo({ expectedUptoMinutes: null }), a('20:00'))).toEqual({ monto: 7000, hasta: null, vencido: false });
  });
  test('sin anticipo o con la salida registrada no marca nada', () => {
    expect(anticipoDe(conAnticipo({ advancePaidAmount: 0 }), a('15:00'))).toBeNull();
    expect(anticipoDe(conAnticipo({ departureTime: '15:00:00' }), a('15:00'))).toBeNull();
  });
});
