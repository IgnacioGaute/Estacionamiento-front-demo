'use server';
import { getNotes } from '@/services/notes.service';
export async function listNotesAction(page: number, search: string) {
  const result = await getNotes(undefined, page, search);
  if (!result) throw new Error('No se pudieron cargar los avisos.');
  return result;
}
