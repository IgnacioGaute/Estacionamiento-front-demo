'use client';

import { useSyncExternalStore } from 'react';

// El último cobro en efectivo confirmado por el servidor en este equipo: queda a la vista en la
// pantalla de operación mientras se entrega el vuelto, sin bloquear la salida siguiente. Lo publican
// los flujos de cobro (salida, «Se fue antes», parte en efectivo de un pago mixto, pases) recién
// cuando el servidor confirmó el guardado, con el importe, lo recibido y el vuelto que devolvió.
//
// Es del equipo y de la playa: se guarda en sessionStorage por playa (sobrevive a recargar la página,
// no a cerrar la pestaña) y nunca se muestra en otra playa. Deja de mostrarse a los 30 minutos.
export type UltimoCobro = {
  tipo: 'ESTADIA' | 'PASE';
  // Estadía o pase, para corregir ese cobro desde la franja.
  registroId: string;
  identificacion: string;
  // Lo cobrado ahora por todos los medios y la parte en efectivo.
  total: number;
  efectivo: number;
  medio: string;
  recibido: number | null;
  vuelto: number | null;
  en: number;
  playaId: string;
  // Se corrigió desde la franja: aplicada (con lo que quedó vigente) o enviada a revisión.
  correccion?: 'APLICADA' | 'PENDIENTE';
};

const VIGENCIA = 30 * 60_000;
// La playa de la pantalla de operación (la marca la franja al mostrarse). Los cobros que se abren
// desde ahí la usan si no la pasan explícitamente.
let playaActual = '';
const clave = (playaId: string) => `ultimo-cobro:${playaId}`;
let actual: UltimoCobro | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

function leer(playaId: string): UltimoCobro | null {
  if (actual?.playaId === playaId) return actual;
  try {
    const guardado = typeof window !== 'undefined' ? window.sessionStorage.getItem(clave(playaId)) : null;
    actual = guardado ? (JSON.parse(guardado) as UltimoCobro) : null;
  } catch {
    actual = null;
  }
  return actual?.playaId === playaId ? actual : null;
}

function guardar(cobro: UltimoCobro | null, playaId: string) {
  actual = cobro;
  try {
    if (cobro) window.sessionStorage.setItem(clave(playaId), JSON.stringify(cobro));
    else window.sessionStorage.removeItem(clave(playaId));
  } catch {
    // Sin almacenamiento (ventana privada) queda solo en memoria.
  }
  avisar();
}

export function publicarUltimoCobro(cobro: Omit<UltimoCobro, 'en' | 'playaId'> & { playaId?: string }) {
  const playaId = cobro.playaId || playaActual;
  if (!playaId) return;
  guardar({ ...cobro, playaId, en: Date.now() }, playaId);
}

export function descartarUltimoCobro(playaId: string) {
  guardar(null, playaId);
}

// Una corrección hecha desde la franja. Si corrigió lo recibido y el vuelto, la franja muestra lo
// vigente: es lo que se consulta mientras se da el cambio.
export function marcarCorreccion(playaId: string, correccion: { estado: 'APLICADA' | 'PENDIENTE' | 'RECHAZADA'; recibido?: number; vuelto?: number }) {
  const cobro = leer(playaId);
  if (!cobro || correccion.estado === 'RECHAZADA') return;
  guardar({
    ...cobro, correccion: correccion.estado,
    ...(correccion.estado === 'APLICADA' && correccion.recibido !== undefined ? { recibido: correccion.recibido, vuelto: correccion.vuelto ?? 0 } : {}),
  }, playaId);
}

export function useUltimoCobro(playaId: string, ahora = Date.now()): UltimoCobro | null {
  playaActual = playaId;
  const cobro = useSyncExternalStore(
    (oyente) => { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; },
    () => (playaId ? leer(playaId) : null),
    () => null,
  );
  return cobro && ahora - cobro.en < VIGENCIA ? cobro : null;
}
