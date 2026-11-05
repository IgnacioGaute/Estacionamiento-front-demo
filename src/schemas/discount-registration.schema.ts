import { z } from 'zod';
// `total`: el descuento de la estadía, que reemplaza al que tenía (0 lo quita).
export const discountRegistrationSchema = z.object({
  monto: z.number().int().min(0), total: z.boolean().optional(), motivo: z.string().trim().min(1).max(255),
  expectedPrice: z.number().int().min(0), expectedCollected: z.number().int().min(0),
});
export type DiscountRegistrationPayload = z.infer<typeof discountRegistrationSchema>;
