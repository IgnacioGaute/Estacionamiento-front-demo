'use server';

import { getFrequentCustomers as getFrequentCustomersAPI, FrequentCustomersFilters } from '@/services/tickets.service';

export async function getFrequentCustomersAction(filters: FrequentCustomersFilters) {
  return getFrequentCustomersAPI(filters);
}
