'use server';

import { UpdateTicketPriceBracketSchemaType } from '@/schemas/ticket-price-bracket.schema';
import { updateTicketPriceBracket as updateTicketPriceBracketAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function updateTicketPriceBracketAction(
  id: string,
  values: Partial<UpdateTicketPriceBracketSchemaType>,
) {
  try {
    const bracket = await updateTicketPriceBracketAPI(id, values);
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

    return { success: 'Franja de precio editada exitosamente' };
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
