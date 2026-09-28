'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
export async function receiptHistoryAction(date: string, search: string, page: number) {
  const params = new URLSearchParams({ date, search, page: String(page), limit: '20' });
  const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/receipt-history?${params}`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron consultar los comprobantes.');
  return response.json() as Promise<{ data: { id: string; identification: string; type: string; departed: boolean; time: string }[]; meta: { totalItems: number } }>;
}
