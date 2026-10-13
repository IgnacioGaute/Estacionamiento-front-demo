'use server';
import { corregirEntrada } from '@/services/tickets.service';
import type { CloseSummary } from '@/services/tickets.service';

export async function corregirEntradaAction(id: string, entrada: string): Promise<{ summary?: CloseSummary; error?: string }> {
  if (Number.isNaN(Date.parse(entrada))) return { error: 'Indicá la hora en que entró.' };
  try { return await corregirEntrada(id, entrada); }
  catch { return { error: 'No se pudo corregir la entrada. Revisá la conexión e intentá de nuevo.' }; }
}
