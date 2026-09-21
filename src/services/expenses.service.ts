import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from "@/lib/auth";
import { OtherPaymentSchemaType, updateOtherPaymentSchemaType } from "@/schemas/other-payment.schema";
import { BoxList } from "@/types/box-list.type";
import { OtherPayment } from "@/types/other-payment.type";
import { getCacheTag } from "./cache-tags";
import { revalidateTag } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getExpenses = async (authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/box-lists/otherPayment`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('expenses', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as OtherPayment[]
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const createOtherPayment = async (
    values: OtherPaymentSchemaType,
    authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/box-lists/otherPayment`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
  
      const data = await response.json();
  
      if (response.ok) {
          revalidateTag(getCacheTag('expenses', 'all'));
        return data as OtherPayment;
      } else {
        console.error('Error en la respuesta:', data);
        return null;
      }
    } catch (error) {
      console.error('Error en create pago:', error);
      return null;
    }
  };

  
    export const updateExpense = async (
      id: string,
      customer: Partial<updateOtherPaymentSchemaType>, authToken?: string
    ) => {
      try {
        const response = await fetch(`${BASE_URL}/box-lists/otherPayment/${id}`, {
          method: 'PATCH',
          headers: await getAuthHeaders(authToken),
          body: JSON.stringify(customer),
        });
        const data = await response.json();
    
        if (response.ok) {
          revalidateTag(getCacheTag('expenses', 'all'));
          return data as OtherPayment;
        }  else {
          console.error(data);
          return {
            error: {
              code: data.code || 'UNKNOWN_ERROR',
              message: data.message || 'Error desconocido'
            },
          };
        }
      } catch (error) {
        console.error(error);
        return null;
      }
    };
    
    export const deleteExpense = async (id: string, authToken?: string) => {
      try {
        const response = await fetch(`${BASE_URL}/box-lists/otherPayment/${id}`, {
          headers: await getAuthHeaders(authToken),
          method: 'DELETE',
        });
        const data = await response.json();
    
        if (response.ok) {
          revalidateTag(getCacheTag('expenses', 'all'));
          return data;
        } else {
          console.error(data);
          return {
            error: {
              code: data.code || 'UNKNOWN_ERROR',
              message: data.message || 'Error desconocido'
            },
          };
        }
      } catch (error) {
        console.error(error);
        return null;
      }
    };
  
