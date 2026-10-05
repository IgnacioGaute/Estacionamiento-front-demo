import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';
import {
  PruebaPagos,
  PruebaReporteConfiguracion,
  PruebaReporteEstado,
  PruebaReporteLectura,
  PruebaReportePedido,
  VentanaPrueba,
} from '@/types/prueba-transferencias.type';

// Solo el super admin, y el backend además solo la corre sobre cuentas de MercadoPago autorizadas
// para probar. No es la función comercial de verificación de transferencias.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const base = (empresaId: string) =>
  `${BASE_URL}/tenancy/empresas/${empresaId}/mercadopago/prueba-transferencias`;

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
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

export const pruebaPagos = (empresaId: string, minutos: VentanaPrueba) =>
  pedir<PruebaPagos>(`${base(empresaId)}/pagos?minutos=${minutos}`);

export const pruebaReporteEstado = (empresaId: string) =>
  pedir<PruebaReporteEstado>(`${base(empresaId)}/reporte`);

export const pruebaPedirReporte = (empresaId: string, minutos: VentanaPrueba) =>
  pedir<PruebaReportePedido>(`${base(empresaId)}/reporte`, {
    method: 'POST',
    body: JSON.stringify({ minutos }),
  });

export const pruebaConfigurarReporte = (empresaId: string) =>
  pedir<PruebaReporteConfiguracion>(`${base(empresaId)}/reporte/configuracion`, { method: 'POST' });

export const pruebaLeerReporte = (empresaId: string, nombre: string) =>
  pedir<PruebaReporteLectura>(`${base(empresaId)}/reporte/archivo?nombre=${encodeURIComponent(nombre)}`);
