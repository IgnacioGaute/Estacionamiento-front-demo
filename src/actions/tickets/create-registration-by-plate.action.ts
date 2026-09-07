'use server';

import { entryByPlateSchema, EntryByPlateSchemaType } from '@/schemas/entry-by-plate.schema';
import { createRegistrationByPlate as createRegistrationByPlateAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function createRegistrationByPlateAction(values: EntryByPlateSchemaType) {
  const validatedFields = entryByPlateSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const registration = await createRegistrationByPlateAPI(validatedFields.data);

    if (!registration) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }

    if ('error' in registration) {
      const rawError = registration.error as TicketError & {
        existingRegistrationId?: string;
        entryTime?: string;
      };
      if (rawError.code === 'DUPLICATE_ACTIVE_PLATE') {
        return { error: rawError };
      }
      return { error: handleTicketError(rawError) };
    }

    return { success: 'Entrada registrada exitosamente' };
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
