import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  AdicionalEmpresa,
  CobroAlias,
  ConfiguracionAlias,
  DisponibilidadAlias,
} from '@/types/verificacion-alias.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// El backend contesta { code, message } en los rechazos de negocio (transferencia ya usada,
// adicional no habilitado): se muestra el mensaje real.
async function pedir<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  const texto = await response.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }
  if (!response.ok) {
    const mensaje = Array.isArray(datos?.message) ? datos.message.join('. ') : datos?.message;
    throw new Error(mensaje ?? 'No se pudo completar el pedido.');
  }
  return datos as T;
}

const enviar = (body?: unknown): RequestInit => ({
  method: 'POST',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

// ─── Mostrador ─────────────────────────────────────────────────────────────

export const disponibilidadAlias = () => pedir<DisponibilidadAlias>('/mercadopago/alias/disponibilidad');

export const iniciarCobroAlias = (registrationId: string) =>
  pedir<CobroAlias>('/mercadopago/alias/cobros', enviar({ registrationId }));

// null si la estadía nunca esperó una transferencia.
export const cobroAliasDeEstadia = (registrationId: string) =>
  pedir<CobroAlias | null>(`/mercadopago/alias/cobros/estadia/${registrationId}`);

export const consultarCobroAlias = (id: string) => pedir<CobroAlias>(`/mercadopago/alias/cobros/${id}`);

export const asignarTransferenciaAlias = (id: string, operacionId: string) =>
  pedir<CobroAlias>(`/mercadopago/alias/cobros/${id}/asignar`, enviar({ operacionId }));

export const ampliarCobroAlias = (id: string) => pedir<CobroAlias>(`/mercadopago/alias/cobros/${id}/ampliar`, enviar());

export const cancelarCobroAlias = (id: string) => pedir<CobroAlias>(`/mercadopago/alias/cobros/${id}/cancelar`, enviar());

// ─── Administrador de la empresa ───────────────────────────────────────────

export const configuracionAlias = () => pedir<ConfiguracionAlias>('/mercadopago/verificacion-alias');

export const configurarAlias = (cambios: { activa: boolean; alias?: string }) =>
  pedir<ConfiguracionAlias>('/mercadopago/verificacion-alias', {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });

// ─── Super admin ───────────────────────────────────────────────────────────

export const adicionalesDeEmpresa = (empresaId: string) =>
  pedir<AdicionalEmpresa[]>(`/tenancy/empresas/${empresaId}/adicionales`);

export const editarAdicionalDeEmpresa = (
  empresaId: string,
  codigo: string,
  cambios: { habilitado?: boolean; precioMensual?: number },
) =>
  pedir<AdicionalEmpresa[]>(`/tenancy/empresas/${empresaId}/adicionales/${codigo}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  });
