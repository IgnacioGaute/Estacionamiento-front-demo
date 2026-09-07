import { getAuthHeaders } from "@/lib/auth";
import { OpenTurnoSchemaType, CloseTurnoSchemaType } from "@/schemas/turno.schema";
import { Turno } from "@/types/turno.type";

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
