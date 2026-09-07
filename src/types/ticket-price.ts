
export const VEHICLE_TYPE = ['AUTO', 'CAMIONETA'] as const;
export type VehicleType = (typeof VEHICLE_TYPE)[number];

export const TICKET_TIME_TYPE = ['DIA', 'SEMANA', 'SEMANA_Y_DIA'] as const;
export type TicketTimeType = (typeof TICKET_TIME_TYPE)[number];

export const TICKET_DAY_TYPE= ['DAY', 'NIGHT'] as const;
export type TicketDayType = (typeof TICKET_DAY_TYPE)[number];

export type ticketPrice = {
    id: string;
    price: number;
    ticketTimePrice: number;
    ticketDayType: TicketDayType | null;
    vehicleType: VehicleType | null;
    ticketTimeType: TicketTimeType | null;
    intervalMinutes: number | null;
}