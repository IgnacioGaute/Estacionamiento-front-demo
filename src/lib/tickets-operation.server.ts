import { createHash } from 'node:crypto';
import { modalidadActual } from './modalidad.server';
import { getTicketRegistrations, getTickets, getTicketPriceBrackets, getTicketSchedule, getTicketsRegistrationForDay } from '@/services/tickets.service';
import type { TicketsOperationData, TicketsOperationRevisions, TicketsOperationSnapshot } from '@/types/tickets-operation.type';

// Se vuelve a validar el acceso en cada lectura. Las huellas solo reducen la respuesta al
// teléfono; no hay una caché de datos ni de permisos compartida entre usuarios o playas.
export async function readTicketsOperation(): Promise<TicketsOperationSnapshot> {
  const gratuita = await modalidadActual() === 'GRATUITO';
  const [initialRegistrations, catalog, priceBrackets, schedule, registrationsForDay] = await Promise.all([
    getTicketRegistrations(), getTickets(), gratuita ? [] : getTicketPriceBrackets(), getTicketSchedule(), gratuita ? [] : getTicketsRegistrationForDay(),
  ]);
  if (!catalog || !priceBrackets || !schedule) throw new Error('No se pudo actualizar la operación.');
  const data: TicketsOperationData = { initialRegistrations, ticketCatalog: catalog.data, priceBrackets, schedule, registrationsForDay };
  const revisions = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, createHash('sha256').update(JSON.stringify(value)).digest('hex')])) as TicketsOperationRevisions;
  return { data, revisions };
}
