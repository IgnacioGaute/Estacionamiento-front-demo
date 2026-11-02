import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import type { AvanceConfiguracion, EstadoConfiguracionInicial } from '@/types/configuracion-inicial.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// El backend responde { code, message } en los rechazos (paso obligatorio, configuración incompleta).
async function leerError(response: Response, porDefecto: string): Promise<string> {
  try {
    const data = await response.json();
    return Array.isArray(data?.message) ? data.message.join('. ') : (data?.message ?? porDefecto);
  } catch {
    return porDefecto;
  }
}

export async function getConfiguracionInicial(): Promise<EstadoConfiguracionInicial> {
  const response = await fetch(`${BASE_URL}/configuracion-inicial`, { headers: await getAuthHeaders() });
  if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar la configuración de la playa.'));
  return response.json();
}

async function patch(ruta: string, cuerpo: object, porDefecto: string): Promise<EstadoConfiguracionInicial> {
  const response = await fetch(`${BASE_URL}/configuracion-inicial/${ruta}`, {
    method: 'PATCH',
    headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (!response.ok) throw new Error(await leerError(response, porDefecto));
  return response.json();
}

export const guardarPlayaConfiguracion = (datos: { nombre?: string; direccion?: string }) =>
  patch('playa', datos, 'No se pudieron guardar los datos de la playa.');

export const avanzarConfiguracion = (cambio: AvanceConfiguracion) =>
  patch('avance', cambio, 'No se pudo guardar el avance.');
