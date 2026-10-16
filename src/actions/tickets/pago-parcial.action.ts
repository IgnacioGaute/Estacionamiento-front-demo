'use server';

import { revalidateTag } from 'next/cache';
import { getAuthHeaders } from '@/lib/auth';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getCacheTag } from '@/services/cache-tags';
import type { CloseSummary } from '@/services/tickets.service';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// La parte en efectivo de un pago híbrido cuyo resto va por QR o alias: se registra sin la salida
// y devuelve el resumen con el saldo que queda, que es lo que piden después el QR o el alias.
export async function pagoParcialEfectivoAction(id: string, valores: { importe: number; expectedPrice: number; expectedCollected: number }): Promise<{ summary?: CloseSummary; error?: string; code?: string }> {
  if (!Number.isInteger(valores.importe) || valores.importe <= 0) return { error: 'Ingresá cuánto entrega en efectivo.' };
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/pago-parcial`, {
      method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(valores),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return { code: data?.code, error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo cobrar el efectivo.' };
    revalidateTag(getCacheTag('tickets', 'all'));
    return { summary: data as CloseSummary };
  } catch {
    return { error: 'No se pudo cobrar el efectivo. Revisá la conexión e intentá de nuevo.' };
  }
}
