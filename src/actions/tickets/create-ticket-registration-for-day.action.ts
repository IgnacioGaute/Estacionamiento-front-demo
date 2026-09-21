'use server';

import { ticketRegistrationForDaySchema, TicketRegistrationForDaySchemaType } from '@/schemas/ticket-registration-for-day.schema';
import { createTicketRegistrationForDay as createTicketRegistrationForDayAPI } from '@/services/tickets.service';

export async function createTicketRegistrationForDayAction(values: TicketRegistrationForDaySchemaType) {
  const validatedFields = ticketRegistrationForDaySchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const ticket = await createTicketRegistrationForDayAPI(validatedFields.data);

    if (!ticket) {
      return { error: 'Error al crear el ticket' };
    }
    if ('error' in ticket) {
      return { error: ticket.error.message };
    }
    return { success: 'Ticket creado exitosamente' };
  } catch (error) {
    console.error(error);
    return { error: 'Error al crear el ticket' };
  }
}
