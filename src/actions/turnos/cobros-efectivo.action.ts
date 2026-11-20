'use server';

import { getCobrosEfectivo } from '@/services/turnos.service';

export async function getCobrosEfectivoAction(turnoId: string) {
  return getCobrosEfectivo(turnoId);
}
