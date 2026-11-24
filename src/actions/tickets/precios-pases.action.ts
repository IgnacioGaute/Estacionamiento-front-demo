'use server';

import { getTicketsPrice } from '@/services/tickets.service';

export type PrecioPase = { ticketTimeType: string; vehicleType: string; ticketTimePrice: number };

// Las tarifas por día, semana y mes, para mostrar el total de una estadía larga antes de cobrarla
// en efectivo (y calcular con cuánto paga). Es solo para la pantalla: el servidor calcula el precio
// al registrarla y valida lo recibido contra ese precio.
export async function preciosPasesAction(): Promise<PrecioPase[] | null> {
  try {
    const data = await getTicketsPrice();
    if (!data) return null;
    return data.data
      .filter((p) => p.ticketTimeType && p.vehicleType)
      .map((p) => ({ ticketTimeType: p.ticketTimeType!, vehicleType: p.vehicleType!, ticketTimePrice: p.ticketTimePrice }));
  } catch {
    return null;
  }
}
