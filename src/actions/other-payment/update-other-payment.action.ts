'use server';

import { updateOtherPaymentSchemaType } from '@/schemas/other-payment.schema';
import { updateExpense as updateExpenseAPI } from '@/services/expenses.service'

export async function updateExpenseAction(
  id: string,
  values: Partial<updateOtherPaymentSchemaType>,
) {
  try {
    const result = await updateExpenseAPI(id, values);
    if (!result) {
      return { error: 'Error al editar el gasto' };
    }
    // Un error del backend vuelve como objeto: antes se tomaba como éxito y mostraba «editado».
    if ('error' in result) return { error: result.error.message };
    return { success: 'Gasto editado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al editar el gasto' };
  }
}
