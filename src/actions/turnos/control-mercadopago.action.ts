'use server';

import { getControlMercadoPago } from '@/services/turnos.service';

export async function getControlMercadoPagoAction(turnoId: string) {
  return getControlMercadoPago(turnoId);
}
