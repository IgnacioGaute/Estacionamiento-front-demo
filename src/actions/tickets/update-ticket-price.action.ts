'use server';

import { revalidatePath } from 'next/cache';

import { UpdateTicketPriceSchemaType } from '@/schemas/ticket-price.schema';
import { UpdateTicketSchemaType } from '@/schemas/ticket.schema';
import { updateTicketPrice as updateTicketPriceAPI } from '@/services/tickets.service'
import { handleTicketError, TicketError } from './ticket.utility';

export async function updateTicketPriceAction(
  id: string,
  values: Partial<UpdateTicketPriceSchemaType>,
) {
  try {
    const ticket = await updateTicketPriceAPI(id, values);
    if (!ticket) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }

    if ('error' in ticket) {
      return { error: handleTicketError(ticket.error as TicketError) };
    }

    revalidatePath('/admin/tarifas');
    return { success: 'Precio ticket creado exitosamente' };
  }  catch (error: unknown) {
    console.error('Error desde el backend:', error);
    return {
      error: {
        code: 'SERVER_ERROR',
        message:
          (error as Error)?.message || 'Error inesperado en el servidor.',
      },
    };
  }
}
