import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import { OtherPaymentSchemaType } from "@/schemas/other-payment.schema";
import { BoxList, BoxListResponse } from "@/types/box-list.type";
import { OtherPayment } from "@/types/other-payment.type";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


export const findBoxByDate = async (date: string, authToken?: string): Promise<BoxListResponse | null> => {
  try {
    const response = await fetch(`${BASE_URL}/box-lists/date/${date}`, {
      headers: await getAuthHeaders(authToken),
    });

    if (!response.ok) {
      console.warn(`No se encontró BoxList para la fecha: ${date}`);
      return null;
    }

    const data = await response.json();

    if (!data || Object.keys(data).length === 0 || !data.data) {
      console.warn(`No hay datos disponibles para la fecha: ${date}`);
      return null;
    }

    return data as BoxListResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error al obtener BoxList: ${error.message}`);
    } else {
      console.error("Error desconocido al obtener BoxList", error);
    }
    return null;
  }
};


export const updateBoxByDate = async (
  date: string,
  totalPrice: number,
  authToken?: string
): Promise<BoxList | null> => {
  try {
    const response = await fetch(`${BASE_URL}/box-lists/update-by-date/${date}`, {
      method: "PATCH",
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify({ totalPrice }),
    });

    if (!response.ok) {
      console.error(`❌ Error al actualizar BoxList para la fecha: ${date}`);
      return null;
    }

    const data = await response.json();
    return data as BoxList;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error al actualizar BoxList: ${error.message}`);
    } else {
      console.error("Error desconocido al actualizar BoxList", error);
    }
    return null;
  }
};
