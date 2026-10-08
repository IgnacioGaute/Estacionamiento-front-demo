import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { cuandoEntro, formatEstadia, minutosDeEstadia, progresoEnTramo, tramoDe } from './estadia';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('formatEstadia', () => {
  test('minutos, horas con minutos y días con horas', () => {
    expect(formatEstadia(8)).toBe('8 min');
    expect(formatEstadia(185)).toBe('3 h 05 min');
    expect(formatEstadia(301 * 60 + 31)).toBe('12 d 13 h');
    expect(formatEstadia(48 * 60)).toBe('2 d');
  });

  test('nunca muestra negativos', () => {
    expect(formatEstadia(-5)).toBe('0 min');
  });
});

describe('cuandoEntro', () => {
  const ahora = dayjs.tz('2026-10-07 12:00:00', 'America/Argentina/Buenos_Aires');

  test('hoy solo la hora, ayer y fechas anteriores con el día', () => {
    expect(cuandoEntro({ entryDay: '2026-10-07', entryTime: '09:14:33' }, ahora)).toBe('09:14');
    expect(cuandoEntro({ entryDay: '2026-10-06', entryTime: '16:26:16' }, ahora)).toBe('ayer 16:26');
    expect(cuandoEntro({ entryDay: '2026-09-24', entryTime: '23:31:20' }, ahora)).toBe('24/09 23:31');
  });
});

describe('tramoDe', () => {
  test('menos de 1 h, de 1 a 4 h y más de 4 h', () => {
    expect(tramoDe(59)).toBe('menos1');
    expect(tramoDe(60)).toBe('de1a4');
    expect(tramoDe(239)).toBe('de1a4');
    expect(tramoDe(240)).toBe('mas4');
  });
});

describe('progresoEnTramo', () => {
  test('se llena dentro de cada tramo y arranca de cero en el siguiente', () => {
    expect(progresoEnTramo(30)).toBe(0.5);
    expect(progresoEnTramo(60)).toBe(0);
    expect(progresoEnTramo(150)).toBe(0.5);
    expect(progresoEnTramo(240)).toBe(0);
  });

  test('el último tramo no pasa de lleno', () => {
    expect(progresoEnTramo(20 * 60)).toBe(1);
  });
});

describe('minutosDeEstadia', () => {
  test('cuenta entre la entrada y la salida, aunque cambie el día', () => {
    expect(minutosDeEstadia({ entryDay: '2026-10-06', entryTime: '23:30:00', departureDay: '2026-10-07', departureTime: '00:40:00' })).toBe(70);
  });

  test('sin salida no hay duración', () => {
    expect(minutosDeEstadia({ entryDay: '2026-10-07', entryTime: '09:00:00', departureDay: null, departureTime: null })).toBeNull();
  });
});
