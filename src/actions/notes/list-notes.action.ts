'use server';
import { getNotes } from '@/services/notes.service';
import type { FiltrosAvisos } from '@/types/note.type';
export async function listNotesAction(page: number, search: string, filtros: FiltrosAvisos = {}) {
  const result = await getNotes(undefined, page, search, filtros);
  if (!result) throw new Error('No se pudieron cargar los avisos.');
  return result;
}
