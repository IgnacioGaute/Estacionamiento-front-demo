'use server';

import { otherPaymentSchema, OtherPaymentSchemaType } from '@/schemas/other-payment.schema';
import { createOtherPayment as createOtherPaymentAPI } from '@/services/expenses.service'

export async function createOtherPaymentAction(values: OtherPaymentSchemaType) {
  const validatedFields = otherPaymentSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Revisá la descripción, el importe y el medio.' };
  }

  try {
    const result = await createOtherPaymentAPI(validatedFields.data);

    if (!result) {
      return { error: 'No se pudo registrar el movimiento. Revisá la conexión e intentá de nuevo.' };
    }
    // El motivo real (por ejemplo, de qué caja sale el efectivo) en vez de un error genérico.
    if ('error' in result) return { error: result.error.message };
    return { success: 'Pago creado exitosamente' };
  } catch (error) {
    console.error(error);
    return { error: 'No se pudo registrar el movimiento. Revisá la conexión e intentá de nuevo.' };
  }
}
