import { z } from 'zod';

export const ticketScheduleSchema = z.object({
  dayStartHour: z.coerce.number().int().min(0, 'Debe ser entre 0 y 23').max(23, 'Debe ser entre 0 y 23'),
  dayEndHour: z.coerce.number().int().min(0, 'Debe ser entre 0 y 23').max(23, 'Debe ser entre 0 y 23'),
  graceMinutes: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  barcodeTicketsEnabled: z.boolean(),
});
export type TicketScheduleSchemaType = z.infer<typeof ticketScheduleSchema>;
