import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

// «8 min», «3 h 05 min», «12 d 13 h». Más de un día en horas («301 h») no se lee de un vistazo.
export function formatEstadia(minutos: number): string {
  const m = Math.max(0, Math.floor(minutos));
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  const dias = Math.floor(m / (24 * 60));
  const horas = Math.floor((m % (24 * 60)) / 60);
  return horas ? `${dias} d ${horas} h` : `${dias} d`;
}

// «16:26», «ayer 16:26» o «03/10 16:26»: la hora sola alcanza para lo de hoy.
export function cuandoEntro(r: { entryDay?: string | null; entryTime?: string | null }, ahora = dayjs().tz(TZ)): string {
  const hora = r.entryTime?.slice(0, 5) ?? '';
  if (!r.entryDay) return hora;
  if (r.entryDay === ahora.format('YYYY-MM-DD')) return hora;
  if (r.entryDay === ahora.subtract(1, 'day').format('YYYY-MM-DD')) return `ayer ${hora}`;
  return `${dayjs(r.entryDay).format('DD/MM')} ${hora}`;
}

// Los tramos de «hace cuánto están» del inicio.
export type Tramo = 'menos1' | 'de1a4' | 'mas4';
export function tramoDe(minutos: number): Tramo {
  if (minutos < 60) return 'menos1';
  if (minutos < 4 * 60) return 'de1a4';
  return 'mas4';
}

// Cada tramo tiene su color en todo el inicio (la línea de tiempo del celular, las columnas de la
// computadora y cada vehículo), así el color solo ya dice hace cuánto entró. El naranja queda
// reservado para avisar: nunca es un tramo. El último no tiene techo: `hasta` es solo la escala.
export const TRAMOS: { id: Tramo; label: string; color: string; desde: number; hasta: number }[] = [
  { id: 'menos1', label: 'Menos de 1 h', color: '#34D399', desde: 0, hasta: 60 },
  { id: 'de1a4', label: 'De 1 a 4 h', color: '#60A5FA', desde: 60, hasta: 4 * 60 },
  { id: 'mas4', label: 'Más de 4 h', color: '#A78BFA', desde: 4 * 60, hasta: 12 * 60 },
];

export function tramoInfo(minutos: number) {
  const id = tramoDe(minutos);
  return TRAMOS.find((t) => t.id === id) ?? TRAMOS[0];
}

// Cuánto avanzó dentro de su tramo (0 a 1): la línea de cada vehículo se llena a medida que se
// acerca al tramo siguiente.
export function progresoEnTramo(minutos: number): number {
  const t = tramoInfo(minutos);
  return Math.min(1, Math.max(0, (minutos - t.desde) / (t.hasta - t.desde)));
}

// Minutos entre la entrada y la salida de una estadía ya cerrada.
export function minutosDeEstadia(r: { entryDay?: string | null; entryTime?: string | null; departureDay?: string | null; departureTime?: string | null }): number | null {
  if (!r.entryDay || !r.entryTime || !r.departureDay || !r.departureTime) return null;
  const entrada = dayjs.tz(`${r.entryDay} ${r.entryTime}`, 'YYYY-MM-DD HH:mm:ss', TZ);
  const salida = dayjs.tz(`${r.departureDay} ${r.departureTime}`, 'YYYY-MM-DD HH:mm:ss', TZ);
  if (!entrada.isValid() || !salida.isValid()) return null;
  return Math.max(0, salida.diff(entrada, 'minute'));
}
