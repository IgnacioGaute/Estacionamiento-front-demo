import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import type {
  Correccion, CorreccionPayload, DetalleOperacion, FiltrosHistorial, HistorialMovimientos, PrevisualizacionCorreccion,
  ResultadoApi, TransferenciasParaCorreccion,
} from '@/types/operaciones.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Las respuestas de error de la API: { code, message } o el arreglo de class-validator.
async function resultado<T>(response: Response, porDefecto: string): Promise<ResultadoApi<T>> {
  const data = await response.json().catch(() => null);
  if (response.ok) return { data: data as T };
  const mensaje = Array.isArray(data?.message) ? data.message.join('. ') : typeof data?.message === 'string' ? data.message : porDefecto;
  return { error: mensaje, code: typeof data?.code === 'string' ? data.code : undefined };
}

export async function historialMovimientos(filtros: FiltrosHistorial, limit = 20) {
  const url = new URL(`${BASE_URL}/operaciones`);
  for (const [clave, valor] of Object.entries({ ...filtros, limit })) if (valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor));
  const response = await fetch(url.toString(), { headers: await getAuthHeaders(), cache: 'no-store' });
  return resultado<HistorialMovimientos>(response, 'No se pudieron consultar los movimientos.');
}

export async function detalleOperacion(tipo: 'ESTADIA' | 'PASE', id: string) {
  const response = await fetch(`${BASE_URL}/operaciones/${tipo === 'PASE' ? 'pases' : 'estadias'}/${id}`, { headers: await getAuthHeaders(), cache: 'no-store' });
  return resultado<DetalleOperacion>(response, 'No se pudo consultar la operación.');
}

export async function transferenciasParaCorreccion(movimientoId: string, importe?: number) {
  const url = new URL(`${BASE_URL}/operaciones/correcciones/transferencias`);
  url.searchParams.set('movimientoId', movimientoId);
  if (importe) url.searchParams.set('importe', String(importe));
  const response = await fetch(url.toString(), { headers: await getAuthHeaders(), cache: 'no-store' });
  return resultado<TransferenciasParaCorreccion>(response, 'No se pudieron buscar las transferencias.');
}

export async function previsualizarCorreccion(payload: CorreccionPayload) {
  const response = await fetch(`${BASE_URL}/operaciones/correcciones/previsualizar`, { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload) });
  return resultado<PrevisualizacionCorreccion>(response, 'No se pudo revisar la corrección.');
}

export async function corregir(payload: CorreccionPayload) {
  const response = await fetch(`${BASE_URL}/operaciones/correcciones`, { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload) });
  return resultado<Correccion>(response, 'No se pudo guardar la corrección.');
}

export async function resolverCorreccion(id: string, payload: { accion: 'APLICAR' | 'RECHAZAR'; resolucion: string; version?: string; operacionId?: string }) {
  const response = await fetch(`${BASE_URL}/operaciones/correcciones/${id}`, { method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify(payload) });
  return resultado<Correccion>(response, 'No se pudo resolver la corrección.');
}
