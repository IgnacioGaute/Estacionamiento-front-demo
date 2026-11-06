import type { TariffBracket } from '@/types/tariff-plan.type';
import { masLargasMasBaratas } from './tariff-price-list';

const fila = (uptoMinutes: number, price: number, ticketDayType: TariffBracket['ticketDayType'] = null): TariffBracket =>
  ({ vehicleType: 'AUTO', ticketDayType, label: '', uptoMinutes, price, recurringUnitMinutes: null, recurringPriceMode: 'FIXED' });

test('avisa cuando una duración más larga cuesta menos que la anterior, en el mismo horario', () => {
  // Como en Mitre 1543: 1 hora $ 3.000 y 2 horas $ 2.000.
  const avisos = masLargasMasBaratas([fila(15, 1500), fila(60, 3000), fila(120, 2000), fila(1440, 10000)]);
  expect(avisos).toHaveLength(1);
  expect(avisos[0]).toMatch(/Hasta 2 horas .*2\.000.* cuesta menos que hasta 1 hora .*3\.000/);
});

test('no compara precios de horarios distintos ni avisa con importes crecientes', () => {
  expect(masLargasMasBaratas([fila(60, 3000, 'DAY'), fila(120, 2000, 'NIGHT')])).toEqual([]);
  expect(masLargasMasBaratas([fila(30, 1000), fila(60, 2000), fila(120, 3500)])).toEqual([]);
});
