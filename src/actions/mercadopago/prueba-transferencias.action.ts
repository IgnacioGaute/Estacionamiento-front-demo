'use server';

import {
  pruebaConfigurarReporte,
  pruebaLeerReporte,
  pruebaPagos,
  pruebaPedirReporte,
  pruebaReporteEstado,
} from '@/services/prueba-transferencias.service';
import type { VentanaPrueba } from '@/types/prueba-transferencias.type';

// La prueba de transferencias de la empresa. Cada acción devuelve { datos } o { error }, como el
// resto de las acciones de MercadoPago.
async function intentar<T>(hacer: () => Promise<T>) {
  try {
    return { datos: await hacer() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo consultar a MercadoPago.' };
  }
}

export async function pruebaPagosAction(minutos: VentanaPrueba) {
  return intentar(() => pruebaPagos(minutos));
}

export async function pruebaReporteEstadoAction() {
  return intentar(() => pruebaReporteEstado());
}

export async function pruebaPedirReporteAction(minutos: VentanaPrueba) {
  return intentar(() => pruebaPedirReporte(minutos));
}

export async function pruebaConfigurarReporteAction() {
  return intentar(() => pruebaConfigurarReporte());
}

export async function pruebaLeerReporteAction(nombre: string) {
  return intentar(() => pruebaLeerReporte(nombre));
}
