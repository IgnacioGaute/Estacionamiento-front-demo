'use server';

import { getTicketPriceBrackets } from '@/services/tickets.service';

export async function getRecurringPriceReferences() {
  return getTicketPriceBrackets();
}
