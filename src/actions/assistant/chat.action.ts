'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
export async function assistantChatAction(message: string, screen: string, conversationId?: string, screenContext?: string): Promise<{ answer?: string; conversationId?: string; consulted?: string[]; error?: string }> {
  if (!message.trim() || message.length > 1500) return { error: 'Escribí una pregunta de hasta 1500 caracteres.' };
  try {
    const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/assistant/chat`, {
      method: 'POST', headers: await getAuthHeaders(), cache: 'no-store',
      body: JSON.stringify({ message, screen: screen.slice(0, 160), conversationId, screenContext: screenContext?.slice(0, 8000) }), signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok) return { error: typeof data.message === 'string' ? data.message : 'No se pudo consultar el asistente.' };
    return data;
  } catch { return { error: 'No pudimos conectar. Tu pregunta sigue escrita para que puedas reintentar.' }; }
}
