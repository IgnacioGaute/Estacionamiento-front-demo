'use server';

import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  EstadoCuenta,
  ListadoAnulaciones,
  MetodoCobro,
  PlanAbonos,
  ReciboEntregable,
  ResultadoAbonos,
  ResultadoPago,
  ResumenCuentas,
  SaldoInicial,
} from '@/types/cuenta.type';

// Cuenta corriente de inquilinos. Cada acción devuelve { data } o { error, code }: el código
// deja a la pantalla distinguir, por ejemplo, la sección apagada de un error cualquiera.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
type Resultado<T> = { data?: T; error?: string; code?: string };

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<Resultado<T>> {
  try {
    const response = await fetch(`${BASE_URL}/cuentas/${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: await getAuthHeaders(),
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const mensaje = body?.message;
      return {
        error: Array.isArray(mensaje)
          ? mensaje.join(' ')
          : typeof mensaje === 'string'
            ? mensaje
            : 'No se pudo completar la operación.',
        code: body?.code,
      };
    }
    return { data: body as T };
  } catch {
    return { error: 'No se pudo conectar con el servidor.' };
  }
}

export async function getResumenCuentasAction() {
  return pedir<ResumenCuentas>('resumen');
}

export async function getEstadoCuentaAction(customerId: string) {
  return pedir<EstadoCuenta>(encodeURIComponent(customerId));
}

// `solicitudId` se genera al abrir el cobro y se repite en cada reintento: si el primer intento
// llegó y se perdió la respuesta, el servidor devuelve el mismo recibo en vez de cobrar otra vez.
export async function registrarPagoAction(
  customerId: string,
  datos: { pagos: { metodo: MetodoCobro; importe: number }[]; receiptIds?: string[]; nota?: string; solicitudId: string },
) {
  return pedir<ResultadoPago>(`${encodeURIComponent(customerId)}/pagos`, datos);
}

// El recibo de un pago como comprobante entregable (QR, WhatsApp o térmica, según la
// configuración de la playa). Pedirlo de nuevo devuelve el mismo enlace.
export async function emitirReciboPagoAction(pagoId: string) {
  return pedir<ReciboEntregable>(`pagos/${encodeURIComponent(pagoId)}/comprobante`, {});
}

export async function registrarDevolucionAction(
  customerId: string,
  datos: { importe: number; metodo: MetodoCobro; motivo: string; solicitudId: string },
) {
  return pedir<{ saldo: number; repetido: boolean }>(`${encodeURIComponent(customerId)}/devoluciones`, datos);
}

export async function registrarSaldoInicialAction(customerId: string, datos: SaldoInicial) {
  return pedir<{ saldo: number }>(`${encodeURIComponent(customerId)}/saldo-inicial`, datos);
}

export async function registrarAjusteAction(
  customerId: string,
  datos: { tipo: 'BONIFICACION' | 'RECARGO'; importe: number; motivo: string; receiptId?: string },
) {
  return pedir<{ saldo: number }>(`${encodeURIComponent(customerId)}/ajustes`, datos);
}

// `confirmacion`: el importe escrito a mano por quien anula; el backend lo compara con el real.
export async function anularMovimientoAction(movimientoId: string, datos: { motivo: string; confirmacion: number }) {
  return pedir<{ saldo: number }>(`movimientos/${encodeURIComponent(movimientoId)}/anular`, datos);
}

export async function getAnulacionesAction(mes: string) {
  return pedir<ListadoAnulaciones>(`anulaciones?mes=${encodeURIComponent(mes)}`);
}

// Qué se cargaría, sin cargar nada: la administración lo revisa antes de confirmar.
export async function previsualizarAbonosAction(mes: string) {
  return pedir<PlanAbonos>(`abonos/previsualizar?mes=${encodeURIComponent(mes)}`);
}

export async function cargarAbonosAction(mes: string, vencimientoDia: number) {
  return pedir<ResultadoAbonos>('abonos/cargar', { mes, vencimientoDia });
}
