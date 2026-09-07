import { z } from 'zod';
import { TICKET_TYPE } from '@/types/ticket.type';

export const entryByPlateSchema = z.object({
  licensePlate: z.string().optional(),
  vehicleType: z.enum(TICKET_TYPE),
  casilleroNumber: z.string().optional(),
  lastNameCustomer: z.string().optional(),
  noPlate: z.boolean().optional(),
  duplicateOverride: z.boolean().optional(),
  duplicateOverrideReason: z.string().optional(),
});
export type EntryByPlateSchemaType = z.infer<typeof entryByPlateSchema>;
