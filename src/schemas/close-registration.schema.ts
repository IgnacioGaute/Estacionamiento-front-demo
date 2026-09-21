import { z } from 'zod';
import { MOVIMIENTO_METODO } from '@/types/movimiento.type';

export const CLOSE_TYPE = ['PAYMENT', 'NO_CHARGE', 'COURTESY'] as const;

export const closeRegistrationSchema = z.object({
  closeType: z.enum(CLOSE_TYPE),
  expectedPrice: z.number().int().min(0),
  expectedCollected: z.number().int().min(0),
  refundMetodo: z.enum(MOVIMIENTO_METODO).optional(),
  metodo: z.enum(MOVIMIENTO_METODO).optional(),
  referencia: z.string().optional(),
  motivo: z.string().optional(),
});
export type CloseRegistrationSchemaType = z.infer<typeof closeRegistrationSchema>;
