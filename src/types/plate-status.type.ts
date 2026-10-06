import type { TicketRegistration } from './ticket-registration.type';
import type { TicketRegistrationForDay } from './ticket-registration-for-day.type';
export type PlateStatus = { plate: string; hourly: TicketRegistration[]; daily: TicketRegistrationForDay[] };
