'use server';

import {
  conectarMercadoPago,
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

export async function desconectarMercadoPagoAction() {
  try {
    return { estado: await desconectarMercadoPago() };
  } catch (error) {
    return { error: mensaje(error, 'No se pudo desconectar la cuenta.') };
  }
}
