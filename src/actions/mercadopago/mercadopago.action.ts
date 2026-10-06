'use server';

import {
  aceptarCondicionesMercadoPago,
  cancelarCobroMercadoPago,
  conectarMercadoPago,
  crearCajaQr,
  crearCajaQrConUbicacion,
  consultarCobroMercadoPago,
  crearCobroMercadoPago,
  desconectarMercadoPago,
  getCajasQr,
  getCiudadesQr,
  getEstadoMercadoPago,
  getProvinciasQr,
  iniciarConexionMercadoPago,
} from '@/services/mercadopago.service';
import type { DireccionCaja } from '@/types/mercadopago.type';

const mensaje = (error: unknown, porDefecto: string) =>
  error instanceof Error ? error.message : porDefecto;

export async function getEstadoMercadoPagoAction() {
  try {
    return { estado: await getEstadoMercadoPago() };
  } catch (error) {
    return {
      error: mensaje(error, 'No se pudo consultar la cuenta de MercadoPago.'),
    };
  }
}

export async function iniciarConexionMercadoPagoAction(condiciones: string) {
  try {
    return { url: (await iniciarConexionMercadoPago(condiciones)).url };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo iniciar la conexión.') };
  }
}

export async function aceptarCondicionesMercadoPagoAction(condiciones: string) {
  try {
    return { estado: await aceptarCondicionesMercadoPago(condiciones) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudieron aceptar las condiciones.') };
  }
}

export async function conectarMercadoPagoAction(code: string, state: string) {
  try {
    return { estado: await conectarMercadoPago(code, state) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo conectar la cuenta.') };
  }
}

export async function crearCobroMercadoPagoAction(
  registrationId: string,
  tipo: 'HORA' | 'ABONO' | 'INQUILINO' = 'HORA',
  inquilino?: { monto: number; receiptIds?: string[]; nota?: string },
) {
  try {
    return { cobro: await crearCobroMercadoPago(registrationId, tipo, inquilino) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo generar el QR.') };
  }
}

export async function consultarCobroMercadoPagoAction(id: string) {
  try {
    return { cobro: await consultarCobroMercadoPago(id) };
  } catch (error) {
    return {
      error: mensaje(error, 'No se pudo consultar el estado del pago.'),
    };
  }
}

export async function cancelarCobroMercadoPagoAction(id: string) {
  try {
    return { cobro: await cancelarCobroMercadoPago(id) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo cancelar el cobro.') };
  }
}

export async function desconectarMercadoPagoAction() {
  try {
    return { estado: await desconectarMercadoPago() };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo desconectar la cuenta.') };
  }
}

export async function getCajasQrAction() {
  try {
    return { cajas: await getCajasQr() };
  } catch (error) {
    return { error: mensaje(error, 'No se pudieron cargar las cajas.') };
  }
}

export async function crearCajaQrAction(playaId: string, direccion: DireccionCaja) {
  try {
    return { cajas: await crearCajaQr(playaId, direccion) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo crear la caja.') };
  }
}

export async function getProvinciasQrAction() {
  try {
    return { lista: await getProvinciasQr() };
  } catch (error) {
    return { error: mensaje(error, 'No se pudieron cargar las provincias.') };
  }
}

export async function getCiudadesQrAction(provinciaId: string) {
  try {
    return { lista: await getCiudadesQr(provinciaId) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudieron cargar las ciudades.') };
  }
}

export async function crearCajaQrConUbicacionAction(playaId: string, latitud: number, longitud: number) {
  try {
    return { resultado: await crearCajaQrConUbicacion(playaId, latitud, longitud) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo crear la caja.') };
  }
}
