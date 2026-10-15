'use server';

import { getEstadiasAbiertasTurno } from '@/services/turnos.service';

export async function getEstadiasAbiertasTurnoAction(turnoId: string) {
  return getEstadiasAbiertasTurno(turnoId);
}
