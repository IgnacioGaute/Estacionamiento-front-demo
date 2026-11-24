'use server';
import {
  corregir, detalleOperacion, historialMovimientos, previsualizarCorreccion, resolverCorreccion, transferenciasParaCorreccion,
} from '@/services/operaciones.service';
import type { CorreccionPayload, FiltrosHistorial, ResultadoApi } from '@/types/operaciones.type';

const SIN_CONEXION = 'Revisá la conexión e intentá de nuevo.';
// Un fallo de red no es una respuesta de la API: se informa sin código, para reintentar.
const seguro = async <T>(fn: () => Promise<ResultadoApi<T>>, mensaje: string): Promise<ResultadoApi<T>> => {
  try { return await fn(); }
  catch { return { error: `${mensaje} ${SIN_CONEXION}` }; }
};

export async function historialMovimientosAction(filtros: FiltrosHistorial) {
  return seguro(() => historialMovimientos(filtros), 'No se pudieron cargar los movimientos.');
}

export async function detalleOperacionAction(tipo: 'ESTADIA' | 'PASE', id: string) {
  return seguro(() => detalleOperacion(tipo, id), 'No se pudo cargar la operación.');
}

export async function transferenciasParaCorreccionAction(movimientoId: string, importe?: number) {
  return seguro(() => transferenciasParaCorreccion(movimientoId, importe), 'No se pudieron buscar las transferencias.');
}

export async function previsualizarCorreccionAction(payload: CorreccionPayload) {
  return seguro(() => previsualizarCorreccion(payload), 'No se pudo revisar la corrección.');
}

// Con el mismo `solicitudId`, reintentar es seguro: el servidor devuelve la corrección ya guardada.
export async function corregirAction(payload: CorreccionPayload) {
  return seguro(() => corregir(payload), 'No se pudo confirmar si la corrección se guardó.');
}

export async function resolverCorreccionAction(id: string, payload: { accion: 'APLICAR' | 'RECHAZAR'; resolucion: string; version?: string; operacionId?: string }) {
  return seguro(() => resolverCorreccion(id, payload), 'No se pudo resolver la corrección.');
}
