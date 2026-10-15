import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { Ticket } from '@/types/ticket.type';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

// `ticket.ticketRegistration` on the catalog entity doesn't reliably reflect
// the most recent scan, so match against the live registrations list instead
// — day tickets link back via `registration.ticket`, hourly ones via the
// scanned barcode itself.
export function latestRegistrationForTicket(t: Ticket, registrations: TicketRegistration[]) {
  const matches = registrations.filter(
    (r) => r.ticket?.id === t.id || r.codeBarTicket === t.codeBar
  );
  if (matches.length === 0) return null;
  return matches.reduce((latest, r) =>
    new Date(r.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? r : latest
  );
}

// A catalog ticket is active (still in the lot) until its latest registration
// has its departure scanned.
export function isTicketActive(t: Ticket, registrations: TicketRegistration[]) {
  const latest = latestRegistrationForTicket(t, registrations);
  return !!latest && !latest.departureTime && !latest.departureDay;
}

// Mezcla un registro recibido en vivo (por websocket) dentro de la lista local: lo reemplaza
// por id si ya existe, o lo agrega si es nuevo. Si ya existe, solo lo pisa cuando el que llega
// es igual o más nuevo (`updatedAt`) — evita que una actualización vieja, entregada tarde por
// la red, tape un dato más fresco que ya haya llegado por otro camino (ej. router.refresh()).
export function upsertRegistration(
  list: TicketRegistration[],
  incoming: TicketRegistration & { eliminada?: boolean }
): TicketRegistration[] {
  // Una estadía cargada por error que el administrador eliminó: sale de la lista.
  if (incoming.eliminada) return list.filter((r) => r.id !== incoming.id);
  const index = list.findIndex((r) => r.id === incoming.id);
  if (index === -1) {
    return [...list, incoming];
  }
  const existing = list[index];
  if (new Date(incoming.updatedAt).getTime() < new Date(existing.updatedAt).getTime()) {
    return list;
  }
  const next = [...list];
  next[index] = { ...existing, ...incoming };
  return next;
}

// Junta la lista que acaba de traer el servidor con la local. El servidor devuelve los vehículos
// adentro más el último movimiento de la playa, así que manda sobre quién está adentro: un
// vehículo que acá figura adentro y allá no, salió o se eliminó mientras se perdían avisos. De lo
// que solo está acá se conservan las salidas (alimentan «Últimos movimientos») y lo que cambió
// después de esa foto, que llegó por websocket mientras se pedía la lista. La foto es el
// `updatedAt` más nuevo que trae el servidor: incluye el último movimiento de toda la playa.
export function mergeServerSnapshot(local: TicketRegistration[], server: TicketRegistration[]): TicketRegistration[] {
  const at = (r: TicketRegistration) => new Date(r.updatedAt).getTime();
  const foto = server.reduce((max, r) => Math.max(max, at(r)), -Infinity);
  const locales = new Map(local.map((r) => [r.id, r]));
  const merged = server.map((r) => {
    const propio = locales.get(r.id);
    return propio && at(propio) > at(r) ? propio : r;
  });
  const enServidor = new Set(server.map((r) => r.id));
  for (const r of local) {
    if (enServidor.has(r.id)) continue;
    if (at(r) > foto || r.departureTime || r.departureDay) merged.push(r);
  }
  return merged;
}

// true si un registro activo (sin salida) avisó una duración esperada y ya la superó, según
// la hora actual del navegador. No depende del servidor: entryDay/entryTime/expectedUptoMinutes
// ya viajan en cada registro, así que alcanza con comparar contra `nowMs`.
export function isOverdue(registration: TicketRegistration, nowMs: number): boolean {
  if (registration.departureTime || registration.departureDay) return false;
  if (registration.expectedUptoMinutes == null) return false;
  if (!registration.entryDay || !registration.entryTime) return false;

  const entryAt = dayjs.tz(
    `${registration.entryDay} ${registration.entryTime}`,
    'YYYY-MM-DD HH:mm:ss',
    TZ
  );
  if (!entryAt.isValid()) return false;

  const dueAt = entryAt.add(registration.expectedUptoMinutes, 'minute');
  return nowMs > dueAt.valueOf();
}

// Minutos transcurridos desde la entrada, contra la hora actual del navegador — para mostrar
// "hace X min" en la lista de activos sin pedirle nada al servidor.
// Una estadía que ya pagó un anticipo: el operador tiende a dejarla ir sin registrar la salida
// («ya pagó») y queda abierta para siempre. El tablero la marca: cuánto pagó, hasta qué hora le
// alcanza (si avisó una duración) y si ya se pasó. El cierre sigue siendo manual: el auto puede
// quedarse más de lo pagado y hay que cobrarle la diferencia.
export function anticipoDe(registration: TicketRegistration, nowMs: number): { monto: number; hasta: string | null; vencido: boolean } | null {
  const monto = Number(registration.advancePaidAmount ?? 0);
  if (!(monto > 0) || registration.departureTime || registration.departureDay) return null;
  let hasta: string | null = null;
  if (registration.expectedUptoMinutes != null && registration.entryDay && registration.entryTime) {
    const entryAt = dayjs.tz(`${registration.entryDay} ${registration.entryTime}`, 'YYYY-MM-DD HH:mm:ss', TZ);
    if (entryAt.isValid()) hasta = entryAt.add(registration.expectedUptoMinutes, 'minute').format('HH:mm');
  }
  return { monto, hasta, vencido: isOverdue(registration, nowMs) };
}

export function minutesSinceEntry(registration: TicketRegistration, nowMs: number): number | null {
  if (!registration.entryDay || !registration.entryTime) return null;
  const entryAt = dayjs.tz(
    `${registration.entryDay} ${registration.entryTime}`,
    'YYYY-MM-DD HH:mm:ss',
    TZ
  );
  if (!entryAt.isValid()) return null;
  return Math.max(0, Math.floor((nowMs - entryAt.valueOf()) / 60000));
}

// Un registro es de origen "código de barras" si tiene `ticket` poblado (entrada abierta) o
// `codeBarTicket` (ya cerrada) — ninguno de los dos se setea jamás en un registro por patente.
export function isBarcodeOrigin(r: TicketRegistration): boolean {
  return r.entryMode === 'BARCODE' || !!r.ticket || !!r.codeBarTicket;
}

export function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
