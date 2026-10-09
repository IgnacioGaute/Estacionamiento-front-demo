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

// Cada acción devuelve { datos } o { error }, como el resto de las acciones de MercadoPago.
async function intentar<T>(hacer: () => Promise<T>) {
  try {
    return { datos: await hacer() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo completar el pedido.' };
  }
}

export async function disponibilidadAliasAction() {
  return intentar(() => disponibilidadAlias());
}

export async function iniciarCobroAliasAction(registrationId: string, tipo: 'HORA' | 'ABONO' | 'INQUILINO' = 'HORA', datos?: { monto: number; receiptIds?: string[]; nota?: string }) {
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
