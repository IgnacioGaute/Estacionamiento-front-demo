'use server';

import {
  adicionalesDeEmpresa,
  ampliarCobroAlias,
  asignarTransferenciaAlias,
  cancelarCobroAlias,
  cobroAliasDeEstadia,
  configuracionAlias,
  configurarAlias,
  consultarCobroAlias,
  disponibilidadAlias,
  editarAdicionalDeEmpresa,
  iniciarCobroAlias,
} from '@/services/verificacion-alias.service';
import { mensajeDeFallo, serializarFallo, type FalloSerializado } from '@/lib/fallos-backend';

// Cada acción devuelve { datos } o { error, fallo }, como el resto de las acciones de MercadoPago.
// fallo dice si fue de comunicación (el resultado de una escritura queda desconocido: se consulta
// el estado antes de repetir) o un rechazo del backend.
async function intentar<T>(hacer: () => Promise<T>): Promise<{ datos: T; error?: undefined; fallo?: undefined } | { datos?: undefined; error: string; fallo?: FalloSerializado }> {
  try {
    return { datos: await hacer() };
  } catch (error) {
    return { error: mensajeDeFallo(error, 'No se pudo completar el pedido.'), fallo: serializarFallo(error) };
  }
}

export async function disponibilidadAliasAction() {
  return intentar(() => disponibilidadAlias());
}

export async function iniciarCobroAliasAction(registrationId: string, tipo: 'HORA' | 'ABONO' | 'INQUILINO' = 'HORA', datos?: { monto?: number; receiptIds?: string[]; nota?: string; alIngresar?: boolean; anticipoMinutos?: number; anticipoEtiqueta?: string }) {
  return intentar(() => iniciarCobroAlias(registrationId, tipo, datos));
}

export async function cobroAliasDeEstadiaAction(registrationId: string, tipo: 'HORA' | 'ABONO' | 'INQUILINO' = 'HORA') {
  return intentar(() => cobroAliasDeEstadia(registrationId, tipo));
}

export async function consultarCobroAliasAction(id: string) {
  return intentar(() => consultarCobroAlias(id));
}

export async function asignarTransferenciaAliasAction(id: string, operacionId: string) {
  return intentar(() => asignarTransferenciaAlias(id, operacionId));
}

export async function ampliarCobroAliasAction(id: string) {
  return intentar(() => ampliarCobroAlias(id));
}

export async function cancelarCobroAliasAction(id: string) {
  return intentar(() => cancelarCobroAlias(id));
}

export async function configuracionAliasAction() {
  return intentar(() => configuracionAlias());
}

export async function configurarAliasAction(cambios: { activa: boolean; alias?: string }) {
  return intentar(() => configurarAlias(cambios));
}

export async function adicionalesDeEmpresaAction(empresaId: string) {
  return intentar(() => adicionalesDeEmpresa(empresaId));
}

export async function editarAdicionalDeEmpresaAction(
  empresaId: string,
  codigo: string,
  cambios: { habilitado?: boolean; precioMensual?: number },
) {
  return intentar(() => editarAdicionalDeEmpresa(empresaId, codigo, cambios));
}
