'use server';

import { deleteTicketPriceBracket as deleteTicketPriceBracketAPI } from '@/services/tickets.service';

export async function deleteTicketPriceBracketAction(id: string) {
  try {
    const success = await deleteTicketPriceBracketAPI(id);
    if (!success) {
      return { error: 'Error al eliminar la franja de precio' };
    }
    return { success: 'Franja de precio eliminada exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar la franja de precio' };
  }
}
