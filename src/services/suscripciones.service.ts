import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  DetalleSuscripcion,
  MedioPagoSaas,
  MiPlan,
  PagoPlataforma,
  PeriodoPago,
  Plan,
} from '@/types/suscripcion.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// El backend devuelve { code, message } en los rechazos de negocio (pago que no es el último,
// prueba de una empresa que ya pagó) para que la pantalla muestre el motivo real.
async function leerError(response: Response, porDefecto: string): Promise<string> {
  try {
    const data = await response.json();
    return Array.isArray(data?.message)
      ? data.message.join('. ')
      : (data?.message ?? porDefecto);
  } catch {
    return porDefecto;
  }
}

async function pedir<T>(path: string, porDefecto: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(await leerError(response, porDefecto));
  return response.json();
}

const enviar = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

// ─── Super admin ───────────────────────────────────────────────────────────

export const getPlanes = () => pedir<Plan[]>('/tenancy/planes', 'No se pudieron cargar los planes.');

export const editarPlan = (
  id: string,
  cambios: { nombre?: string; precioMensual?: number; maxActivos?: number | null; activo?: boolean },
) => pedir<Plan[]>(`/tenancy/planes/${id}`, 'No se pudo guardar el plan.', enviar('PATCH', cambios));

export const getPeriodos = () =>
  pedir<PeriodoPago[]>('/tenancy/periodos', 'No se pudieron cargar los períodos de pago.');

export const editarPeriodo = (codigo: string, cambios: { nombre?: string; descuento?: number; activo?: boolean }) =>
  pedir<PeriodoPago[]>(`/tenancy/periodos/${codigo}`, 'No se pudo guardar el período.', enviar('PATCH', cambios));

export const getPagosPlataforma = (desde: string, hasta: string) =>
  pedir<PagoPlataforma[]>(
    `/tenancy/suscripciones/pagos?desde=${desde}&hasta=${hasta}`,
    'No se pudieron cargar los pagos.',
  );

export const revisarVencimientos = () =>
  pedir<{ suspendidas: number; bajas: number; facturas: number }>(
    '/tenancy/suscripciones/revisar',
    'No se pudo revisar los vencimientos.',
    enviar('POST'),
  );

export const getSuscripcion = (empresaId: string) =>
  pedir<DetalleSuscripcion>(
    `/tenancy/empresas/${empresaId}/suscripcion`,
    'No se pudo cargar el plan de la empresa.',
  );

const deEmpresa = (empresaId: string, path = '') =>
  `/tenancy/empresas/${empresaId}/suscripcion${path}`;

export const asignarPlan = (empresaId: string, playaId: string, planId: string, precio?: number) =>
  pedir<DetalleSuscripcion>(
    deEmpresa(empresaId, `/playas/${playaId}`),
    'No se pudo asignar el plan.',
    enviar('PUT', { planId, ...(precio === undefined ? {} : { precio }) }),
  );

export const editarSuscripcion = (
  empresaId: string,
  cambios: { alta?: string; pagadoHasta?: string; bonificada?: boolean; notas?: string | null; periodo?: string },
) => pedir<DetalleSuscripcion>(deEmpresa(empresaId), 'No se pudo guardar.', enviar('PATCH', cambios));

// Da de alta la cuenta: desde qué día es cliente y cuántos días de prueba gratis (0 = sin prueba).
export const activarCuenta = (empresaId: string, alta: string, diasPrueba: number) =>
  pedir<DetalleSuscripcion>(
    deEmpresa(empresaId, '/alta'),
    'No se pudo dar el alta.',
    enviar('POST', { alta, diasPrueba }),
  );

// Más tiempo sin pagar: alarga la prueba si nunca pagó, o es una prórroga si ya paga.
export const darDiasExtra = (empresaId: string, hasta: string, motivo: string) =>
  pedir<DetalleSuscripcion>(
    deEmpresa(empresaId, '/dias-extra'),
    'No se pudieron dar los días extra.',
    enviar('POST', { hasta, motivo }),
  );

export type DatosPago = {
  meses: number;
  importe: number;
  medio: MedioPagoSaas;
  fecha: string;
  referencia?: string;
  nota?: string;
};

export const registrarPago = (empresaId: string, datos: DatosPago) =>
  pedir<DetalleSuscripcion>(deEmpresa(empresaId, '/pagos'), 'No se pudo registrar el pago.', enviar('POST', datos));

export const anularPago = (empresaId: string, facturaId: string, motivo: string) =>
  pedir<DetalleSuscripcion>(
    deEmpresa(empresaId, `/pagos/${facturaId}/anular`),
    'No se pudo anular el pago.',
    enviar('POST', { motivo }),
  );

// ─── Administrador de la empresa ───────────────────────────────────────────

export const getMiPlan = () => pedir<MiPlan>('/mi-plan', 'No se pudo cargar el plan.');

// El link de MercadoPago para pagar lo que debe (o adelantar el mes que viene).
export const pagarConMercadoPago = () =>
  pedir<{ id: string; url: string }>('/mi-plan/pagar', 'No pudimos armar el link de pago.', enviar('POST'));

// Con `tarjeta` (el token del formulario de MercadoPago) queda activo en el acto; sin ella devuelve
// el link de MercadoPago donde se confirma.
export const activarDebito = (email: string, tarjeta?: string) =>
  pedir<{ estado: 'pending' | 'authorized'; url: string | null }>(
    '/mi-plan/debito',
    'No pudimos activar el débito automático.',
    enviar('POST', { email, ...(tarjeta ? { tarjeta } : {}) }),
  );

export const desactivarDebito = () =>
  pedir<{ ok: true }>('/mi-plan/debito', 'No pudimos dar de baja el débito automático.', enviar('DELETE'));

// Al volver de MercadoPago: pregunta por los pagos de la empresa y asienta los aprobados.
export const verificarPagos = () =>
  pedir<{ acreditados: number }>('/mi-plan/verificar', 'No pudimos verificar el pago.', enviar('POST'));
