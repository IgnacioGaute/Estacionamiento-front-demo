import { DiscountRegistrationPayload } from '@/schemas/discount-registration.schema';
import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import type { ReceiptDeliverySettings } from '@/types/parking-receipt.type';
import type { PricingOptions, PricingPreviewResult } from '@/types/pricing-options.type';
import { TicketRegistration } from "@/types/ticket-registration.type";
import { getCacheTag } from "./cache-tags";
import { PaginatedResponse } from "@/types/paginated-response.type";
import { Ticket } from "@/types/ticket.type";
import { TicketSchemaType, UpdateTicketSchemaType } from "@/schemas/ticket.schema";
import { revalidateTag } from "next/cache";
import { getAuthHeaders } from "@/lib/auth";
import { TicketPriceSchemaType, UpdateTicketPriceSchemaType } from "@/schemas/ticket-price.schema";
import { ticketPrice } from "@/types/ticket-price";
import { TicketScheduleSchemaType } from "@/schemas/ticket-schedule.schema";
import { TicketPriceBracket } from "@/types/ticket-price-bracket.type";
import { TicketPriceBracketSchemaType, UpdateTicketPriceBracketSchemaType, AdvancePaymentSchemaType } from "@/schemas/ticket-price-bracket.schema";
import { EntryByPlateSchemaType } from "@/schemas/entry-by-plate.schema";
import { CloseRegistrationSchemaType } from "@/schemas/close-registration.schema";
import { FrequentCustomer } from "@/types/frequent-customer.type";
import { TicketRegistrationForDay } from "@/types/ticket-registration-for-day.type";
import { TicketRegistrationForDaySchemaType } from "@/schemas/ticket-registration-for-day.schema";
export async function getFrequentCustomersPage(filters: FrequentCustomersFilters, authToken?: string) {
  const url = new URL(`${BASE_URL}/tickets/registrations/frequent`);
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), { headers: await getAuthHeaders(authToken), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron consultar los clientes frecuentes.');
  return response.json() as Promise<{ data: FrequentCustomer[]; meta: { totalItems: number } }>;
}
export async function getFrequentCustomers(filters: FrequentCustomersFilters, authToken?: string) {
  return (await getFrequentCustomersPage(filters, authToken)).data;
}
export type TicketSchedule = { dayStartHour: number; dayEndHour: number; graceMinutes: number; barcodeTicketsEnabled: boolean; shiftsEnabled?: boolean; multipleShiftsEnabled?: boolean; sueldoAutomatico?: boolean; sueldoPorTurno?: number; sueldosPorUsuario?: { usuarioId: string; importe: number }[]; pricingDayTypeBasis?: 'ENTRY' | 'EXIT'; pricingOptions?: PricingOptions | null; receiptDelivery?: ReceiptDeliverySettings };



const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getTicketsPrice = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/ticketsPrice`, {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('ticketsPrice', 'all')],
      },
    });
    const data = await response.json();

    if (response.ok) {
      return data as PaginatedResponse<ticketPrice>;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};


export const createTicketPrice = async (ticket: TicketPriceSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/ticketsPrice`, {
      method: 'POST',
        headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('ticketsPrice', 'all'));
      return data as Ticket;
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

export const updateTicketPrice = async (
  id: string,
  ticket: Partial<UpdateTicketPriceSchemaType>,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/ticketsPrice/${id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('ticketsPrice', 'all'));
    revalidateTag(getCacheTag('tickets', 'all'));
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data;
  } catch (error) {
    console.error('Error en updateUser:', error);
    throw error;
  }
};

export const deleteTicketPrice = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/ticketsPrice/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('ticketsPrice', 'all'));
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


export const getTicketSchedule = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/schedule-settings`, {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('ticketSchedule', 'all')],
      },
    });
    const data = await response.json();

    if (response.ok) {
      return data as TicketSchedule;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateTicketSchedule = async (schedule: Partial<TicketScheduleSchemaType> & { barcodeTicketsEnabled?: boolean; shiftsEnabled?: boolean; multipleShiftsEnabled?: boolean; sueldoAutomatico?: boolean; sueldoPorTurno?: number; sueldosPorUsuario?: { usuarioId: string; importe: number }[] }, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/schedule-settings`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(schedule),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('ticketSchedule', 'all'));
      return data as TicketSchedule;
    } else {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getTickets = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets`, {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('tickets', 'all')],
      },
    });
    const data = await response.json();

    if (response.ok) {
      return data as PaginatedResponse<Ticket>;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};


export const createTicket = async (ticket: TicketSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
        headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('tickets', 'all'));
      return data as Ticket;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateTicket = async (
  id: string,
  ticket: Partial<UpdateTicketSchemaType>,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/${id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('tickets', 'all'));
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data;
  } catch (error) {
    console.error('Error en updateUser:', error);
    throw error;
  }
};

export const deleteTicket = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('tickets', 'all'));
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

export const getTicketRegistrations = async (authToken?: string) => getOperationalRecords<TicketRegistration>('registrations', authToken);

  
  export const getTicketRegistrationById = async (id: string, authToken?: string) => {
    try {
      if (!id) return null;
  
      const response = await fetch(`${BASE_URL}/tickets/registrations/${id}`, {
        headers: await getAuthHeaders(authToken),
      });
      const data = await response.json();
  
      if (response.ok) {
        return data as TicketRegistration;
      } else {
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

export const getTicketPriceBrackets = async (vehicleType?: string, authToken?: string) => {
  try {
    const url = new URL(`${BASE_URL}/tickets/priceBrackets`);
    if (vehicleType) url.searchParams.set('vehicleType', vehicleType);
    const response = await fetch(url.toString(), {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('priceBrackets', 'all')],
      },
    });
    const data = await response.json();

    if (response.ok) {
      return data as TicketPriceBracket[];
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const createTicketPriceBracket = async (bracket: TicketPriceBracketSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/priceBrackets`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(bracket),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('priceBrackets', 'all'));
      return data as TicketPriceBracket;
    } else {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateTicketPriceBracket = async (
  id: string,
  bracket: Partial<UpdateTicketPriceBracketSchemaType>,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/priceBrackets/${id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(bracket),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('priceBrackets', 'all'));
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data;
  } catch (error) {
    console.error('Error en updateTicketPriceBracket:', error);
    throw error;
  }
};

export const deleteTicketPriceBracket = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/priceBrackets/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('priceBrackets', 'all'));
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

export const addAdvancePayment = async (id: string, payload: AdvancePaymentSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/advance-payment`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('tickets', 'all'));
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data as TicketRegistration;
  } catch (error) {
    console.error('Error en addAdvancePayment:', error);
    throw error;
  }
};

export const createRegistrationByPlate = async (payload: EntryByPlateSchemaType, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/by-plate`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('tickets', 'all'));
      return data as TicketRegistration;
    } else {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
          existingRegistrationId: data.existingRegistrationId as string | undefined,
          entryTime: data.entryTime as string | undefined,
        },
      };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const searchActiveRegistrations = async (q: string, authToken?: string) => {
  try {
    const url = new URL(`${BASE_URL}/tickets/registrations/active/search`);
    url.searchParams.set('q', q);
    const response = await fetch(url.toString(), {
      headers: await getAuthHeaders(authToken),
    });
    const data = await response.json();

    if (response.ok) {
      return data as TicketRegistration[];
    } else {
      console.error(data);
      return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
};

export type CloseSummary = {
  registration: TicketRegistration;
  elapsedMinutes: number;
  previewBracket: PricingPreviewResult;
  totalCollectedSoFar: number;
  saldoACobrar: number;
  cambioARetornar: number;
  // El escalón anterior y el descuento que deja la estadía en ese precio (pagó tarde y pasó de
  // escalón). null en el primer escalón o sin saldo; ausente con un backend anterior.
  tarifaAnterior?: { precio: number; etiqueta: string; hastaMinutos: number; descuento: number } | null;
  pricingDayType?: 'DAY' | 'NIGHT' | 'MIXED';
  pricingDayTypeBasis?: 'ENTRY' | 'EXIT' | 'SPLIT';
  tariffSnapshotUsed?: boolean;
  modalidad?: 'CON_COBRO';
};

// Lo que devuelve el resumen de salida para una estadía que ingresó gratis: el vehículo y su
// permanencia, sin importes. Sale con registrarSalidaGratuita, nunca con el cierre con cobro.
export type SalidaGratuitaSummary = { registration: TicketRegistration; modalidad: 'GRATUITO'; elapsedMinutes: number };
export type ResumenSalida = CloseSummary | SalidaGratuitaSummary;

export const getCloseSummary = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/close-summary`, {
      cache: 'no-store',
      headers: await getAuthHeaders(authToken),
    });
    const data = await response.json();

    if (response.ok) {
      return data as ResumenSalida;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

// La salida de una estadía gratuita: sin importes, medio de pago ni caja. Repetirla devuelve la
// misma salida (el backend no registra nada dos veces).
export async function registrarSalidaGratuita(id: string): Promise<{ registration?: TicketRegistration; error?: string; code?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/salida`, {
    method: 'PATCH', headers: await getAuthHeaders(),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { code: data?.code, error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo registrar la salida.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { registration: data as TicketRegistration };
}

// Planilla operativa de vehículos: entradas, salidas y presentes con permanencia y operador.
// Sin importes: es la misma en playas con cobro y gratuitas.
export type FilaPlanillaVehiculos = {
  id: string;
  vehiculo: string;
  tipo: string | null;
  origen: 'PLATE' | 'BARCODE';
  modalidad: 'CON_COBRO' | 'GRATUITO';
  entradaDia: string | null;
  entradaHora: string | null;
  salidaDia: string | null;
  salidaHora: string | null;
  permanenciaMinutos: number | null;
  operadorEntrada: string | null;
  operadorSalida: string | null;
};
export type EstadoPlanilla = 'TODAS' | 'ENTRADAS' | 'SALIDAS' | 'PRESENTES';
export type FiltrosPlanillaVehiculos = { desde: string; hasta: string; estado: EstadoPlanilla; operador?: string; tipo?: string; q?: string; page?: number; limit?: number };
export type PlanillaVehiculos = {
  data: FilaPlanillaVehiculos[];
  meta: { totalItems: number; currentPage: number; itemsPerPage: number; totalPages: number };
  desde: string; hasta: string; estado: EstadoPlanilla; operadores: string[];
  resumen: { entradas: number; salidas: number; presentes: number; permanenciaMediana: number | null };
};
export async function getPlanillaVehiculos(filtros: FiltrosPlanillaVehiculos): Promise<PlanillaVehiculos | { error: string }> {
  const url = new URL(`${BASE_URL}/tickets/registrations/planilla`);
  for (const [clave, valor] of Object.entries(filtros)) if (valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor));
  const response = await fetch(url.toString(), { cache: 'no-store', headers: await getAuthHeaders() });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo cargar la planilla.' };
  return data as PlanillaVehiculos;
}

export const closeRegistrationByPlate = async (
  id: string,
  payload: CloseRegistrationSchemaType,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/close`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('tickets', 'all'));
      return data as TicketRegistration;
    } else {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export type FrequentCustomersFilters = {
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
  vehicleType?: string;
  minVisits?: number;
};

export const getPlateHistory = async (plate: string, authToken?: string, page = 1) => {
  const response = await fetch(`${BASE_URL}/tickets/registrations/frequent/${encodeURIComponent(plate)}?page=${page}&limit=20`, { headers: await getAuthHeaders(authToken), cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo consultar el historial.');
  return response.json() as Promise<{ data: TicketRegistration[]; meta: { totalItems: number } }>;
};

export const createTicketRegistrationForDay = async (
  ticket: TicketRegistrationForDaySchemaType,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrationForDays`, {
      method: 'POST',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });
    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('registrationForDays', 'all'));
      return data as TicketRegistrationForDay;
    } else {
      console.error(data);
      return { error: { code: data.code || 'UNKNOWN_ERROR', message: data.message || 'Error desconocido' } };
    }
  } catch (error) {
    console.error(error);
    return { error: { code: 'UNKNOWN_ERROR', message: 'Error desconocido' } };
  }
};

export const getTicketsRegistrationForDay = async (authToken?: string) => getOperationalRecords<TicketRegistrationForDay>('registrationForDays', authToken);

export const updateTicketStatus = async (
  id: string,
  ticket: Partial<TicketRegistrationForDaySchemaType>,
  authToken?: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrationForDays/${id}/status`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify(ticket),
    });

    const data = await response.json();
    revalidateTag(getCacheTag('registrationForDays', 'all'));

    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    return data;
  } catch (error) {
    console.error(error);
    return { error: { code: 'UNKNOWN_ERROR', message: 'Error desconocido' } };
  }
};

export const retireOverdueRegistrations = async (ids: string[], authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrationForDays/retire-many`, {
      method: 'PATCH',
      headers: await getAuthHeaders(authToken),
      body: JSON.stringify({ ids }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(data);
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || 'Error desconocido',
        },
      };
    }

    revalidateTag(getCacheTag('registrationForDays', 'all'));
    return data;
  } catch (error) {
    console.error(error);
    return { error: { code: 'UNKNOWN_ERROR', message: 'Error desconocido' } };
  }
};

export const deleteTicketRegistrationForDay = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrationForDays/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(authToken),
    });

    const data = await response.json();

    if (response.ok) {
      revalidateTag(getCacheTag('registrationForDays', 'all'));
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

export async function previewTicketPrice(vehicleType: string, ticketDayType: string, elapsedMinutes: number, entryAt?: string) {
  const params = new URLSearchParams({ vehicleType, ticketDayType, elapsedMinutes: String(elapsedMinutes) });
  if (entryAt) params.set('entryAt', entryAt);
  const response = await fetch(`${BASE_URL}/tickets/priceBrackets/preview?${params}`, { headers: await getAuthHeaders(), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'No se pudo calcular la tarifa.');
  return data as PricingPreviewResult;
}
/** Only active stays (+ latest hourly movement), not the historical ledger.
 * The operation screen needs the complete active set to avoid hiding vehicles. */
async function getOperationalRecords<T>(endpoint: string, authToken?: string): Promise<T[]> {
  const headers = await getAuthHeaders(authToken);
  const records: T[] = [];
  let page = 1, pages = 1;
  do {
    const response = await fetch(`${BASE_URL}/tickets/${endpoint}?operation=true&limit=100&page=${page}`, { headers, cache: 'no-store' });
    if (!response.ok) throw Object.assign(new Error('No se pudieron consultar los vehículos activos.'), { status: response.status });
    const result = await response.json();
    if (!Array.isArray(result.data) || !result.meta) throw new Error('Actualizá backend y frontend juntos.');
    records.push(...result.data);
    pages = result.meta.totalPages;
    page++;
  } while (page <= pages);
  return records;
}

// La entrada que se cargó tarde: pone la hora real en que entró y devuelve el cobro recalculado.
export async function corregirEntrada(id: string, entrada: string): Promise<{ summary?: ResumenSalida; error?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/entrada`, {
    method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify({ entrada }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo corregir la entrada.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { summary: data.summary as ResumenSalida };
}

// La patente o el tipo de vehículo cargados mal, desde el cobro: devuelve el cobro recalculado con
// la tarifa del tipo elegido. `code` DUPLICATE_ACTIVE_PLATE si la patente ya está adentro en otra.
export async function corregirDatosEstadia(id: string, cambios: { licensePlate?: string; vehicleType?: string }): Promise<{ summary?: ResumenSalida; error?: string; code?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/datos`, {
    method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify(cambios),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { code: data?.code, error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo corregir la estadía.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { summary: data.summary as ResumenSalida };
}

// «Se fue antes»: las tarifas que pudo haber pagado (las franjas que la estadía ya pasó y, después
// de la última, cada repetición de la que se repite), con su importe y la hora en que terminaban.
export type OpcionSalidaAnterior = { etiqueta: string; minutos: number; salidaEn: string; precio: number };
export type OpcionesSalidaAnterior = { ahora: number; cobrado: number; opciones: OpcionSalidaAnterior[] };
export async function opcionesSalidaAnterior(id: string): Promise<OpcionesSalidaAnterior & { error?: string } | { error: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/salida-anterior`, { cache: 'no-store', headers: await getAuthHeaders() });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudieron cargar las tarifas.' };
  return data as OpcionesSalidaAnterior;
}

// Registra la salida con la tarifa elegida, en un solo paso: el cuerpo del cierre más `salidaEn`
// (la hora en que esa tarifa terminaba). Queda en la Actividad.
export type SalidaAnteriorPayload = {
  salidaEn: string;
  expectedPrice: number;
  expectedCollected: number;
  closeType: 'PAYMENT' | 'NO_CHARGE';
  metodo?: 'CASH' | 'TRANSFER';
  refundMetodo?: 'CASH' | 'TRANSFER';
};
export async function registrarSalidaAnterior(id: string, payload: SalidaAnteriorPayload): Promise<{ registration?: TicketRegistration; error?: string; code?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/salida-anterior`, {
    method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { code: data?.code, error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo registrar la salida.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { registration: data.registration as TicketRegistration };
}

// Una estadía abierta y sin cobros que se cargó por error (solo el administrador). El backend
// rechaza si tiene cobros, anticipos o un QR o alias esperando el pago.
export async function eliminarEstadia(id: string): Promise<{ ok?: true; error?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}`, {
    method: 'DELETE', headers: await getAuthHeaders(),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { error: Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'No se pudo eliminar la estadía.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { ok: true };
}

export async function discountRegistration(id: string, payload: DiscountRegistrationPayload): Promise<{ summary?: CloseSummary; error?: string }> {
  const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/discount`, {
    method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) return { error: Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo aplicar el descuento.' };
  revalidateTag(getCacheTag('tickets', 'all'));
  return { summary: data as CloseSummary };
}
