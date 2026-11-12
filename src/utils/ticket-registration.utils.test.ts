import { TicketRegistration } from '@/types/ticket-registration.type';
import { anticipoDe, marcarSalidaLocal, mergeServerSnapshot, upsertRegistration } from './ticket-registration.utils';

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

describe('marcarSalidaLocal', () => {
  const adentro = (lista: TicketRegistration[]) => lista.filter((x) => !x.departureTime && !x.departureDay).map((x) => x.id);

  test('saca de «adentro» solo esa estadía, con la hora de Buenos Aires', () => {
    const lista = marcarSalidaLocal([r('a', '08:00'), r('b', '09:00')], 'a', new Date('2026-10-14T15:30:05Z'));
    expect(adentro(lista)).toEqual(['b']);
    expect(lista[0]).toMatchObject({ departureDay: '2026-10-14', departureTime: '12:30:05' });
  });

  test('una foto vieja del servidor no la vuelve a poner adentro; la versión real la reemplaza', () => {
    const local = marcarSalidaLocal([r('a', '08:00')], 'a');
    expect(adentro(mergeServerSnapshot(local, [r('a', '08:00')]))).toEqual([]);
    const real = r('a', '08:05', true);
    expect(upsertRegistration(local, real)[0].departureTime).toBe('08:05:00');
  });

  test('no toca una estadía que ya tenía la salida', () => {
    const conSalida = r('a', '08:00', true);
    expect(marcarSalidaLocal([conSalida], 'a')[0]).toBe(conSalida);
  });
});
