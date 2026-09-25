import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import { CobroMercadoPago, EstadoMercadoPago } from '@/types/mercadopago.type';

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

/** Devuelve la URL de MercadoPago a la que hay que mandar al admin para que autorice. */
export async function iniciarConexionMercadoPago(): Promise<{ url: string }> {
  const response = await fetch(`${BASE_URL}/mercadopago/conectar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(
      await leerError(response, 'No se pudo iniciar la conexión.'),
    );
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
 * Genera el QR de cobro de una estadía. El importe no se manda: lo calcula el servidor a partir
 * de lo que falta cobrar, así un pedido manipulado no puede cobrar cualquier cosa.
 */
export async function crearCobroMercadoPago(
  registrationId: string,
  // HORA: estadía que se cobra al salir. ABONO: día, semana o mes, que se paga por adelantado.
  tipo: 'HORA' | 'ABONO' = 'HORA',
): Promise<CobroMercadoPago> {
  const response = await fetch(`${BASE_URL}/mercadopago/cobros`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ registrationId, tipo }),
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
