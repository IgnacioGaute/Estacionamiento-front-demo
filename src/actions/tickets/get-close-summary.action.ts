'use server';

import { getCloseSummary as getCloseSummaryAPI } from '@/services/tickets.service';

export async function getCloseSummaryAction(id: string) {
  return getCloseSummaryAPI(id);
}
