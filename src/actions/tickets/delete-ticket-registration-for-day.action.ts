'use server';

import { deleteTicketRegistrationForDay as deleteTicketRegistrationForDayAPI } from '@/services/tickets.service';

export async function deleteTicketRegistrationForDayAction(id: string, authToken?: string) {
  try {
    const success = await deleteTicketRegistrationForDayAPI(id, authToken);
    if (!success) {
      return { error: 'Error al eliminar el ticket' };
    }
    return { success: 'Ticket eliminado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar el ticket' };
  }
}
