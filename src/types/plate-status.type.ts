import type { TicketRegistration } from './ticket-registration.type';
import type { TicketRegistrationForDay } from './ticket-registration-for-day.type';
// `similares`: sin coincidencia exacta, los de adentro con una patente a un carácter de distancia
// (opcional: un backend anterior no lo manda).
// `salidaReciente`: no está adentro pero salió hace menos de 30 minutos (opcional: un backend
// anterior no lo manda). Una entrada o una salida sin entrada con esa patente suele ser un error.
export type SalidaReciente = { id: string; hora: string; cobrado: number; descuento: number; motivoDescuento: string | null };
export type PlateStatus = { plate: string; hourly: TicketRegistration[]; daily: TicketRegistrationForDay[]; similares?: TicketRegistration[]; salidaReciente?: SalidaReciente | null };

// «Salió a las 13:38 sin cobro (descuento «Poco tiempo»)»: cómo se fue, para decidir si es otro auto.
export function comoSalio(s: SalidaReciente) {
  const plata = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  const forma = s.cobrado > 0 ? `cobrada ${plata(s.cobrado)}` : s.descuento > 0 ? `sin cobro (descuento${s.motivoDescuento ? ` «${s.motivoDescuento}»` : ''})` : 'sin cobro';
  return `Salió a las ${s.hora}, ${forma}.`;
}
