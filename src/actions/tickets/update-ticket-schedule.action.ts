'use server';

import { TicketScheduleSchemaType } from '@/schemas/ticket-schedule.schema';
import { updateTicketSchedule as updateTicketScheduleAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function updateTicketScheduleAction(values: TicketScheduleSchemaType) {
  try {
    const schedule = await updateTicketScheduleAPI(values);
    if (!schedule) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }

    if ('error' in schedule) {
      return { error: handleTicketError(schedule.error as TicketError) };
    }

    return { success: 'Horario de tarifas actualizado exitosamente' };
  } catch (error: unknown) {
    console.error('Error desde el backend:', error);
    return {
      error: {
        code: 'SERVER_ERROR',
        message: (error as Error)?.message || 'Error inesperado en el servidor.',
      },
    };
  }
}
