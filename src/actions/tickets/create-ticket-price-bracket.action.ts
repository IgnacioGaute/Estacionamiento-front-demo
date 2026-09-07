'use server';

import { ticketPriceBracketSchema, TicketPriceBracketSchemaType } from '@/schemas/ticket-price-bracket.schema';
import { createTicketPriceBracket as createTicketPriceBracketAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function createTicketPriceBracketAction(values: TicketPriceBracketSchemaType) {
  const validatedFields = ticketPriceBracketSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const bracket = await createTicketPriceBracketAPI(validatedFields.data);

    if (!bracket) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }

    if ('error' in bracket) {
      return { error: handleTicketError(bracket.error as TicketError) };
    }

    return { success: 'Franja de precio creada exitosamente' };
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
