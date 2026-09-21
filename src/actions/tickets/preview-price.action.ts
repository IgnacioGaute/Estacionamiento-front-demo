 'use server';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { previewTicketPrice } from '@/services/tickets.service';
import { pricingOptionsSchema } from '@/schemas/pricing-options.schema';
import type { PricingOptions, PricingPreviewResult } from '@/types/pricing-options.type';
export async function previewPricesAction(vehicle: string, day: 'DAY' | 'NIGHT', minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 525600) return { error: 'Ingresá una duración válida.' };
  try { const durations = [...new Set([30, 60, 90, minutes])].sort((a,b) => a-b); return { rows: await Promise.all(durations.map(async duration => ({ duration, ...await previewTicketPrice(vehicle, day, duration) }))) }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo calcular.' }; }
}
export async function simulateStayAction(vehicleType: string, entryAt: string, elapsedMinutes: number, pricingOptions?: PricingOptions): Promise<{ result?: PricingPreviewResult; error?: string }> {
  if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(vehicleType) || !Number.isInteger(elapsedMinutes) || elapsedMinutes < 0 || elapsedMinutes > 5256000 || !Number.isFinite(Date.parse(entryAt))) return { error: 'Revisá el vehículo, la entrada y el tiempo de permanencia.' };
  if (pricingOptions && !pricingOptionsSchema.safeParse(pricingOptions).success) return { error: 'Completá los precios de las opciones antes de probarlas.' };
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/priceBrackets/simulate`, { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ vehicleType, entryAt, elapsedMinutes, pricingOptions }), cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) return { error: Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo calcular.' };
    return { result: data };
  } catch { return { error: 'No se pudo calcular. Revisá la conexión e intentá nuevamente.' }; }
}
