export type DurationUnit = 'MIN' | 'HOUR' | 'DAY';

export function amountUnitToMinutes(amount: number, unit: DurationUnit): number {
  const factor = unit === 'MIN' ? 1 : unit === 'HOUR' ? 60 : 1440;
  return Math.round(amount * factor);
}

export function minutesToAmountUnit(minutes: number): { amount: number; unit: DurationUnit } {
  if (minutes >= 1440 && minutes % 1440 === 0) return { amount: minutes / 1440, unit: 'DAY' };
  if (minutes >= 60 && minutes % 60 === 0) return { amount: minutes / 60, unit: 'HOUR' };
  return { amount: minutes, unit: 'MIN' };
}

export function formatMinutesLabel(minutes: number | null): string {
  if (minutes === null) return 'Sin límite';
  const { amount, unit } = minutesToAmountUnit(minutes);
  const unitLabel = unit === 'MIN' ? (amount === 1 ? 'minuto' : 'minutos') : unit === 'HOUR' ? (amount === 1 ? 'hora' : 'horas') : (amount === 1 ? 'día' : 'días');
  return `Hasta ${amount} ${unitLabel}`;
}

export function formatRecurringUnitLabel(unitMinutes: number): string {
  const { amount, unit } = minutesToAmountUnit(unitMinutes);
  const unitLabel = unit === 'MIN' ? (amount === 1 ? 'minuto' : 'minutos') : unit === 'HOUR' ? (amount === 1 ? 'hora' : 'horas') : (amount === 1 ? 'día' : 'días');
  return `cada ${amount} ${unitLabel}`;
}
