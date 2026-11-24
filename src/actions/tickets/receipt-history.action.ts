'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
// Una estadía del día con sus comprobantes. `patente`, `vehicleType`, `entryTime` y `exitTime` (HH:MM)
// pueden faltar en respuestas de versiones anteriores del servidor.
export type FilaComprobante = {
  id: string; identification: string; type: string; departed: boolean; time: string;
  entryOperatorName: string | null; exitOperatorName: string | null;
  patente?: string | null; vehicleType?: string | null; entryTime?: string | null; exitTime?: string | null;
};
export type ConteoComprobantes = { todas: number; adentro: number; salieron: number };

// `estado`: 'ADENTRO' o 'SALIO'; sin él, todas.
export async function receiptHistoryAction(date: string, search: string, page: number, estado?: 'ADENTRO' | 'SALIO') {
  const params = new URLSearchParams({ date, search, page: String(page), limit: '20', ...(estado ? { estado } : {}) });
  const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/receipt-history?${params}`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron consultar los comprobantes.');
  return response.json() as Promise<{ data: FilaComprobante[]; meta: { totalItems: number }; conteo?: ConteoComprobantes }>;
}
