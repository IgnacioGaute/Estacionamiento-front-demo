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
  if (minutes === 0) return 'Hasta 0 minutos';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'minuto' : 'minutos'}`);
  return `Hasta ${parts.join(' ')}`;
}

export function formatRecurringUnitLabel(unitMinutes: number): string {
  const { amount, unit } = minutesToAmountUnit(unitMinutes);
  const unitLabel = unit === 'MIN' ? (amount === 1 ? 'minuto' : 'minutos') : unit === 'HOUR' ? (amount === 1 ? 'hora' : 'horas') : (amount === 1 ? 'día' : 'días');
  return `cada ${amount} ${unitLabel}`;
}

/**
 * Solo puede existir una franja "sin límite" por vehículo + horario — el backend usa la
 * PRIMERA que encuentra al cobrar, así que una segunda quedaría cargada sin servir para
 * nada. Un horario "cualquiera" (ticketDayType null) cubre día y noche, así que también
 * choca con una franja específica de esa combinación.
 */
type OpenEndedCandidate = {
  id: string;
  label: string;
  vehicleType: string;
  ticketDayType: string | null;
  uptoMinutes: number | null;
};

export function findOpenEndedConflict<T extends OpenEndedCandidate>(
  brackets: T[],
  vehicleType: string,
  ticketDayType: string | null | undefined,
  ignoreId?: string,
): T | null {
  const day = ticketDayType ?? null;
  return (
    brackets.find(
      (b) =>
        b.id !== ignoreId &&
        b.uptoMinutes === null &&
        b.vehicleType === vehicleType &&
        b.ticketDayType === day,
    ) ?? null
  );
}

/**
 * Franjas que realmente compiten por cobrar a este vehículo + horario — mismo criterio que usa
 * el backend al cobrar (resolveExitPrice): mismo vehicleType, y horario "cualquiera" (null) o
 * coincidente. Sin este filtro, sugerir/mostrar el precio de una franja recurrente puede tomar
 * como referencia la de otro vehículo o del otro horario (ej. "Sin límite" de auto/noche
 * mostrando el precio derivado de auto/día) simplemente porque quedó primera en la lista.
 */
export function scopeBracketsFor<T extends { vehicleType: string; ticketDayType: string | null }>(
  brackets: T[],
  vehicleType: string,
  ticketDayType: string | null | undefined,
): T[] {
  const day = ticketDayType ?? null;
  return brackets.filter(
    (b) => b.vehicleType === vehicleType && (b.ticketDayType === null || day === null || b.ticketDayType === day),
  );
}

type RecurringAnchorCandidate = { id: string; label: string; uptoMinutes: number | null; price: number };

// Precio real de una franja recurrente — mismo criterio que el backend (priceBracketAmount): 1)
// coincidencia exacta del "cada X" con el "hasta" de otra franja ya cargada; 2) si no hay, se
// deriva proporcionalmente de la franja más chica de una escala más GRANDE (ej. "cada 1 minuto"
// toma "hasta 1 hora" ÷ 60); 3) si no hay ninguna franja más grande, null — no hay de dónde
// sugerir un precio, hay que cargarlo a mano.
export function resolveRecurringUnitPrice<T extends RecurringAnchorCandidate>(
  recurringUnitMinutes: number,
  brackets: T[],
  ignoreId?: string,
): { price: number; sourceLabel: string } | null {
  const finite = brackets.filter((b) => b.id !== ignoreId && b.uptoMinutes !== null);

  const exact = finite.find((b) => b.uptoMinutes === recurringUnitMinutes);
  if (exact) return { price: exact.price, sourceLabel: exact.label };

  const tier = minutesToAmountUnit(recurringUnitMinutes).unit;
  const biggerUnits: DurationUnit[] = tier === 'MIN' ? ['HOUR', 'DAY'] : tier === 'HOUR' ? ['DAY'] : [];

  for (const biggerUnit of biggerUnits) {
    const anchor = finite
      .filter((b) => minutesToAmountUnit(b.uptoMinutes!).unit === biggerUnit)
      .sort((a, b) => a.uptoMinutes! - b.uptoMinutes!)[0];
    if (anchor) {
      return {
        price: (anchor.price / anchor.uptoMinutes!) * recurringUnitMinutes,
        sourceLabel: anchor.label,
      };
    }
  }

  return null;
}

export function effectiveBrackets<T extends { vehicleType: string; ticketDayType: string | null; uptoMinutes: number | null }>(
  brackets: T[], vehicleType: string, day: 'DAY' | 'NIGHT',
): T[] {
  const selected = new Map<number | null, T>();
  for (const bracket of brackets.filter(b => b.vehicleType === vehicleType && (b.ticketDayType === null || b.ticketDayType === day))) {
    if (!selected.has(bracket.uptoMinutes) || bracket.ticketDayType === day) selected.set(bracket.uptoMinutes, bracket);
  }
  return [...selected.values()];
}
