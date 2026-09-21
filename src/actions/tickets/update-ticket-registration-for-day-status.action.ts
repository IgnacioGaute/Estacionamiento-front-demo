'use server';

import { TicketRegistrationForDayStatusSchemaType } from '@/schemas/ticket-registration-for-day.schema';
import { updateTicketStatus as updateTicketStatusAPI } from '@/services/tickets.service';

export async function updateTicketRegistrationForDayStatusAction(
  id: string,
  values: Partial<TicketRegistrationForDayStatusSchemaType>,
) {
  try {
    const result = await updateTicketStatusAPI(id, values);
    if (!result) {
      return { error: 'Error al editar el ticket' };
    }
    if ('error' in result) {
      return { error: result.error?.message || 'Error al editar el ticket' };
    }
    return { success: 'Ticket editado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al editar el ticket' };
  }
}
