'use server';
import { opcionesSalidaAnterior, registrarSalidaAnterior, tarifasSinEntrada, type OpcionesSalidaAnterior, type SalidaAnteriorPayload, type TarifasSinEntrada } from '@/services/tickets.service';
import type { TicketRegistration } from '@/types/ticket-registration.type';

export async function opcionesSalidaAnteriorAction(id: string): Promise<Partial<OpcionesSalidaAnterior> & { error?: string }> {
  try { return await opcionesSalidaAnterior(id); }
  catch { return { error: 'No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo.' }; }
}

export async function registrarSalidaAnteriorAction(id: string, payload: SalidaAnteriorPayload): Promise<{ registration?: TicketRegistration; error?: string; code?: string }> {
  try { return await registrarSalidaAnterior(id, payload); }
  catch { return { error: 'No se pudo registrar la salida. Revisá la conexión e intentá de nuevo.' }; }
}

export async function tarifasSinEntradaAction(vehicleType: string): Promise<Partial<TarifasSinEntrada> & { error?: string }> {
  if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(vehicleType)) return { error: 'Elegí el tipo de vehículo.' };
  try { return await tarifasSinEntrada(vehicleType); }
  catch { return { error: 'No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo.' }; }
}
