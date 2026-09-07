
import { revalidateTag } from "next/cache";
import { getCacheTag } from "./cache-tags";
import { PaginatedResponse } from "@/types/paginated-response.type";
import { Customer, CustomerType } from "@/types/cutomer.type";
import { CustomerSchemaType, UpdateCustomerSchemaType } from "@/schemas/customer.schema";
import { InterestSchemaType } from "@/schemas/interest-schema";
import { Interest } from "@/types/interest.type";
import { getAuthHeaders } from "@/lib/auth";
import { AmountCustomerSchemaType } from "@/schemas/amount-customer.schema";
import { AmountCustomer } from "@/types/amount-customer.type";
import { ReceiptSchemaType } from "@/schemas/receipt.schema";
import { OwnerParkingType } from "@/types/owner-parking-type";
import { RenterParkingType } from "@/types/renter-parking-type";
import { OwnerParkingTypeSchemaType, UpdateOwnerParkingTypeSchemaType } from "@/schemas/owner-parking-type.schema";
import { RenterParkingTypeSchemaType, UpdateRenterParkingTypeSchemaType } from "@/schemas/renter-parking-type.schema";
import { Receipt } from "@/types/receipt.type";
import { ParkingOwner } from "@/types/parking-owner.type";



const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


export const getCustomers = async (customer: CustomerType, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/customer/${customer}`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('customers', 'all'),getCacheTag('receipts', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Customer[]
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getCustomerById = async (customerId:string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/${customerId}`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('customers', 'single', customerId),getCacheTag('receipts', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Customer;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const createCustomer = async (
    values: CustomerSchemaType, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/customers`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
  
      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('customers', 'all'));
        return data as Customer;
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
      console.error('Error en create customers:', error);
      return null;
    }
  };


  export const updateCustomer = async (
    id: string,
    customer: Partial<UpdateCustomerSchemaType>, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/${id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(customer),
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('customers', 'all'));
        return data as Customer;
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
  
  export const deleteCustomer = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('customers', 'all'));
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

  export const softDeleteCustomer = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/softDelete/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('customers', 'all'));
        return data;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
      
    }
  };

  export const restoredCustomer = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/restoredCustomer/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'PATCH',
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('customers', 'all'));
        return data;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  type ReceiptResponse =
  | { receiptNumber: string; success?: true; barcode: string } // respuesta exitosa
  | { error: { code: string; message: string }; success?: false }; // error

  
  export const historialReceipts = async (
    receiptId: string,
    customerId: string,
    values: ReceiptSchemaType
  ): Promise<ReceiptResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // ⏳ 10 segundos
  
    try {
      const response = await fetch(
        `${BASE_URL}/receipts/${receiptId}/customers/${customerId}`,
        {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
          signal: controller.signal,
        }
      );
  
      clearTimeout(timeout);
  
      const data = await response.json();
  
      if (response.ok) {
        return {
          receiptNumber: data.receiptNumber,
          success: true,
          barcode: data.barcode
        };
      } else {
        console.error(data);
        return {
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Error desconocido',
          },
          success: false,
        };
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("❌ Error en historialReceipts:", error);
      return {
        error: {
          code: 'NETWORK_ERROR',
          message:
            (error as any)?.name === 'AbortError'
              ? 'Tiempo de espera agotado (timeout)'
              : 'Ocurrió un error al conectar con el servidor.',
        },
        success: false,
      };
    }
  };
  

  export const cancelReceipt = async (
    customerId: string,
    receiptId: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/receipts/cancelReceipt/${receiptId}/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data
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
  
  export const generateReceiptsManual = async (
    customer: CustomerType,
    dateNow?: string,
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/receipts/generate-manual/${customer}`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({dateNow}),
      });
      const data = await response.json();
  
      if (response.ok) {
        return data
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


  export const findAllPendingReceipts = async (
    customer: CustomerType
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/receipts/${customer}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Receipt[]
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

    export const findReceipts = async (
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/receipts`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Receipt[]
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const createInterest = async (
    values: InterestSchemaType, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/interestSetting`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('interests', 'all'));
        return data as Interest;
      } else {
        console.error('Error en la respuesta:', data);
        return null;
      }
    } catch (error) {
      console.error('Error en create intereses:', error);
      return null;
    }
  }

  export const getinterests = async ( authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/interestSetting/interest`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('interests', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Interest[];
      } else {
        console.error(data);
        return [];
      }
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  export const updateAmountCustomer = async (
    customer: Partial<AmountCustomerSchemaType>, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/renters/amount`, {
        method: 'PATCH',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(customer),
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as AmountCustomer;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getOwnerParkingTypes = async (authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/owner-types`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('ownerParkingTypes', 'all')],
        },
      });
      const data = await response.json();

      if (response.ok) {
        return data as PaginatedResponse<OwnerParkingType>;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const createOwnerParkingType = async (
    values: OwnerParkingTypeSchemaType, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/owner-types`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('ownerParkingTypes', 'all'));
        return data as OwnerParkingType;
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
      console.error('Error en create ownerParkingTypes:', error);
      return null;
    }
  };

  export const updateOwnerParkingType = async (
    id: string,
    values: Partial<UpdateOwnerParkingTypeSchemaType>, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/owner-types/${id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('ownerParkingTypes', 'all'));
        return data as OwnerParkingType;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const deleteOwnerParkingType = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/owner-types/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('ownerParkingTypes', 'all'));
        return data;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getRenterParkingTypes = async (authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/renter-types`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('renterParkingTypes', 'all')],
        },
      });
      const data = await response.json();

      if (response.ok) {
        return data as PaginatedResponse<RenterParkingType>;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const createRenterParkingType = async (
    values: RenterParkingTypeSchemaType, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/renter-types`, {
        method: 'POST',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('renterParkingTypes', 'all'));
        return data as RenterParkingType;
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
      console.error('Error en create renterParkingTypes:', error);
      return null;
    }
  };

  export const updateRenterParkingType = async (
    id: string,
    values: Partial<UpdateRenterParkingTypeSchemaType>, authToken?: string
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/renter-types/${id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(authToken),
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('renterParkingTypes', 'all'));
        return data as RenterParkingType;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const deleteRenterParkingType = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/renter-types/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        revalidateTag(getCacheTag('renterParkingTypes', 'all'));
        return data;
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  export const getOwnersAvailableForRent = async (authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/parking/owners/for-rent`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('customers', 'all')],
        },
      });
      const data = await response.json();

      if (response.ok) {
        return data as ParkingOwner[]
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

    export const getCustomerThird= async (authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/customers/thirds`, {
        headers: await getAuthHeaders(authToken),
        next: {
          tags: [getCacheTag('customers', 'all')],
        },
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as Customer[]
      } else {
        console.error(data);
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };


    export const deleteReceipt = async (id: string, authToken?: string) => {
    try {
      const response = await fetch(`${BASE_URL}/receipts/${id}`, {
        headers: await getAuthHeaders(authToken),
        method: 'DELETE',
      });
      const data = await response.json();
  
      if (response.ok) {
        revalidateTag(getCacheTag('receipts', 'all'));
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


