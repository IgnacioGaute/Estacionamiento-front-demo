import { BoxList } from "./box-list.type";
import { TicketType } from "./ticket.type";

export const TICKET_TIME_TYPE = ['DIA', 'SEMANA', 'SEMANA_Y_DIA', 'MES', 'MES_Y_DIA'] as const;
export type TicketTimeType = (typeof TICKET_TIME_TYPE)[number];

export type TicketRegistrationForDay = {
    id: string;
    description: string;
    price: number;
    weeks: number;
    days: number;
    months: number;
    dateNow: Date | null;
    ticketTimeType: TicketTimeType;
    vehicleType: TicketType;
    firstNameCustomer: string;
    lastNameCustomer: string;
    vehiclePlateCustomer: string;
    paid: boolean;
    retired: boolean;
    retiredAt?: string | null;
    paymentMetodo: 'CASH' | 'TRANSFER' | null;
    boxList: BoxList;
}
