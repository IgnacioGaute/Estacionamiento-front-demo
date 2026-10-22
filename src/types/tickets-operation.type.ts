import type { Ticket } from './ticket.type';
import type { TicketRegistration } from './ticket-registration.type';
import type { TicketRegistrationForDay } from './ticket-registration-for-day.type';
import type { TicketPriceBracket } from './ticket-price-bracket.type';
import type { TicketSchedule } from '@/services/tickets.service';

export type TicketsOperationData = {
  initialRegistrations: TicketRegistration[];
  ticketCatalog: Ticket[];
  priceBrackets: TicketPriceBracket[];
  registrationsForDay: TicketRegistrationForDay[];
  schedule: TicketSchedule | null;
};
export type TicketsOperationRevisions = Record<keyof TicketsOperationData, string>;
export type TicketsOperationSnapshot = { data: TicketsOperationData; revisions: TicketsOperationRevisions };
