'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { sanitizePlateInput } from '@/utils/plate.utils';
import type { PlateStatus } from '@/types/plate-status.type';

export async function getPlateStatusAction(rawPlate: string): Promise<{ data: PlateStatus; error?: never } | { error: string; data?: never }> {
  const plate = sanitizePlateInput(rawPlate);
  if (!plate || plate.length > 50) return { error: 'No se pudo leer una patente válida. Probá de nuevo.' };
  try {
    const response = await tenantFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tickets/registrations/plate-status/${encodeURIComponent(plate)}`,
      { headers: await getAuthHeaders(), cache: 'no-store' },
    );
    if (!response.ok) return { error: 'No se pudo consultar si el vehículo está activo. Intentá nuevamente.' };
    const data = await response.json();
    if (!data || data.plate !== plate || !Array.isArray(data.hourly) || !Array.isArray(data.daily)) {
      return { error: 'No se pudo verificar la patente. Intentá nuevamente.' };
    }
    return { data };
  } catch {
    return { error: 'No se pudo conectar para consultar el vehículo. Intentá nuevamente.' };
  }
}
