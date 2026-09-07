'use server';

import { getMyOpenTurno as getMyOpenTurnoAPI } from '@/services/turnos.service';

export async function getMyOpenTurnoAction() {
  return getMyOpenTurnoAPI();
}
