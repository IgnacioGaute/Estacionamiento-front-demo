'use client';

// Autos por hora que llevan mucho adentro. Pasadas las 4 h casi siempre es uno que se fue sin
// registrar la salida (o se quedó y hay que cobrarle más): pasó con seis autos en un día que nadie
// miró el tablero. A las 2 h solo se informa, sin pedir nada.
//
// «Sigue en la playa» se guarda en este dispositivo y vence a las CONFIRMACION_MS: lo leen la franja
// del inicio, la lista de Cobrar salida, el aviso al cruzar las 4 h y el repaso del cierre, así lo
// confirmado en un lugar no se vuelve a preguntar en otro.

import { useCallback, useEffect, useState } from 'react';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { minutesSinceEntry } from '@/utils/ticket-registration.utils';

export const HORAS_ESTADIA_LARGA = 4;
export const HORAS_AVISO_SUAVE = 2;
// Si el auto sigue adentro, se vuelve a preguntar pasado este tiempo.
export const CONFIRMACION_MS = 4 * 60 * 60 * 1000;
const CLAVE = 'estadias-confirmadas';
const EVENTO = 'estadias-confirmadas';

export const estaAdentro = (r: TicketRegistration) => !r.departureTime && !r.departureDay;

const conMinutos = (registros: TicketRegistration[], ahora: number) =>
  registros.filter(estaAdentro).map((r) => ({ r, minutos: minutesSinceEntry(r, ahora) ?? 0 }));

export function estadiasLargas(registros: TicketRegistration[], ahora: number) {
  return conMinutos(registros, ahora)
    .filter((e) => e.minutos >= HORAS_ESTADIA_LARGA * 60)
    .sort((a, b) => b.minutos - a.minutos);
}

// De 2 a 4 h: para tener en cuenta, nunca un aviso que salte.
export function estadiasDeDosHoras(registros: TicketRegistration[], ahora: number) {
  return conMinutos(registros, ahora)
    .filter((e) => e.minutos >= HORAS_AVISO_SUAVE * 60 && e.minutos < HORAS_ESTADIA_LARGA * 60)
    .sort((a, b) => b.minutos - a.minutos);
}

function leer(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function useConfirmadas() {
  const [hasta, setHasta] = useState<Record<string, number>>({});
  useEffect(() => {
    const cargar = () => setHasta(leer());
    cargar();
    window.addEventListener(EVENTO, cargar);
    window.addEventListener('storage', cargar);
    return () => {
      window.removeEventListener(EVENTO, cargar);
      window.removeEventListener('storage', cargar);
    };
  }, []);
  const confirmada = useCallback((id: string, ahora: number) => (hasta[id] ?? 0) > ahora, [hasta]);
  const confirmar = useCallback((ids: string[], sigue = true) => {
    const ahora = Date.now();
    const vigentes = Object.fromEntries(Object.entries({ ...hasta, ...leer() }).filter(([, h]) => h > ahora));
    for (const id of ids) {
      if (sigue) vigentes[id] = ahora + CONFIRMACION_MS;
      else delete vigentes[id];
    }
    setHasta(vigentes);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(vigentes));
      window.dispatchEvent(new Event(EVENTO));
    } catch {
      // Sin almacenamiento: queda confirmado solo en esta pantalla.
    }
  }, [hasta]);
  return { confirmada, confirmar };
}
