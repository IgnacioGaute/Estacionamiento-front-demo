import { z } from 'zod';
export const discountRegistrationSchema = z.object({
  monto: z.number().int().positive(), motivo: z.string().trim().min(1).max(255),
  expectedPrice: z.number().int().min(0), expectedCollected: z.number().int().min(0),
});
export type DiscountRegistrationPayload = z.infer<typeof discountRegistrationSchema>;
