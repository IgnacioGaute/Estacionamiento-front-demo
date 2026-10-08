'use server';
import { tenantFetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ComisionesCaja, ConfiguracionComisiones } from '@/types/box-list.type';

async function consultar(method: 'GET' | 'PATCH', datos?: ComisionesCaja) {
  const response = await tenantFetch(`${process.env.NEXT_PUBLIC_API_URL}/box-lists/comisiones`, {
    method, headers: await getAuthHeaders(), cache: 'no-store',
    ...(datos ? { body: JSON.stringify(datos) } : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join('. ') : body.message ?? 'No se pudieron consultar las comisiones.');
  return body as ConfiguracionComisiones;
}
export async function getComisionesCajaAction() {
  try { return { datos: await consultar('GET') }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo cargar la configuración.' }; }
}
export async function guardarComisionesCajaAction(datos: ComisionesCaja) {
  try {
    const guardado = await consultar('PATCH', datos);
    revalidatePath('/admin/caja');
    revalidatePath('/admin/configuracion/mercadopago');
    revalidatePath('/admin/configuracion/mercadopago/comisiones');
    return { datos: guardado };
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudieron guardar las comisiones.' }; }
}
