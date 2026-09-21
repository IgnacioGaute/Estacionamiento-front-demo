import { TICKET_TIME_TYPE } from '@/types/ticket-registration-for-day.type';
import { TICKET_TYPE } from '@/types/ticket.type';
import { z } from 'zod';

export const ticketRegistrationForDaySchema = z.object({
    weeks: z.coerce.number().optional(),
    days: z.coerce.number().optional(),
    months: z.coerce.number().optional(),
    ticketTimeType: z.enum(TICKET_TIME_TYPE).optional(),
    vehicleType: z.string().regex(/^[A-Z][A-Z0-9_]{0,31}$/, 'Elegí un tipo de vehículo válido'),
    firstNameCustomer: z.string().optional(),
    lastNameCustomer: z.string().max(50, 'El Apellido no puede tener más de 50 caracteres').optional(),
    vehiclePlateCustomer: z.string().min(1, 'La patente es obligatoria'),
    paid: z.boolean().optional(),
    retired: z.boolean().optional(),
    paymentMetodo: z.enum(['CASH', 'TRANSFER']).optional(),
});
export type TicketRegistrationForDaySchemaType = z.infer<typeof ticketRegistrationForDaySchema>;


export const ticketRegistrationForDayStatusSchema = z.object({
    paid: z.boolean().optional(),
    retired: z.boolean().optional(),
    paymentMetodo: z.enum(['CASH', 'TRANSFER']).optional(),
});
export type TicketRegistrationForDayStatusSchemaType = z.infer<typeof ticketRegistrationForDayStatusSchema>;


export const deleteRegistrationForDaySchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Ticket"'),
});
export type DeleteRegistrationForDaySchemaType = z.infer<typeof deleteRegistrationForDaySchema>;