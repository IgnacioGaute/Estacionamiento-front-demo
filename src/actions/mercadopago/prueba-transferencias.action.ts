'use server';

import {
  pruebaConfigurarReporte,
  pruebaLeerReporte,
  pruebaPagos,
  pruebaPedirReporte,
  pruebaReporteEstado,
} from '@/services/prueba-transferencias.service';
import type { VentanaPrueba } from '@/types/prueba-transferencias.type';

// La prueba de transferencias del super admin. Cada acción devuelve { datos } o { error }, como el
// resto de las acciones de MercadoPago.
async function intentar<T>(hacer: () => Promise<T>) {
  try {
    return { datos: await hacer() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo consultar a MercadoPago.' };
  }
}

export async function pruebaPagosAction(empresaId: string, minutos: VentanaPrueba) {
  return intentar(() => pruebaPagos(empresaId, minutos));
}

export async function pruebaReporteEstadoAction(empresaId: string) {
  return intentar(() => pruebaReporteEstado(empresaId));
}

export async function pruebaPedirReporteAction(empresaId: string, minutos: VentanaPrueba) {
  return intentar(() => pruebaPedirReporte(empresaId, minutos));
}

export async function pruebaConfigurarReporteAction(empresaId: string) {
  return intentar(() => pruebaConfigurarReporte(empresaId));
}

export async function pruebaLeerReporteAction(empresaId: string, nombre: string) {
  return intentar(() => pruebaLeerReporte(empresaId, nombre));
}
