const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compile only this pure helper in memory; the application has no test runtime.
const file = path.resolve(__dirname, '../src/utils/tariff-plan.utils.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const helper = new Module(file, module);
helper.filename = file;
helper.paths = module.paths;
helper._compile(compiled, file);
const { tariffMethod, crossingMode, changeMethod, changeCrossing, hasNightPrices, useDayPricesAllDay, validateTariffDraft, bracketLabel, tariffForVehicle } = helper.exports;

function plan() {
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
  assert.equal(tariffMethod(custom), 'CUSTOM');
  assert.deepEqual(custom.brackets, original.brackets);
  assert.deepEqual(changeMethod(custom, 'COMPLETED'), original);
  assert.deepEqual(original, before);
  assert.equal(custom.brackets[3].recurringPriceMode, undefined);
});
test('one crossing choice resolves the old precedence without changing tariff amounts', () => {
  const original = plan();
  assert.equal(crossingMode(original), 'SPLIT');
  const entry = changeCrossing(original, 'ENTRY');
  assert.equal(crossingMode(entry), 'ENTRY');
  assert.equal(entry.schedule.pricingOptions.crossing.enabled, false);
  assert.equal(entry.schedule.pricingDayTypeBasis, 'ENTRY');
  const exit = changeCrossing(entry, 'EXIT');
  assert.equal(crossingMode(exit), 'EXIT');
  assert.equal(exit.schedule.pricingDayTypeBasis, 'EXIT');
  assert.equal(crossingMode(changeCrossing(exit, 'SPLIT')), 'SPLIT');
  assert.deepEqual(exit.brackets, original.brackets);
  assert.deepEqual(exit.schedule.pricingOptions.charging, original.schedule.pricingOptions.charging);
});
test('explicit all-day conversion preserves SPLIT even with identical unit prices', () => {
  const original = plan(), uniform = useDayPricesAllDay(original);
  assert.equal(hasNightPrices(uniform), false);
  assert.equal(uniform.schedule.pricingOptions.charging.rates[0].nightPrice, 1200);
  assert.equal(crossingMode(uniform), 'SPLIT');
  assert.equal(original.schedule.pricingOptions.charging.rates[0].nightPrice, 1900);
});
test('explicit all-day custom conversion gives DAY precedence only at matching durations', () => {
  const original = changeMethod(plan(), 'CUSTOM');
  const uniform = useDayPricesAllDay(original);
  assert.deepEqual(uniform.brackets.map(row => row.id), ['legacy-day', 'legacy-extra']);
  assert.ok(uniform.brackets.every(row => row.ticketDayType === null));
  assert.equal(uniform.brackets[0].price, 2300);
  assert.equal(uniform.brackets[1].recurringPriceMode, undefined);
  assert.equal(original.brackets.length, 4);
});
test('validation prevents missing vehicle prices and accepts deliberate zero prices', () => {
  const original = plan();
  assert.deepEqual(validateTariffDraft(original, active), []);
  original.schedule.pricingOptions.charging.rates[0].dayPrice = 0;
  original.schedule.pricingOptions.charging.rates[0].nightPrice = 0;
  assert.deepEqual(validateTariffDraft(original, active), []);
  assert.ok(validateTariffDraft(original, [...active, { code: 'MOTO', name: 'Moto', enabled: true }]).some(message => message.includes('Moto')));
  original.schedule.pricingOptions.charging.rates[0].dayPrice = NaN;
  assert.ok(validateTariffDraft(original, active).some(message => message.includes('importes')));
});
test('custom list validates both schedules, rejects duplicate durations and preserves zero-minute legacy rows', () => {
  const custom = changeMethod(plan(), 'CUSTOM');
  assert.deepEqual(validateTariffDraft(custom, active), []);
  custom.brackets = [custom.brackets[1]];
  assert.ok(validateTariffDraft(custom, active).some(message => message.includes('la noche')));
  custom.brackets[0].ticketDayType = null;
  custom.brackets[0].uptoMinutes = 0;
  assert.deepEqual(validateTariffDraft(custom, active), []);
  custom.brackets.push({ ...custom.brackets[0], id: 'other' });
  assert.ok(validateTariffDraft(custom, active).some(message => message.includes('repetida')));
});
test('new generated labels communicate duration and additional pricing without changing the historical labels', () => {
  assert.equal(bracketLabel({ ...plan().brackets[0], uptoMinutes: 1440 }), 'Hasta 1 día');
  assert.equal(bracketLabel(plan().brackets[3]), 'Cada 1 hora adicional');
  assert.equal(plan().brackets[0].label, 'Nombre histórico');
});


test('preview isolates the selected vehicle while save still requires all active vehicles', () => {
  const original = plan();
  original.schedule.pricingOptions.charging.rates.push({ vehicleType: 'MOTO', dayPrice: NaN, nightPrice: NaN });
  original.brackets.push({ vehicleType: 'MOTO', ticketDayType: null, label: 'Duración pendiente', uptoMinutes: NaN, price: NaN, recurringUnitMinutes: null });
  const preview = tariffForVehicle(original, 'AUTO');
  assert.deepEqual(validateTariffDraft(preview, active), []);
  assert.ok(validateTariffDraft(original, active).length > 0);
  assert.deepEqual(preview.schedule.pricingOptions.crossing, original.schedule.pricingOptions.crossing);
  assert.equal(original.brackets.length, 5);
});
test('disabled vehicles do not require new rates but existing saved rates remain validated', () => {
  const original = plan();
  assert.deepEqual(validateTariffDraft(original, [...active, { code: 'MOTO', name: 'Moto', enabled: false }]), []);
  original.schedule.pricingOptions.charging.rates.push({ vehicleType: 'MOTO', dayPrice: -1, nightPrice: 500 });
  assert.ok(validateTariffDraft(original, active).some(message => message.includes('MOTO')));
});
