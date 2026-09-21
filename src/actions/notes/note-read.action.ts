'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';

export async function unreadNotesAction(): Promise<string[]> {
  const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/notes/unread`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron consultar los avisos pendientes.');
  return response.json();
}
export async function readNoteAction(id: string) {
  const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/notes/${encodeURIComponent(id)}/read`, { method: 'POST', headers: await getAuthHeaders() });
  if (!response.ok) throw new Error('No se pudo marcar el aviso como leído.');
}
