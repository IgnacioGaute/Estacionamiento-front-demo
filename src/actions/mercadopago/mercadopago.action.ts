'use server';

import {
  cancelarCobroMercadoPago,
  conectarMercadoPago,
  consultarCobroMercadoPago,
  crearCobroMercadoPago,
  desconectarMercadoPago,
  getEstadoMercadoPago,
  iniciarConexionMercadoPago,
} from '@/services/mercadopago.service';

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

export async function iniciarConexionMercadoPagoAction() {
  try {
    return { url: (await iniciarConexionMercadoPago()).url };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo iniciar la conexión.') };
  }
}

export async function conectarMercadoPagoAction(code: string, state: string) {
  try {
    return { estado: await conectarMercadoPago(code, state) };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo conectar la cuenta.') };
  }
}

export async function crearCobroMercadoPagoAction(registrationId: string) {
  try {
    return { cobro: await crearCobroMercadoPago(registrationId) };
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
