import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import type { PricingOptions } from '@/types/pricing-options.type';
import { effectiveBrackets, resolveRecurringUnitPrice } from './ticket-price-bracket.utils';

// La escalera de «Ver tarifas»: un escalón por duración con precio y, al final, lo que se suma si
// se queda más. Es solo para mirar los precios cargados; lo que corresponde cobrar por una duración
// concreta lo calcula siempre el backend (la vista previa), nunca esta función.
export type Escalon = {
  clave: string;
  minutos: number;
  // Alto de la barra: para el adicional, el último escalón más lo que se suma.
  precio: number;
  tiempo: string;
  // Solo en el adicional: lo que se suma por cada unidad de más (null: sin precio por unidad).
  incremento?: number | null;
  adicional: boolean;
};

export function tiempoCorto(minutos: number): string {
  if (minutos >= 1440 && minutos % 1440 === 0) {
    const dias = minutos / 1440;
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

export function armarEscalera(
  brackets: TicketPriceBracket[],
  options: PricingOptions | null | undefined,
  vehiculo: string,
  periodo: 'DAY' | 'NIGHT',
): { escalones: Escalon[]; porPeriodo: boolean } {
  const charging = options?.charging;
  if (charging?.enabled) {
    const rate = charging.rates.find((r) => r.vehicleType === vehiculo);
    if (!rate) return { escalones: [], porPeriodo: true };
    const unidad = charging.unitMinutes;
    const precio = periodo === 'DAY' ? rate.dayPrice : rate.nightPrice;
    const escalones: Escalon[] = [1, 2, 3, 4].map((k) => ({ clave: `p${k}`, minutos: k * unidad, precio: k * precio, tiempo: tiempoCorto(k * unidad), adicional: false }));
    escalones.push({ clave: 'mas', minutos: 5 * unidad, precio: 5 * precio, incremento: precio, tiempo: `cada ${tiempoCorto(unidad)} más`, adicional: true });
    return { escalones, porPeriodo: true };
  }

  const pool = effectiveBrackets(brackets, vehiculo, periodo);
  const finitas = pool.filter((b) => b.uptoMinutes !== null).sort((a, b) => a.uptoMinutes! - b.uptoMinutes!);
  const escalones: Escalon[] = finitas.map((b) => ({ clave: b.id, minutos: b.uptoMinutes!, precio: b.price, tiempo: tiempoCorto(b.uptoMinutes!), adicional: false }));
  const abierta = pool.find((b) => b.uptoMinutes === null);
  if (abierta) {
    const ultima = escalones[escalones.length - 1];
    const base = ultima?.minutos ?? 0;
    const unidad = abierta.recurringUnitMinutes;
    // Mismo criterio que el mapa anterior y el backend: en DERIVED el precio por unidad sale de la
    // franja que coincide o de una escala más grande.
    const incremento = unidad
      ? abierta.recurringPriceMode !== 'FIXED' ? resolveRecurringUnitPrice(unidad, finitas, abierta.id)?.price ?? abierta.price : abierta.price
      : null;
    escalones.push({
      clave: abierta.id,
      minutos: base + (unidad ?? 60),
      precio: incremento != null ? (ultima?.precio ?? 0) + incremento : Math.max(abierta.price, ultima?.precio ?? 0),
      incremento,
      tiempo: unidad ? `cada ${tiempoCorto(unidad)} más` : base ? `más de ${tiempoCorto(base)}` : 'cualquier duración',
      adicional: true,
    });
  }
  return { escalones, porPeriodo: false };
}

// El escalón que se ilumina para una duración: el primero que la cubre con la tolerancia; si se
// pasa de todos, el adicional. Es una guía visual: el importe es el que devuelve el backend.
export function escalonDe(escalones: Escalon[], minutos: number, tolerancia: number): number {
  const i = escalones.findIndex((e) => !e.adicional && minutos <= e.minutos + tolerancia);
  if (i >= 0) return i;
  const adicional = escalones.findIndex((e) => e.adicional);
  return adicional >= 0 ? adicional : escalones.length - 1;
}

// Máximo del control deslizante: dos unidades más allá del último escalón, al menos 4 horas.
export function maximoDuracion(escalones: Escalon[]): number {
  const fijos = escalones.filter((e) => !e.adicional);
  const ultimo = fijos[fijos.length - 1]?.minutos ?? 0;
  const adicional = escalones.find((e) => e.adicional);
  const paso = adicional ? adicional.minutos - ultimo : 60;
  return Math.max(240, Math.ceil((ultimo + 2 * paso) / 15) * 15);
}
