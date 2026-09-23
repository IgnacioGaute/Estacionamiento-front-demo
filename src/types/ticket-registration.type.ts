import { BoxList } from "./box-list.type";
import { Ticket } from "./ticket.type";


export type TicketRegistration = {
    id: string;
    entryMode?: 'BARCODE' | 'PLATE' | null;
    pricingSnapshot?: { capturedAt: string; brackets: import('./ticket-price-bracket.type').TicketPriceBracket[]; schedule: { pricingDayTypeBasis: 'ENTRY' | 'EXIT'; pricingOptions?: import('./pricing-options.type').PricingOptions | null } } | null;
    description: string;
    price: number;
    codeBarTicket: string;
    entryDay: string;
    departureDay: string;
    entryTime: string;
    departureTime: string;
    dateNow: Date | null;
    ticket: Ticket | null;
    boxList: BoxList;
    updatedAt: Date;
    advancePaidAmount?: number | null;
    firstNameCustomer?: string | null;
    lastNameCustomer?: string | null;
    phoneCustomer?: string | null;
    vehiclePlateCustomer?: string | null;
    priceBracketLabel?: string | null;
    priceBracketFallbackUsed?: boolean;
    expectedBracketLabel?: string | null;
    expectedUptoMinutes?: number | null;
    exceededExpectedStay?: boolean;
    // Flujo nuevo por patente — estos registros nunca tienen `ticket` poblado.
    vehicleType?: string | null;
    licensePlateOriginal?: string | null;
    licensePlateNormalized?: string | null;
    licensePlateSearch?: string | null;
    casilleroNumber?: string | null;
    noPlate?: boolean;
    duplicatePlateOverrideReason?: string | null;
    duplicateOfRegistrationId?: string | null;
    // Solo viene poblado cuando el endpoint que lo devuelve pide la relación explícitamente
    // (ej. la planilla de caja) — para mostrar el medio de pago con el que se cobró.
    movimientos?: { metodo: 'CASH' | 'TRANSFER'; tipo?: 'ANTICIPO' | 'SALDO' | 'CORTESIA' | 'AJUSTE'; monto?: number }[];
}
