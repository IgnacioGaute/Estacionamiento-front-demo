'use server';

import { retireOverdueRegistrations } from '@/services/tickets.service';

export async function retireOverdueRegistrationsAction(ids: string[]) {
  try {
    const result = await retireOverdueRegistrations(ids);
    if (!result) {
      return { error: 'Error al eliminar los tickets vencidos' };
    }
    if ('error' in result) {
      return { error: result.error?.message || 'Error al eliminar los tickets vencidos' };
    }
    return { success: `${result.affected ?? ids.length} tickets vencidos eliminados` };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar los tickets vencidos' };
  }
}
