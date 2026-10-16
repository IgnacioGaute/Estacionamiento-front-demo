'use server';

import { getEstadiasAbiertasTurno } from '@/services/turnos.service';

export async function getEstadiasAbiertasTurnoAction(turnoId: string, todas = false) {
  return getEstadiasAbiertasTurno(turnoId, todas);
}
