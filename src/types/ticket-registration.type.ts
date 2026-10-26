import { BoxList, DetalleComisionPago } from "./box-list.type";
import { Ticket } from "./ticket.type";


export type TicketRegistration = {
    id: string;
    entryOperatorName?: string | null;
    exitOperatorName?: string | null;
    operatorName?: string | null;
    discountNote?: string;
    entryMode?: 'BARCODE' | 'PLATE' | null;
    // Con qué modalidad ingresó: una estadía gratuita no tiene importes y sale con «Registrar
    // salida», aunque la playa haya vuelto a cobrar. Ausente (backend anterior) = con cobro.
    modalidad?: 'CON_COBRO' | 'GRATUITO';
    // Solo en la búsqueda de Cobrar salida: no coincide, pero la patente es parecida (puede ser mal leída).
    parecida?: boolean;
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
    documentoCustomer?: string | null;
    modeloVehiculo?: string | null;
    // Cómo se cargó la entrada y cómo se inició la salida (métricas de la plataforma).
    origenEntrada?: OrigenRegistro | null;
    origenSalida?: OrigenRegistro | null;
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
    movimientos?: { metodo: 'CASH' | 'TRANSFER' | 'MERCADOPAGO'; medioPagoDetalle?: string; comisionPagoEstimada?: DetalleComisionPago; tipo?: 'ANTICIPO' | 'SALDO' | 'CORTESIA' | 'DESCUENTO' | 'AJUSTE'; monto?: number }[];
}

// Escáner de patentes, escáner con la lectura corregida, a mano o tarjeta física.
export type OrigenRegistro = 'ESCANER' | 'CORREGIDA' | 'MANUAL' | 'TARJETA';
