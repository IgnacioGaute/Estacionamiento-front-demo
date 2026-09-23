import { z } from 'zod';
import { TICKET_TYPE } from '@/types/ticket.type';

export const entryByPlateSchema = z.object({
  licensePlate: z.string().optional(),
  vehicleType: z.string().regex(/^[A-Z][A-Z0-9_]{0,31}$/, 'Elegí un tipo de vehículo válido'),
  casilleroNumber: z.string().optional(),
  lastNameCustomer: z.string().optional(),
  phoneCustomer: z.string().trim().transform(value => value.replace(/[\s()+-]/g, '')).refine(value => !value || /^[1-9]\d{7,14}$/.test(value), 'Ingresá el teléfono con código de país, entre 8 y 15 dígitos.').optional(),
  noPlate: z.boolean().optional(),
  duplicateOverride: z.boolean().optional(),
  duplicateOverrideReason: z.string().optional(),
});
export type EntryByPlateSchemaType = z.infer<typeof entryByPlateSchema>;
