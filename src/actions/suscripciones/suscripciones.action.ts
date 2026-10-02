'use server';

import {
  DatosPago,
  anularPago,
  asignarPlan,
  editarPlan,
  editarSuscripcion,
  activarCuenta,
  activarDebito,
  darDiasExtra,
  desactivarDebito,
  getMiPlan,
  pagarConMercadoPago,
  verificarPagos,
  getPagosPlataforma,
  getPlanes,
  getSuscripcion,
  registrarPago,
  revisarVencimientos,
} from '@/services/suscripciones.service';

const mensaje = (error: unknown, porDefecto: string) =>
  error instanceof Error ? error.message : porDefecto;

// Todas devuelven { dato } o { error }: la pantalla muestra el motivo en vez de romperse.
async function intentar<T>(fn: () => Promise<T>, porDefecto: string) {
  try {
    return { data: await fn() };
  } catch (error) {
    return { error: mensaje(error, porDefecto) };
  }
}

export const getPlanesAction = async () => intentar(getPlanes, 'No se pudieron cargar los planes.');

export const editarPlanAction = async (
  id: string,
  cambios: { nombre?: string; precioMensual?: number; maxActivos?: number | null; activo?: boolean },
) => intentar(() => editarPlan(id, cambios), 'No se pudo guardar el plan.');

export const getPagosPlataformaAction = async (desde: string, hasta: string) =>
  intentar(() => getPagosPlataforma(desde, hasta), 'No se pudieron cargar los pagos.');

export const revisarVencimientosAction = async () =>
  intentar(revisarVencimientos, 'No se pudo revisar los vencimientos.');

export const getSuscripcionAction = async (empresaId: string) =>
  intentar(() => getSuscripcion(empresaId), 'No se pudo cargar el plan de la empresa.');

export const asignarPlanAction = async (
  empresaId: string,
  playaId: string,
  planId: string,
  precio?: number,
) => intentar(() => asignarPlan(empresaId, playaId, planId, precio), 'No se pudo asignar el plan.');

export const editarSuscripcionAction = async (
  empresaId: string,
  cambios: { alta?: string; pagadoHasta?: string; bonificada?: boolean; notas?: string | null },
) => intentar(() => editarSuscripcion(empresaId, cambios), 'No se pudo guardar.');

export const activarCuentaAction = async (empresaId: string, alta: string, diasPrueba: number) =>
  intentar(() => activarCuenta(empresaId, alta, diasPrueba), 'No se pudo dar el alta.');

export const darDiasExtraAction = async (empresaId: string, hasta: string, motivo: string) =>
  intentar(() => darDiasExtra(empresaId, hasta, motivo), 'No se pudieron dar los días extra.');

export const registrarPagoAction = async (empresaId: string, datos: DatosPago) =>
  intentar(() => registrarPago(empresaId, datos), 'No se pudo registrar el pago.');

export const anularPagoAction = async (empresaId: string, facturaId: string, motivo: string) =>
  intentar(() => anularPago(empresaId, facturaId, motivo), 'No se pudo anular el pago.');

export const getMiPlanAction = async () => intentar(getMiPlan, 'No se pudo cargar el plan.');

export const pagarConMercadoPagoAction = async () =>
  intentar(pagarConMercadoPago, 'No pudimos armar el link de pago.');

export const activarDebitoAction = async (email: string, tarjeta?: string) =>
  intentar(() => activarDebito(email, tarjeta), 'No pudimos activar el débito automático.');

export const desactivarDebitoAction = async () =>
  intentar(desactivarDebito, 'No pudimos dar de baja el débito automático.');

/**
 * Al volver de MercadoPago: asienta lo aprobado y dice cómo quedó, para que la pantalla sepa si ya
 * puede mostrar el pago (por su id) o el débito activo. Lo demás lo vuelve a leer la página.
 */
export const verificarPagosAction = async () =>
  intentar(async () => {
    const { acreditados } = await verificarPagos();
    const plan = await getMiPlan();
    return {
      acreditados,
      debito: plan.cuenta.debito?.estado ?? null,
      pagos: plan.facturas.filter((f) => f.estado === 'PAGADA' && f.referencia).map((f) => f.referencia as string),
    };
  }, 'No pudimos verificar el pago.');
