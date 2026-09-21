 'use server';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { pricingOptionsSchema } from '@/schemas/pricing-options.schema';
import type { PricingOptions } from '@/types/pricing-options.type';
export async function savePricingOptionsAction(values: PricingOptions) {
  const parsed = pricingOptionsSchema.safeParse(values);
  if (!parsed.success) return { error: 'Completá los precios y tiempos con números válidos. No dejes precios vacíos.' };
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/schedule-settings`, { method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify({ pricingOptions: parsed.data }) });
    const data = await response.json();
    if (!response.ok) return { error: Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo guardar.' };
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch { return { error: 'No se pudo guardar. Revisá la conexión e intentá nuevamente.' }; }
}
