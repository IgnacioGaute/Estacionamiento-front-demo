'use server';

import { getFrequentCustomers as getFrequentCustomersAPI, getFrequentCustomersPage, FrequentCustomersFilters } from '@/services/tickets.service';

export async function getFrequentCustomersAction(filters: FrequentCustomersFilters) {
  return getFrequentCustomersAPI(filters);
}
export async function getFrequentCustomersPageAction(filters: FrequentCustomersFilters) { return getFrequentCustomersPage(filters); }
