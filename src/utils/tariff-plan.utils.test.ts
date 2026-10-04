import type { TariffDraft } from '@/types/tariff-plan.type';
import { bracketLabel, changeCrossing, changeMethod, crossingMode, hasNightPrices, tariffForVehicle, tariffMethod, useDayPricesAllDay, validateTariffDraft } from './tariff-plan.utils';

function plan(): TariffDraft {
  return {
    schedule: { dayStartHour: 8, dayEndHour: 20, graceMinutes: 10, pricingDayTypeBasis: 'ENTRY',
      pricingOptions: {
        charging: { enabled: true, mode: 'COMPLETED', unitMinutes: 30, rates: [{ vehicleType: 'AUTO', dayPrice: 1200, nightPrice: 1900 }] },
        crossing: { enabled: true, mode: 'SPLIT' },
        stay: { enabled: false, freeMinutes: 0, minimumMinutes: 0, capEnabled: false, capMinutes: 1440, caps: [] },
      } },
    brackets: [
      { id: 'legacy-general', vehicleType: 'AUTO', ticketDayType: null, label: 'Nombre histórico', uptoMinutes: 60, price: 2500, recurringUnitMinutes: null, recurringPriceMode: 'DERIVED' },
      { id: 'legacy-day', vehicleType: 'AUTO', ticketDayType: 'DAY', label: 'Diurna', uptoMinutes: 60, price: 2300, recurringUnitMinutes: null, recurringPriceMode: 'DERIVED' },
      { id: 'legacy-night', vehicleType: 'AUTO', ticketDayType: 'NIGHT', label: 'Nocturna', uptoMinutes: 60, price: 3000, recurringUnitMinutes: null, recurringPriceMode: 'DERIVED' },
      { id: 'legacy-extra', vehicleType: 'AUTO', ticketDayType: null, label: 'Adicional anterior', uptoMinutes: null, price: 1800, recurringUnitMinutes: 60 },
    ],
  };
}
const active = [{ code: 'AUTO', name: 'Auto', enabled: true }];

test('switching to a custom list and back preserves prices, legacy labels, recurring semantics and hidden rules', () => {
  const original = plan(), before = structuredClone(original);
  const custom = changeMethod(original, 'CUSTOM');
  expect(tariffMethod(custom)).toBe('CUSTOM');
  expect(custom.brackets).toEqual(original.brackets);
  expect(changeMethod(custom, 'COMPLETED')).toEqual(original);
  expect(original).toEqual(before);
  expect(custom.brackets[3].recurringPriceMode).toBeUndefined();
});

test('one crossing choice resolves the old precedence without changing tariff amounts', () => {
  const original = plan();
  expect(crossingMode(original)).toBe('SPLIT');
  const entry = changeCrossing(original, 'ENTRY');
  expect(crossingMode(entry)).toBe('ENTRY');
  expect(entry.schedule.pricingOptions.crossing.enabled).toBe(false);
  expect(entry.schedule.pricingDayTypeBasis).toBe('ENTRY');
  const exit = changeCrossing(entry, 'EXIT');
  expect(crossingMode(exit)).toBe('EXIT');
  expect(exit.schedule.pricingDayTypeBasis).toBe('EXIT');
  expect(crossingMode(changeCrossing(exit, 'SPLIT'))).toBe('SPLIT');
  expect(exit.brackets).toEqual(original.brackets);
  expect(exit.schedule.pricingOptions.charging).toEqual(original.schedule.pricingOptions.charging);
});

test('explicit all-day conversion preserves SPLIT even with identical unit prices', () => {
  const original = plan(), uniform = useDayPricesAllDay(original);
  expect(hasNightPrices(uniform)).toBe(false);
  expect(uniform.schedule.pricingOptions.charging.rates[0].nightPrice).toBe(1200);
  expect(crossingMode(uniform)).toBe('SPLIT');
  expect(original.schedule.pricingOptions.charging.rates[0].nightPrice).toBe(1900);
});

test('explicit all-day custom conversion gives DAY precedence only at matching durations', () => {
  const original = changeMethod(plan(), 'CUSTOM');
  const uniform = useDayPricesAllDay(original);
  expect(uniform.brackets.map(row => row.id)).toEqual(['legacy-day', 'legacy-extra']);
  expect(uniform.brackets.every(row => row.ticketDayType === null)).toBe(true);
  expect(uniform.brackets[0].price).toBe(2300);
  expect(uniform.brackets[1].recurringPriceMode).toBeUndefined();
  expect(original.brackets).toHaveLength(4);
});

test('validation prevents missing vehicle prices and accepts deliberate zero prices', () => {
  const original = plan();
  expect(validateTariffDraft(original, active)).toEqual([]);
  original.schedule.pricingOptions.charging.rates[0].dayPrice = 0;
  original.schedule.pricingOptions.charging.rates[0].nightPrice = 0;
  expect(validateTariffDraft(original, active)).toEqual([]);
  expect(validateTariffDraft(original, [...active, { code: 'MOTO', name: 'Moto', enabled: true }]).some(message => message.includes('Moto'))).toBe(true);
  original.schedule.pricingOptions.charging.rates[0].dayPrice = NaN;
  expect(validateTariffDraft(original, active).some(message => message.includes('importes'))).toBe(true);
});

test('custom list validates both schedules, rejects duplicate durations and preserves zero-minute legacy rows', () => {
  const custom = changeMethod(plan(), 'CUSTOM');
  expect(validateTariffDraft(custom, active)).toEqual([]);
  custom.brackets = [custom.brackets[1]];
  expect(validateTariffDraft(custom, active).some(message => message.includes('la noche'))).toBe(true);
  custom.brackets[0].ticketDayType = null;
  custom.brackets[0].uptoMinutes = 0;
  expect(validateTariffDraft(custom, active)).toEqual([]);
  custom.brackets.push({ ...custom.brackets[0], id: 'other' });
  expect(validateTariffDraft(custom, active).some(message => message.includes('repetida'))).toBe(true);
});

test('new generated labels communicate duration and additional pricing without changing the historical labels', () => {
  expect(bracketLabel({ ...plan().brackets[0], uptoMinutes: 1440 })).toBe('Hasta 1 día');
  expect(bracketLabel(plan().brackets[3])).toBe('Cada 1 hora adicional');
  expect(plan().brackets[0].label).toBe('Nombre histórico');
});

test('preview isolates the selected vehicle while save still requires all active vehicles', () => {
  const original = plan();
  original.schedule.pricingOptions.charging.rates.push({ vehicleType: 'MOTO', dayPrice: NaN, nightPrice: NaN });
  original.brackets.push({ vehicleType: 'MOTO', ticketDayType: null, label: 'Duración pendiente', uptoMinutes: NaN, price: NaN, recurringUnitMinutes: null });
  const preview = tariffForVehicle(original, 'AUTO');
  expect(validateTariffDraft(preview, active)).toEqual([]);
  expect(validateTariffDraft(original, active).length).toBeGreaterThan(0);
  expect(preview.schedule.pricingOptions.crossing).toEqual(original.schedule.pricingOptions.crossing);
  expect(original.brackets).toHaveLength(5);
});

test('disabled vehicles do not require new rates but existing saved rates remain validated', () => {
  const original = plan();
  expect(validateTariffDraft(original, [...active, { code: 'MOTO', name: 'Moto', enabled: false }])).toEqual([]);
  original.schedule.pricingOptions.charging.rates.push({ vehicleType: 'MOTO', dayPrice: -1, nightPrice: 500 });
  expect(validateTariffDraft(original, active).some(message => message.includes('MOTO'))).toBe(true);
});
