'use server';
import { eliminarEstadia } from '@/services/tickets.service';

export async function eliminarEstadiaAction(id: string): Promise<{ ok?: true; error?: string }> {
  try { return await eliminarEstadia(id); }
  catch { return { error: 'No se pudo eliminar la estadía. Revisá la conexión e intentá de nuevo.' }; }
}
