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

export type TicketSchedule = { dayStartHour: number; dayEndHour: number; graceMinutes: number; barcodeTicketsEnabled: boolean };



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

export const updateTicketSchedule = async (schedule: TicketScheduleSchemaType, authToken?: string) => {
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

export const getTicketRegistrations = async (authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations`, {
      headers: await getAuthHeaders(authToken),
      next: {
        tags: [getCacheTag('tickets', 'all')],
      },
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
  previewBracket: { price: number; label: string; usedFallback: boolean };
  totalCollectedSoFar: number;
  saldoACobrar: number;
  cambioARetornar: number;
};

export const getCloseSummary = async (id: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/${id}/close-summary`, {
      headers: await getAuthHeaders(authToken),
    });
    const data = await response.json();

    if (response.ok) {
      return data as CloseSummary;
    } else {
      console.error(data);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

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
  from?: string;
  to?: string;
  vehicleType?: string;
  minVisits?: number;
};

export const getFrequentCustomers = async (filters: FrequentCustomersFilters, authToken?: string) => {
  try {
    const url = new URL(`${BASE_URL}/tickets/registrations/frequent`);
    if (filters.from) url.searchParams.set('from', filters.from);
    if (filters.to) url.searchParams.set('to', filters.to);
    if (filters.vehicleType) url.searchParams.set('vehicleType', filters.vehicleType);
    if (filters.minVisits) url.searchParams.set('minVisits', String(filters.minVisits));

    const response = await fetch(url.toString(), {
      headers: await getAuthHeaders(authToken),
      cache: 'no-store',
    });
    const data = await response.json();

    if (response.ok) {
      return data as FrequentCustomer[];
    } else {
      console.error(data);
      return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getPlateHistory = async (plate: string, authToken?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/tickets/registrations/frequent/${encodeURIComponent(plate)}`, {
      headers: await getAuthHeaders(authToken),
      cache: 'no-store',
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


