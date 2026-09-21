import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import { OpenTurnoSchemaType, CloseTurnoSchemaType } from "@/schemas/turno.schema";
import { CashContext, Turno } from "@/types/turno.type";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getMyOpenTurno = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/turnos/mine/open`, {
      headers: await getAuthHeaders(authToken),
      cache: 'no-store',
    });
    const data = await response.json();

    if (response.ok) {
      return (data as Turno) ?? null;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const openTurno = async (payload: OpenTurnoSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/turnos/open`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok) {
      return data as Turno;
    } else {
      console.error(data);
      return { error: { code: data.code || 'UNKNOWN_ERROR', message: data.message || 'Error desconocido' } };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const closeTurno = async (id: string, payload: CloseTurnoSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/turnos/${id}/close`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok) {
      return data as Turno;
    } else {
      console.error(data);
      return { error: { code: data.code || 'UNKNOWN_ERROR', message: data.message || 'Error desconocido' } };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export async function getCashContext(): Promise<CashContext> {
  const response = await fetch(`${BASE_URL}/turnos/caja`, { headers: await getAuthHeaders(), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo consultar la caja.');
  return data;
}
export async function getTurnos(filtros: { desde?: string; hasta?: string; usuarioId?: string; estado?: 'ABIERTO' | 'CERRADO'; fechaPor?: 'APERTURA' | 'CIERRE' } = {}): Promise<Turno[]> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.fechaPor) params.set('fechaPor', filtros.fechaPor);
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId);
  const query = params.toString();
  const response = await fetch(`${BASE_URL}/turnos${query ? `?${query}` : ''}`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo consultar el historial de turnos.');
  return response.json();
}

export async function getOperadores(): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const response = await fetch(`${BASE_URL}/turnos/operadores`, { headers: await getAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo consultar los operadores.');
  return response.json();
}
