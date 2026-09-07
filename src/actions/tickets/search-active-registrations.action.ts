'use server';

import { searchActiveRegistrations as searchActiveRegistrationsAPI } from '@/services/tickets.service';

export async function searchActiveRegistrationsAction(q: string) {
  return searchActiveRegistrationsAPI(q);
}
