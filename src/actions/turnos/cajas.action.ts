'use server';
import { z } from 'zod';
import { getCashConfiguration, saveCaja, addCashMovement } from '@/services/turnos.service';
export async function getCashConfigurationAction() {
  try { return { configuration: await getCashConfiguration() }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo cargar las cajas.' }; }
}
export async function saveCajaAction(payload: { nombre: string; activa?: boolean }, id?: string) {
  const result = z.object({ nombre: z.string().trim().min(1).max(80), activa: z.boolean().optional() }).safeParse(payload);
  if (!result.success || (id && !z.string().uuid().safeParse(id).success)) return { error: 'Revisá el nombre de la caja.' };
  try { return { caja: await saveCaja(result.data, id) }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo guardar la caja.' }; }
}
export async function addCashMovementAction(id: string, payload: { tipo: 'APORTE' | 'RETIRO'; importe: number; efectivoEsperado: number; motivo: string }) {
  const result = z.object({ tipo: z.enum(['APORTE', 'RETIRO']), importe: z.number().int().positive(), efectivoEsperado: z.number().int(), motivo: z.string().trim().min(1).max(255) }).safeParse(payload);
  if (!z.string().uuid().safeParse(id).success || !result.success) return { error: 'Indicá un importe válido y el motivo.' };
  try { await addCashMovement(id, result.data); return { success: true }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo registrar el movimiento.' }; }
}
