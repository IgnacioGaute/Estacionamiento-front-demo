'use server';

import { getUserByUsername as lookupUser } from '@/services/users.service';

// Uses the current session; never accepts the internal service credential.
export async function getUserByUsername(username: string) {
  return lookupUser(username);
}
