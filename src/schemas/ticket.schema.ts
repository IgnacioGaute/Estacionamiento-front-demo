import { z } from 'zod';
import { TICKET_DAY_TYPE, TICKET_TYPE } from '@/types/ticket.type';

export const ticketSchema = z.object({
    codeBar: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
    vehicleType: z.string().regex(/^[A-Z][A-Z0-9_]{0,31}$/, 'Elegí un tipo de vehículo válido'),
    ticketDayType: z.enum(TICKET_DAY_TYPE).optional(),
    
});
export type TicketSchemaType = z.infer<typeof ticketSchema>;


export const updateTicketSchema = z.object({
    codeBar: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
    vehicleType: z.string().regex(/^[A-Z][A-Z0-9_]{0,31}$/, 'Elegí un tipo de vehículo válido'),
    ticketDayType: z.enum(TICKET_DAY_TYPE).optional(),
    
  });
  export type UpdateTicketSchemaType = z.infer<typeof updateTicketSchema>;

export const deleteTicketSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Ticket"'),
});
export type DeleteTicketSchemaType = z.infer<typeof deleteTicketSchema>;