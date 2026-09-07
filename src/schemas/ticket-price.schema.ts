import { TICKET_DAY_TYPE, TICKET_TIME_TYPE, VEHICLE_TYPE } from '@/types/ticket-price';
import { z } from 'zod';

export const ticketPriceSchema = z.object({
    price: z.coerce.number().optional(),
    ticketTimePrice: z.coerce.number().optional(),
    ticketDayType: z.enum(TICKET_DAY_TYPE).optional(),
    vehicleType: z.enum(VEHICLE_TYPE).optional(),
    ticketTimeType: z.enum(TICKET_TIME_TYPE).optional(),
    intervalMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').optional(),
});
export type TicketPriceSchemaType = z.infer<typeof ticketPriceSchema>;


export const updateTicketPriceSchema = z.object({
    price: z.coerce.number().optional(),
    ticketTimePrice: z.coerce.number().optional(),
    ticketDayType: z.enum(TICKET_DAY_TYPE).optional(),
    vehicleType: z.enum(VEHICLE_TYPE).optional(),
    ticketTimeType: z.enum(TICKET_TIME_TYPE).optional(),
    intervalMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').optional(),
  });
  export type UpdateTicketPriceSchemaType = z.infer<typeof updateTicketPriceSchema>;

export const deleteTicketPriceSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Precio Ticket"'),
});
export type DeleteTicketPriceSchemaType = z.infer<typeof deleteTicketPriceSchema>;