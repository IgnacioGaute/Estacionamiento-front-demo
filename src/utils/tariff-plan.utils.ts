import type { TariffBracket, TariffDraft, TariffMethod } from '../types/tariff-plan.type';

export const tariffMethod = (plan: TariffDraft): TariffMethod =>
  plan.schedule.pricingOptions.charging.enabled ? plan.schedule.pricingOptions.charging.mode : 'CUSTOM';
export const crossingMode = (plan: TariffDraft) => plan.schedule.pricingOptions.crossing.enabled
  ? plan.schedule.pricingOptions.crossing.mode : plan.schedule.pricingDayTypeBasis;
export const hasNightPrices = (plan: TariffDraft) => tariffMethod(plan) === 'CUSTOM'
  ? plan.brackets.some(row => row.ticketDayType !== null)
  : plan.schedule.pricingOptions.charging.rates.some(row => row.dayPrice !== row.nightPrice);
export function durationLabel(minutes: number) {
  if (!Number.isFinite(minutes)) return 'Duración pendiente';
  if (minutes > 0 && minutes % 1440 === 0) return `${minutes / 1440} ${minutes === 1440 ? 'día' : 'días'}`;
  if (minutes > 0 && minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? 'hora' : 'horas'}`;
  return `${minutes} min`;
}
export function bracketLabel(row: TariffBracket) {
  return row.uptoMinutes !== null ? `Hasta ${durationLabel(row.uptoMinutes)}`
    : row.recurringUnitMinutes ? `Cada ${durationLabel(row.recurringUnitMinutes)} adicional` : 'Precio total después de la última duración';
}
export function changeMethod(plan: TariffDraft, method: TariffMethod): TariffDraft {
  return { ...plan, schedule: { ...plan.schedule, pricingOptions: { ...plan.schedule.pricingOptions,
    charging: { ...plan.schedule.pricingOptions.charging, enabled: method !== 'CUSTOM',
      mode: method === 'CUSTOM' ? plan.schedule.pricingOptions.charging.mode : method } } } };
}
export function changeCrossing(plan: TariffDraft, mode: 'ENTRY' | 'EXIT' | 'SPLIT'): TariffDraft {
  return { ...plan, schedule: { ...plan.schedule, pricingDayTypeBasis: mode === 'SPLIT' ? plan.schedule.pricingDayTypeBasis : mode,
    pricingOptions: { ...plan.schedule.pricingOptions, crossing: { enabled: mode === 'SPLIT', mode } } } };
}
// Called only after an explicit confirmation in the draft editor. Specific DAY
// rows override general rows at the same duration, as in the server calculator.
export function useDayPricesAllDay(plan: TariffDraft): TariffDraft {
  if (tariffMethod(plan) !== 'CUSTOM') return { ...plan, schedule: { ...plan.schedule,
    pricingOptions: { ...plan.schedule.pricingOptions, charging: { ...plan.schedule.pricingOptions.charging,
      rates: plan.schedule.pricingOptions.charging.rates.map(rate => ({ ...rate, nightPrice: rate.dayPrice })) } } } };
  const selected = new Map<string, TariffBracket>();
  for (const row of plan.brackets.filter(item => item.ticketDayType !== 'NIGHT')) {
    const key = `${row.vehicleType}:${row.uptoMinutes}`;
    const old = selected.get(key);
    if (!old || row.ticketDayType === 'DAY') selected.set(key, row);
  }
  return { ...plan, brackets: [...selected.values()].map(row => ({ ...row, ticketDayType: null })) };
}
const integer = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
export function validateTariffDraft(plan: TariffDraft, vehicles: { code: string; name: string; enabled: boolean }[] = []): string[] {
  const errors: string[] = [];
  const s = plan.schedule, o = s.pricingOptions;
  if (!integer(s.dayStartHour, 0, 23) || !integer(s.dayEndHour, 0, 23) || s.dayStartHour === s.dayEndHour) errors.push('El inicio y el fin del horario de día deben ser horas distintas, entre 0 y 23.');
  if (!integer(s.graceMinutes, 0, 5256000)) errors.push('La tolerancia debe ser un número entero de minutos, mayor o igual a cero.');
  if (!integer(o.charging.unitMinutes, 1, 10080)) errors.push('El período de cobro debe tener entre 1 y 10.080 minutos.');
  for (const rate of o.charging.rates) if (!integer(rate.dayPrice, 0, 100000000) || !integer(rate.nightPrice, 0, 100000000)) errors.push(`Completá los precios de ${rate.vehicleType} con importes enteros, de $0 a $100.000.000.`);
  if (new Set(o.charging.rates.map(r => r.vehicleType)).size !== o.charging.rates.length) errors.push('Hay precios por período repetidos para un vehículo.');
  const keys = new Set<string>();
  for (const row of plan.brackets) {
    const key = `${row.vehicleType}:${row.ticketDayType}:${row.uptoMinutes}`;
    if (keys.has(key)) errors.push(`Hay una duración repetida para ${row.vehicleType} en el mismo horario.`);
    keys.add(key);
    if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(row.vehicleType)) errors.push('Elegí el vehículo de cada precio.');
    if (!row.label.trim() || row.label.length > 255) errors.push('Cada precio debe tener un nombre válido.');
    if (row.uptoMinutes !== null && !integer(row.uptoMinutes, 0, 5256000)) errors.push('Las duraciones deben ser minutos enteros, entre 0 y 5.256.000.');
    if (!integer(row.price, 0, 2147483647)) errors.push('Completá todos los importes con pesos enteros, mayores o iguales a cero.');
    if (row.recurringUnitMinutes !== null && (!integer(row.recurringUnitMinutes, 1, 5256000) || row.uptoMinutes !== null)) errors.push('El adicional debe tener una duración válida y aplicarse después de la última duración.');
  }
  const active = vehicles.filter(v => v.enabled);
  if (o.charging.enabled && !o.charging.rates.length) errors.push('Cargá al menos un precio por vehículo.');
  if (!o.charging.enabled && !plan.brackets.length) errors.push('Agregá las duraciones y precios de tu playa.');
  for (const vehicle of active) {
    if (o.charging.enabled && !o.charging.rates.some(r => r.vehicleType === vehicle.code)) errors.push(`Falta el precio de ${vehicle.name}.`);
    if (!o.charging.enabled) for (const day of ['DAY', 'NIGHT'] as const) {
      if (!plan.brackets.some(row => row.vehicleType === vehicle.code && (row.ticketDayType === null || row.ticketDayType === day))) errors.push(`Faltan precios de ${vehicle.name} para ${day === 'DAY' ? 'el día' : 'la noche'}.`);
    }
  }
  return [...new Set(errors)];
}


export function tariffForVehicle(plan: TariffDraft, vehicleType: string): TariffDraft {
  return { ...plan, brackets: plan.brackets.filter(row => row.vehicleType === vehicleType),
    schedule: { ...plan.schedule, pricingOptions: { ...plan.schedule.pricingOptions,
      charging: { ...plan.schedule.pricingOptions.charging, rates: plan.schedule.pricingOptions.charging.rates.filter(rate => rate.vehicleType === vehicleType) },
      stay: { ...plan.schedule.pricingOptions.stay, caps: plan.schedule.pricingOptions.stay.caps.filter(cap => cap.vehicleType === vehicleType) },
    } } };
}
