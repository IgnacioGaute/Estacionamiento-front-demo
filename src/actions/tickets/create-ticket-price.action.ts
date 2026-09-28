'use server';

import { revalidatePath } from 'next/cache';

import { ticketPriceSchema, TicketPriceSchemaType } from '@/schemas/ticket-price.schema';
import { ticketSchema, TicketSchemaType } from '@/schemas/ticket.schema';
import { createTicketPrice as createTicketPriceAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function createTicketPriceAction(values: TicketPriceSchemaType) {
  const validatedFields = ticketPriceSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const ticket = await createTicketPriceAPI(validatedFields.data);

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
