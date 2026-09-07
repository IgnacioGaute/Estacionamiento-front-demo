import { TICKET_DAY_TYPE, VEHICLE_TYPE } from '@/types/ticket-price';
import { z } from 'zod';

export const ticketPriceBracketSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPE),
  ticketDayType: z.enum(TICKET_DAY_TYPE).optional(),
  label: z.string().min(1, 'Ingresá un nombre para la franja'),
  uptoMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').optional(),
  price: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  recurringUnitMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').optional(),
});
export type TicketPriceBracketSchemaType = z.infer<typeof ticketPriceBracketSchema>;

// uptoMinutes/recurringUnitMinutes admiten `null` explícito (a diferencia del alta) para poder
// "borrar" el valor al editar — ej. apagar la tarifa recurrente de una franja sin límite.
export const updateTicketPriceBracketSchema = ticketPriceBracketSchema.partial().extend({
  uptoMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').nullable().optional(),
  recurringUnitMinutes: z.coerce.number().int().min(1, 'Debe ser mayor a 0').nullable().optional(),
});
export type UpdateTicketPriceBracketSchemaType = z.infer<typeof updateTicketPriceBracketSchema>;

export const deleteTicketPriceBracketSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar franja"'),
});
export type DeleteTicketPriceBracketSchemaType = z.infer<typeof deleteTicketPriceBracketSchema>;

export const advancePaymentSchema = z.object({
  advancePaidAmount: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0').optional(),
  metodo: z.enum(['CASH', 'TRANSFER']).optional(),
  expectedBracketLabel: z.string().optional(),
  expectedUptoMinutes: z.coerce.number().int().min(1).optional(),
  firstNameCustomer: z.string().optional(),
  lastNameCustomer: z.string().optional(),
  vehiclePlateCustomer: z.string().optional(),
});
export type AdvancePaymentSchemaType = z.infer<typeof advancePaymentSchema>;
