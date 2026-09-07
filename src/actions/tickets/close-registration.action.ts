'use server';

import { closeRegistrationSchema, CloseRegistrationSchemaType } from '@/schemas/close-registration.schema';
import { closeRegistrationByPlate as closeRegistrationByPlateAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function closeRegistrationAction(id: string, values: CloseRegistrationSchemaType) {
  const validatedFields = closeRegistrationSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const registration = await closeRegistrationByPlateAPI(id, validatedFields.data);

    if (!registration) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }

    if ('error' in registration) {
      return { error: handleTicketError(registration.error as TicketError) };
    }

    return { success: 'Ticket cerrado exitosamente' };
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
