'use server';

import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { pricingOptionsSchema } from '@/schemas/pricing-options.schema';
import { tariffForVehicle, validateTariffDraft } from '@/utils/tariff-plan.utils';
import type { TariffDraft, TariffPlan } from '@/types/tariff-plan.type';
import type { PricingPreviewResult } from '@/types/pricing-options.type';

type PlanResponse = { plan?: TariffPlan; error?: string; conflict?: boolean };
const message = (data: { message?: string | string[] }, fallback: string) =>
  Array.isArray(data.message) ? data.message.join('. ') : data.message || fallback;

export async function getTariffPlanAction(): Promise<PlanResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/tariff-plan`, { headers: await getAuthHeaders() });
    const data = await response.json();
    if (!response.ok) return { error: message(data, 'No se pudieron cargar las tarifas.') };
    return { plan: data };
  } catch { return { error: 'No se pudieron cargar las tarifas. Revisá la conexión e intentá nuevamente.' }; }
}
export async function saveTariffPlanAction(expectedRevision: string, plan: TariffDraft): Promise<PlanResponse> {
  const errors = validateTariffDraft(plan);
  if (errors.length || !pricingOptionsSchema.safeParse(plan.schedule.pricingOptions).success) return { error: errors[0] || 'Revisá los precios y las reglas de cobro.' };
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/tariff-plan`, {
      method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify({ expectedRevision, schedule: plan.schedule, brackets: plan.brackets }),
    });
    const data = await response.json();
    if (!response.ok) return { error: message(data, 'No se pudieron aplicar las tarifas.'), conflict: response.status === 409 };
    revalidatePath('/', 'layout');
    return { plan: data };
  } catch { return { error: 'No se pudieron aplicar las tarifas. Tu borrador se conserva; revisá la conexión e intentá nuevamente.' }; }
}
export async function simulateTariffPlanAction(vehicleType: string, entryAt: string, elapsedMinutes: number, plan?: TariffDraft): Promise<{ result?: PricingPreviewResult; error?: string }> {
  if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(vehicleType) || !Number.isInteger(elapsedMinutes) || elapsedMinutes < 0 || elapsedMinutes > 5256000 || !Number.isFinite(Date.parse(entryAt))) return { error: 'Revisá el vehículo, la hora de entrada y la permanencia.' };
  if (plan) {
    plan = tariffForVehicle(plan, vehicleType);
    const errors = validateTariffDraft(plan);
    if (errors.length || !pricingOptionsSchema.safeParse(plan.schedule.pricingOptions).success) return { error: errors[0] || 'Completá el borrador antes de simular.' };
  }
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/tariff-plan/simulate`, {
      method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ vehicleType, entryAt, elapsedMinutes, ...(plan ? { plan: { schedule: plan.schedule, brackets: plan.brackets } } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) return { error: message(data, 'No se pudo calcular el ejemplo.') };
    return { result: data };
  } catch { return { error: 'No se pudo calcular. Revisá la conexión e intentá nuevamente.' }; }
}

