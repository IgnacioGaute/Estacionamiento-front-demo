import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  PruebaDetallePago,
  PruebaPagos,
  PruebaReporteConfiguracion,
  PruebaReporteEstado,
  PruebaReporteLectura,
  PruebaReportePedido,
  VentanaPrueba,
} from '@/types/prueba-transferencias.type';

// La prueba de transferencias de la empresa sobre su propia cuenta de MercadoPago. El backend la
// corre solo para un administrador de la empresa y solo con las condiciones aceptadas; la cuenta
// es siempre la de la sesión. No es la función comercial.

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/mercadopago/prueba-transferencias`;

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) {
    let mensaje = 'No se pudo consultar a MercadoPago.';
    try {
      const data = await response.json();
      mensaje = Array.isArray(data?.message) ? data.message.join('. ') : (data?.message ?? mensaje);
    } catch {
      // Sin cuerpo legible queda el mensaje genérico.
    }
    throw new Error(mensaje);
  }
  return response.json();
}

export const pruebaPagos = (minutos: VentanaPrueba) => pedir<PruebaPagos>(`${BASE}/pagos?minutos=${minutos}`);

export const pruebaDetallePago = (operacionId: string) =>
  pedir<PruebaDetallePago>(`${BASE}/pagos/${encodeURIComponent(operacionId)}`);

export const pruebaReporteEstado = () => pedir<PruebaReporteEstado>(`${BASE}/reporte`);

export const pruebaPedirReporte = (minutos: VentanaPrueba) =>
  pedir<PruebaReportePedido>(`${BASE}/reporte`, { method: 'POST', body: JSON.stringify({ minutos }) });

export const pruebaConfigurarReporte = () =>
  pedir<PruebaReporteConfiguracion>(`${BASE}/reporte/configuracion`, { method: 'POST' });

export const pruebaLeerReporte = (nombre: string) =>
  pedir<PruebaReporteLectura>(`${BASE}/reporte/archivo?nombre=${encodeURIComponent(nombre)}`);
