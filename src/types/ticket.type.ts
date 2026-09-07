import { Receipt } from "./receipt.type";
import { TicketRegistration } from "./ticket-registration.type";

export const TICKET_TYPE = ['AUTO', 'CAMIONETA'] as const;
export type TicketType = (typeof TICKET_TYPE)[number];

export const TICKET_DAY_TYPE= ['DAY', 'NIGHT'] as const;
export type TicketDayType = (typeof TICKET_DAY_TYPE)[number];

export type Ticket ={
    id: string;
    codeBar: string;
    price: number;
    dayPrice: number;
    nightPrice: number;
    vehicleType: TicketType;
    ticketRegistration: TicketRegistration;
}

export type Scanner ={
    barcode: string;
    success: boolean;
    message?: string;
    type?: 'RECEIPT' | 'TICKET';
    id: string | null;
    receipt: Receipt;
    receiptId?: string;
    warning?: string;
}