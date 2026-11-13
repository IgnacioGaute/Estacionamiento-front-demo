'use server';

import { getConciliacion } from '@/services/turnos.service';

export async function getConciliacionAction(turnoId: string) {
  return getConciliacion(turnoId);
}
