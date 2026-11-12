'use server';

import { consultarSalida, getCloseSummary as getCloseSummaryAPI } from '@/services/tickets.service';

export async function getCloseSummaryAction(id: string) {
  return getCloseSummaryAPI(id);
}

/** Si la estadía sigue abierta (con su resumen), ya salió, o no se pudo saber. Solo lee. */
export async function consultarSalidaAction(id: string) {
  return consultarSalida(id);
}
