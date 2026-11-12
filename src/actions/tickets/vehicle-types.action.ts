 'use server';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { FalloBackend, leerRespuesta, mensajeDeFallo, serializarFallo, type FalloSerializado } from '@/lib/fallos-backend';
export type VehicleTypeItem = { code: string; name: string; enabled: boolean };
const base = process.env.NEXT_PUBLIC_API_URL;
export async function getVehicleTypesAction(): Promise<VehicleTypeItem[]> {
  const response = await fetch(`${base}/tickets/vehicle-types`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron cargar los tipos de vehículo.');
  return response.json();
}
// Para la interfaz: el fallo vuelve como datos (categoría y Retry-After) para decidir si reintentar
// solo. Una acción que lanza llega al navegador como un error genérico sin esa información.
export async function cargarTiposDeVehiculoAction(): Promise<{ tipos: VehicleTypeItem[] } | { error: string; fallo: FalloSerializado }> {
  try {
    const response = await fetch(`${base}/tickets/vehicle-types`, { headers: await getAuthHeaders(), cache: 'no-store' });
    const tipos = await leerRespuesta<VehicleTypeItem[]>(response, 'GET /tickets/vehicle-types', 'No pudimos cargar los tipos de vehículo.');
    if (!Array.isArray(tipos)) throw new FalloBackend('No pudimos cargar los tipos de vehículo.', { categoria: 'respuesta-invalida' });
    return { tipos };
  } catch (error) {
    return { error: mensajeDeFallo(error, 'No pudimos cargar los tipos de vehículo.'), fallo: serializarFallo(error) };
  }
}
export async function saveVehicleTypeAction(code: string | null, values: { code?: string; name?: string; enabled?: boolean }) {
  try {
    const response = await fetch(`${base}/tickets/vehicle-types${code ? '/' + encodeURIComponent(code) : ''}`, { method: code ? 'PATCH' : 'POST', headers: await getAuthHeaders(), body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) return { error: Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo guardar.' };
    revalidatePath('/admin/configuracion/vehiculos');
    revalidatePath('/admin/tarifas');
    revalidatePath('/tickets');
    return { success: true };
  } catch { return { error: 'No se pudo guardar el tipo de vehículo.' }; }
}
