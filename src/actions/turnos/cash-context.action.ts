 'use server';
import { getCashContext, getOperadores, getTurnos } from '@/services/turnos.service';
export async function getCashContextAction() {
  try { return { context: await getCashContext() }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo cargar la caja.' }; }
}
export async function getTurnosAction(filtros: { desde?: string; hasta?: string; usuarioId?: string; estado?: 'ABIERTO' | 'CERRADO'; fechaPor?: 'APERTURA' | 'CIERRE' } = {}) {
  try { return { turnos: await getTurnos(filtros) }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo cargar el historial.' }; }
}

export async function getOperadoresAction() {
  try { return { operadores: await getOperadores() }; }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudieron cargar los operadores.' }; }
}
