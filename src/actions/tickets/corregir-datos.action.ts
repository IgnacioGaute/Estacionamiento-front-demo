'use server';
import { corregirDatosEstadia } from '@/services/tickets.service';
import type { ResumenSalida } from "@/services/tickets.service";

export async function corregirDatosEstadiaAction(id: string, cambios: { licensePlate?: string; vehicleType?: string }): Promise<{ summary?: ResumenSalida; error?: string; code?: string }> {
  try { return await corregirDatosEstadia(id, cambios); }
  catch { return { error: 'No se pudo corregir la estadía. Revisá la conexión e intentá de nuevo.' }; }
}
