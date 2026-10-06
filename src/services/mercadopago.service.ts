import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  CajaConUbicacion,
  CajasQr,
  CobroMercadoPago,
  DireccionCaja,
  EstadoMercadoPago,
  UbicacionMp,
} from '@/types/mercadopago.type';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function leerError(
  response: Response,
  porDefecto: string,
): Promise<string> {
  try {
    const data = await response.json();
    return Array.isArray(data?.message)
      ? data.message.join('. ')
      : (data?.message ?? porDefecto);
  } catch {
    return porDefecto;
  }
}

export async function getEstadoMercadoPago(): Promise<EstadoMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/estado`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(
        response,
        'No se pudo consultar la cuenta de MercadoPago.',
      ),
    );
  return response.json();
}

/**
 * Devuelve la URL de MercadoPago a la que hay que mandar al admin para que autorice. Lleva la
 * versión de las condiciones que aceptó: sin la vigente, el backend no arma el link.
 */
export async function iniciarConexionMercadoPago(condiciones: string): Promise<{ url: string }> {
  const response = await fetch(`${BASE_URL}/mercadopago/conectar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ condiciones }),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, 'No se pudo iniciar la conexión.'),
    );
  return response.json();
}

/** Aceptar las condiciones vigentes con la cuenta ya conectada. */
export async function aceptarCondicionesMercadoPago(condiciones: string): Promise<EstadoMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/condiciones`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ condiciones }),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(await leerError(response, 'No se pudieron aceptar las condiciones.'));
  return response.json();
}

/** Canje del código que devuelve MercadoPago. El backend valida el `state` contra la sesión. */
export async function conectarMercadoPago(
  code: string,
  state: string,
): Promise<EstadoMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/callback`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ code, state }),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, 'No se pudo conectar la cuenta.'),
    );
  return response.json();
}

/**
 * Genera el QR de cobro. Para una estadía o un abono el importe no se manda: lo calcula el
 * servidor a partir de lo que falta cobrar, así un pedido manipulado no puede cobrar cualquier
 * cosa. Para un inquilino sí: puede pagar una parte o de más, y se asienta lo que MercadoPago
 * confirme que entró.
 */
export async function crearCobroMercadoPago(
  // Estadía o abono: su id. Inquilino: el id del cliente.
  registrationId: string,
  // HORA: estadía que se cobra al salir. ABONO: día, semana o mes, que se paga por adelantado.
  // INQUILINO: un pago a su cuenta corriente.
  tipo: 'HORA' | 'ABONO' | 'INQUILINO' = 'HORA',
  inquilino?: { monto: number; receiptIds?: string[]; nota?: string },
): Promise<CobroMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/cobros`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ registrationId, tipo, ...(inquilino ?? {}) }),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(await leerError(response, 'No se pudo generar el QR.'));
  return response.json();
}

/** Le pregunta a MercadoPago si este cobro entró. Es la verificación real, no un aviso. */
export async function consultarCobroMercadoPago(
  id: string,
): Promise<CobroMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/cobros/${id}`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, 'No se pudo consultar el estado del pago.'),
    );
  return response.json();
}

export async function cancelarCobroMercadoPago(
  id: string,
): Promise<CobroMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/cobros/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(await leerError(response, 'No se pudo cancelar el cobro.'));
  return response.json();
}

export async function desconectarMercadoPago(): Promise<EstadoMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/desconectar`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, 'No se pudo desconectar la cuenta.'),
    );
  return response.json();
}

/** Las playas y sus cajas de MercadoPago (administrador). */
export async function getCajasQr(): Promise<CajasQr> {
  const response = await fetch(`${BASE_URL}/mercadopago/cajas`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(await leerError(response, 'No se pudieron cargar las cajas.'));
  return response.json();
}

/** Crea la sucursal y la caja de MercadoPago de una playa, con su dirección. */
export async function crearCajaQr(playaId: string, direccion: DireccionCaja): Promise<CajasQr> {
  const response = await fetch(`${BASE_URL}/mercadopago/cajas`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ playaId, ...direccion }),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(await leerError(response, 'No se pudo crear la caja.'));
  return response.json();
}

async function pedirMp<T>(path: string, porDefecto: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await leerError(response, porDefecto));
  return response.json();
}

/** Provincias y ciudades como las acepta MercadoPago para la sucursal de una caja. */
export const getProvinciasQr = () =>
  pedirMp<UbicacionMp[]>('/mercadopago/cajas/provincias', 'No se pudieron cargar las provincias.');

export const getCiudadesQr = (provinciaId: string) =>
  pedirMp<UbicacionMp[]>(
    `/mercadopago/cajas/provincias/${encodeURIComponent(provinciaId)}/ciudades`,
    'No se pudieron cargar las ciudades.',
  );

/** Crea la caja de una playa con la ubicación del dispositivo, sin formulario. */
export const crearCajaQrConUbicacion = (playaId: string, latitud: number, longitud: number) =>
  pedirMp<CajaConUbicacion>('/mercadopago/cajas/con-ubicacion', 'No se pudo crear la caja.', {
    method: 'POST',
    body: JSON.stringify({ playaId, latitud, longitud }),
  });
