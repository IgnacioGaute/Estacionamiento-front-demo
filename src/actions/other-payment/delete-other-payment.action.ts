'use server';

import { deleteExpense as deleteExpenseAPI } from '@/services/expenses.service';

export async function deleteExpenseAction(id: string) {
  try {
    const result = await deleteExpenseAPI(id);
    if (!result) {
      return { error: 'Error al eliminar el gasto' };
    }
    // Un error del backend vuelve como objeto: antes se tomaba como éxito y mostraba «eliminado».
    if (result && typeof result === 'object' && 'error' in result) return { error: result.error.message };
    return { success: 'Gasto eliminado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar el gasto' };
  }
}
