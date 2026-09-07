'use server';

import { AdvancePaymentSchemaType, advancePaymentSchema } from '@/schemas/ticket-price-bracket.schema';
import { addAdvancePayment as addAdvancePaymentAPI } from '@/services/tickets.service';
import { handleTicketError, TicketError } from './ticket.utility';

export async function addAdvancePaymentAction(id: string, values: AdvancePaymentSchemaType) {
  const validatedFields = advancePaymentSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const registration = await addAdvancePaymentAPI(id, validatedFields.data);

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

    return { success: 'Cobro por adelantado registrado exitosamente' };
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
