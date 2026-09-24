import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

// Series diarias de los paneles de plataforma. Viven acá porque las usan la pantalla de métricas
// y la ficha de empresa, y las dos tienen que leer las fechas igual que el backend.

// El eje del gráfico: los últimos `dias` días en fechas de Argentina, que es como el backend
// agrupa. Con `toISOString()` la clave se corría un día entre las 21 y la medianoche local y la
// serie quedaba desfasada.
export function eje(dias: number) {
  const hoy = dayjs().tz(TZ).startOf('day');
  return Array.from({ length: dias }, (unused, i) =>
    hoy.subtract(dias - 1 - i, 'day'),
  );
}

// Serie de longitud fija: si un día no tuvo movimientos no viene en la consulta y el gráfico
// tiene que dibujarlo igual, en cero. `corrimiento` superpone el período anterior sobre el eje
// actual: sus fechas son `dias` días más viejas, así que sin correrlas no coincide ninguna y la
// línea de comparación salía plana en cero.
export function completar(
  serie: { dia: string; total: number }[],
  dias: dayjs.Dayjs[],
  corrimiento = 0,
) {
  const mapa = new Map(serie.map((s) => [s.dia, s.total]));
  return dias.map(
    (d) => mapa.get(d.subtract(corrimiento, 'day').format('YYYY-MM-DD')) ?? 0,
  );
}

// Sparkline de un KPI: sin ejes ni escala, sólo la forma. La base es el mínimo de la serie y no
// el cero, porque lo que se lee acá es si sube o baja.
export function chispa(valores: number[]) {
  if (valores.length < 2) return '';
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  return valores
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (valores.length - 1)) * 220).toFixed(1)},${(
          34 -
          ((v - min) / Math.max(1, max - min)) * 30
        ).toFixed(1)}`,
    )
    .join(' ');
}

// Curva de una serie sobre un viewBox de `ancho`×`alto`, apoyada en el cero: acá sí importa
// cuánto, no sólo la forma.
export function curva(valores: number[], ancho: number, alto: number) {
  if (valores.length < 2) return '';
  const tope = Math.max(1, ...valores);
  return valores
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (valores.length - 1)) * ancho).toFixed(1)},${(
          alto -
          (v / tope) * (alto - 4)
        ).toFixed(1)}`,
    )
    .join(' ');
}
