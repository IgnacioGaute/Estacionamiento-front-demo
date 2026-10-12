'use server';
import { discountRegistrationSchema, DiscountRegistrationPayload } from '@/schemas/discount-registration.schema';
import { discountRegistration } from '@/services/tickets.service';
import type { CloseSummary } from '@/services/tickets.service';
export async function discountRegistrationAction(id: string, values: DiscountRegistrationPayload): Promise<{ summary?: CloseSummary; error?: string }> {
  const validated = discountRegistrationSchema.safeParse(values);
  if (!validated.success) return { error: 'Revisá el importe y el motivo del descuento.' };
  try { return await discountRegistration(id, validated.data); }
  catch { return { error: 'No se pudo aplicar el descuento.' }; }
}
