import { z } from 'zod';
import { MOVIMIENTO_METODO } from '@/types/movimiento.type';

export const CLOSE_TYPE = ['PAYMENT', 'NO_CHARGE', 'COURTESY'] as const;

export const closeRegistrationSchema = z.object({
  closeType: z.enum(CLOSE_TYPE),
  expectedPrice: z.number().int().min(0),
  expectedCollected: z.number().int().min(0),
  refundMetodo: z.enum(MOVIMIENTO_METODO).optional(),
  metodo: z.enum(MOVIMIENTO_METODO).optional(),
  // Pago híbrido: el saldo repartido entre efectivo y transferencia; reemplaza a `metodo`.
  pagos: z.array(z.object({ metodo: z.enum(['CASH', 'TRANSFER']), importe: z.number().int().min(1) })).length(2).optional(),
  // Con efectivo: lo que entregó el cliente por la parte en efectivo («Justo»: el mismo importe).
  // El servidor calcula el vuelto y rechaza lo que no alcanza.
  efectivoRecibido: z.number().int().min(0).max(1_000_000_000).optional(),
  referencia: z.string().optional(),
  motivo: z.string().optional(),
});
export type CloseRegistrationSchemaType = z.infer<typeof closeRegistrationSchema>;
