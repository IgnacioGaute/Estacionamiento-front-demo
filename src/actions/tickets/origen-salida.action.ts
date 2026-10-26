'use server';
import { marcarOrigenSalida } from '@/services/tickets.service';
import type { OrigenRegistro } from '@/types/ticket-registration.type';

// Anota cómo se abrió el cobro de una estadía (para las métricas). Nunca falla: es informativo.
export async function marcarOrigenSalidaAction(id: string, origen: OrigenRegistro) {
  try {
    return await marcarOrigenSalida(id, origen);
  } catch {
    return false;
  }
}
