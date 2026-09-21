 'use server';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
export type VehicleTypeItem = { code: string; name: string; enabled: boolean };
const base = process.env.NEXT_PUBLIC_API_URL;
export async function getVehicleTypesAction(): Promise<VehicleTypeItem[]> {
  const response = await fetch(`${base}/tickets/vehicle-types`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron cargar los tipos de vehículo.');
  return response.json();
}
export async function saveVehicleTypeAction(code: string | null, values: { code?: string; name?: string; enabled?: boolean }) {
  try {
    const response = await fetch(`${base}/tickets/vehicle-types${code ? '/' + encodeURIComponent(code) : ''}`, { method: code ? 'PATCH' : 'POST', headers: await getAuthHeaders(), body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) return { error: Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo guardar.' };
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch { return { error: 'No se pudo guardar el tipo de vehículo.' }; }
}
