'use server';

import { getPlateHistory as getPlateHistoryAPI } from '@/services/tickets.service';

export async function getPlateHistoryAction(plate: string) {
  return getPlateHistoryAPI(plate);
}
