import { BoxList } from "./box-list.type";
import { Ticket } from "./ticket.type";


export type TicketRegistration = {
    id: string;
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
    vehiclePlateCustomer?: string | null;
    priceBracketLabel?: string | null;
    priceBracketFallbackUsed?: boolean;
    expectedBracketLabel?: string | null;
    expectedUptoMinutes?: number | null;
    exceededExpectedStay?: boolean;
    // Flujo nuevo por patente — estos registros nunca tienen `ticket` poblado.
    vehicleType?: 'AUTO' | 'CAMIONETA' | null;
    licensePlateOriginal?: string | null;
    licensePlateNormalized?: string | null;
    licensePlateSearch?: string | null;
    casilleroNumber?: string | null;
    noPlate?: boolean;
    duplicatePlateOverrideReason?: string | null;
    duplicateOfRegistrationId?: string | null;
    // Solo viene poblado cuando el endpoint que lo devuelve pide la relación explícitamente
    // (ej. la planilla de caja) — para mostrar el medio de pago con el que se cobró.
    movimientos?: { metodo: 'CASH' | 'TRANSFER' }[];
}
