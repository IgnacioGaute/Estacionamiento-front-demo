'use server';
import { getPlanillaVehiculos, type FiltrosPlanillaVehiculos } from '@/services/tickets.service';

export async function planillaVehiculosAction(filtros: FiltrosPlanillaVehiculos) {
  try {
    return await getPlanillaVehiculos(filtros);
  } catch {
    return { error: 'No se pudo cargar la planilla. Revisá la conexión e intentá de nuevo.' };
  }
}
