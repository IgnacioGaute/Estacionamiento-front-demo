import type { TicketRegistration } from './ticket-registration.type';
import type { TicketRegistrationForDay } from './ticket-registration-for-day.type';
// `similares`: sin coincidencia exacta, los de adentro con una patente a un carácter de distancia
// (opcional: un backend anterior no lo manda).
export type PlateStatus = { plate: string; hourly: TicketRegistration[]; daily: TicketRegistrationForDay[]; similares?: TicketRegistration[] };
