'use server';

import { getTicketSchedule } from '@/services/tickets.service';

export async function getShiftsEnabledAction(): Promise<boolean> {
  const schedule = await getTicketSchedule();
  return schedule?.shiftsEnabled === true;
}
