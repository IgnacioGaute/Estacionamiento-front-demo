import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { defaultPricingOptions } from '@/types/pricing-options.type';
import { armarEscalera, escalonDe, maximoDuracion, tiempoCorto } from './tarifas-escalera';

const franja = (id: string, uptoMinutes: number | null, price: number, extra: Partial<TicketPriceBracket> = {}) =>
  ({ id, vehicleType: 'AUTO', ticketDayType: null, label: id, uptoMinutes, price, recurringUnitMinutes: null, createdAt: '', updatedAt: '', ...extra }) as TicketPriceBracket;

describe('armarEscalera', () => {
  test('ordena las duraciones y agrega al final lo que se suma por hora', () => {
    const { escalones, porPeriodo } = armarEscalera(
      [franja('2h', 120, 7000), franja('15m', 15, 1500), franja('1h', 60, 4000), franja('mas', null, 2500, { recurringUnitMinutes: 60, recurringPriceMode: 'FIXED' })],
      null, 'AUTO', 'DAY',
    );
    expect(porPeriodo).toBe(false);
    expect(escalones.map((e) => [e.tiempo, e.precio])).toEqual([['15 min', 1500], ['1 h', 4000], ['2 h', 7000], ['cada 1 h más', 9500]]);
    expect(escalones[3]).toMatchObject({ adicional: true, incremento: 2500, minutos: 180 });
  });

  test('una franja de noche reemplaza a la general de la misma duración', () => {
    const { escalones } = armarEscalera([franja('1h', 60, 4000), franja('1h-noche', 60, 5000, { ticketDayType: 'NIGHT' })], null, 'AUTO', 'NIGHT');
    expect(escalones.map((e) => e.precio)).toEqual([5000]);
  });

  test('con cobro por período muestra múltiplos de la unidad', () => {
    const options = defaultPricingOptions();
    options.charging = { enabled: true, mode: 'STARTED', unitMinutes: 30, rates: [{ vehicleType: 'AUTO', dayPrice: 1000, nightPrice: 1500 }] };
    const { escalones, porPeriodo } = armarEscalera([], options, 'AUTO', 'NIGHT');
    expect(porPeriodo).toBe(true);
    expect(escalones.map((e) => e.tiempo)).toEqual(['30 min', '1 h', '1 h 30 min', '2 h', 'cada 30 min más']);
    expect(escalones[4].incremento).toBe(1500);
  });

  test('sin tarifas para el vehículo no hay escalones', () => {
    expect(armarEscalera([franja('1h', 60, 4000)], null, 'MOTO', 'DAY').escalones).toEqual([]);
  });
});

describe('escalonDe', () => {
  const { escalones } = armarEscalera([franja('1h', 60, 4000), franja('2h', 120, 7000), franja('mas', null, 2500, { recurringUnitMinutes: 60, recurringPriceMode: 'FIXED' })], null, 'AUTO', 'DAY');
  test('usa la tolerancia antes de pasar al escalón siguiente', () => {
    expect(escalonDe(escalones, 65, 10)).toBe(0);
    expect(escalonDe(escalones, 75, 10)).toBe(1);
  });
  test('pasado el último escalón ilumina el adicional', () => {
    expect(escalonDe(escalones, 200, 10)).toBe(2);
  });
  test('el control llega dos horas más allá del último escalón', () => {
    expect(maximoDuracion(escalones)).toBe(240);
  });
});

test('tiempoCorto', () => {
  expect(tiempoCorto(45)).toBe('45 min');
  expect(tiempoCorto(90)).toBe('1 h 30 min');
  expect(tiempoCorto(2880)).toBe('2 días');
});
