import { z } from 'zod';
const money = z.number().int().min(0).max(100000000);
const code = z.string().regex(/^[A-Z][A-Z0-9_]{0,31}$/);
export const pricingOptionsSchema = z.object({
  charging: z.object({ enabled: z.boolean(), mode: z.enum(['STARTED', 'COMPLETED', 'PROPORTIONAL']), unitMinutes: z.number().int().min(1).max(10080), rates: z.array(z.object({ vehicleType: code, dayPrice: money, nightPrice: money })).max(100) }),
  stay: z.object({ enabled: z.boolean(), freeMinutes: z.number().int().min(0).max(10080), minimumMinutes: z.number().int().min(0).max(10080), capEnabled: z.boolean(), capMinutes: z.union([z.literal(720), z.literal(1440)]), caps: z.array(z.object({ vehicleType: code, amount: money })).max(100) }),
  crossing: z.object({ enabled: z.boolean(), mode: z.enum(['ENTRY', 'EXIT', 'SPLIT']) }),
});
