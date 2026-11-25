import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { MedioPanel, PanelResumen, VerPanel } from '@/types/panel.type';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TZ = 'America/Argentina/Buenos_Aires';
export const hoyAR = () => dayjs().tz(TZ).format('YYYY-MM-DD');

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const plata = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
// Para ejes y centros: $214 mil, $1,72 M.
export const corto = (n: number) => n >= 1_000_000 ? '$' + (n / 1_000_000).toFixed(2).replace('.', ',') + ' M'
  : n >= 1000 ? '$' + Math.round(n / 1000) + ' mil' : plata(n);
export const minutos = (m: number) => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
export const variacion = (actual: number, antes: number | null | undefined) => antes ? (actual - antes) / antes : null;
export const porcentaje = (c: number) => (Math.abs(c) * 100).toFixed(1).replace('.', ',') + '%';
export const diaLargo = (f: string) => { const d = dayjs(f); return `${DIAS[d.day()]} ${d.date()} de ${MESES_LARGOS[d.month()]}`; };
export const diaCorto = (f: string) => { const d = dayjs(f); return `${d.date()} ${MESES[d.month()]}`; };

export const MEDIOS: { clave: MedioPanel; nombre: string; color: string; trama: 'diagonal' | 'horizontal' | 'vertical' }[] = [
  { clave: 'CASH', nombre: 'Efectivo', color: '#c98500', trama: 'diagonal' },
  { clave: 'TRANSFER', nombre: 'Transferencia', color: '#3987e5', trama: 'horizontal' },
  { clave: 'MERCADOPAGO', nombre: 'QR', color: '#199e70', trama: 'vertical' },
];

// Curva suave (Catmull-Rom a Bézier) por los puntos, como la de los gráficos de líneas.
export function curva(puntos: [number, number][]) {
  return puntos.map((p, i) => {
    if (i === 0) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const p0 = puntos[i - 2] ?? puntos[i - 1], p1 = puntos[i - 1], p3 = puntos[i + 1] ?? p;
    const c = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6, p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6, p[0], p[1]];
    return 'C' + c.map((n) => n.toFixed(1)).join(' ');
  }).join(' ');
}

// ── Período ────────────────────────────────────────────────────────────────────

export type Atajo = { clave: string; nombre: string; desde: string; hasta: string };

export function atajos(hoy = hoyAR()): Atajo[] {
  const h = dayjs(hoy);
  const f = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
  return [
    { clave: 'hoy', nombre: 'Hoy', desde: hoy, hasta: hoy },
    { clave: 'ayer', nombre: 'Ayer', desde: f(h.subtract(1, 'day')), hasta: f(h.subtract(1, 'day')) },
    { clave: '7d', nombre: '7 días', desde: f(h.subtract(6, 'day')), hasta: hoy },
    { clave: '30d', nombre: '30 días', desde: f(h.subtract(29, 'day')), hasta: hoy },
    { clave: 'mes', nombre: 'Este mes', desde: f(h.startOf('month')), hasta: hoy },
    { clave: 'mes-anterior', nombre: 'Mes anterior', desde: f(h.subtract(1, 'month').startOf('month')), hasta: f(h.subtract(1, 'month').endOf('month')) },
    { clave: 'anio', nombre: 'Este año', desde: f(h.startOf('year')), hasta: hoy },
  ];
}

export function nombreRango(desde: string, hasta: string, hoy = hoyAR()) {
  const atajo = atajos(hoy).find((a) => a.desde === desde && a.hasta === hasta);
  if (atajo && ['hoy', 'ayer'].includes(atajo.clave)) return atajo.nombre;
  const d = dayjs(desde), h = dayjs(hasta);
  if (desde === hasta) return `${d.date()} de ${MESES_LARGOS[d.month()]} ${d.year()}`;
  const mismoAnio = d.year() === h.year();
  const izq = d.month() === h.month() && mismoAnio ? `${d.date()}` : `${d.date()} ${MESES[d.month()]}${mismoAnio ? '' : ' ' + d.year()}`;
  return `${izq} – ${h.date()} ${MESES[h.month()]} ${h.year()}`;
}

// Cómo se puede ver un período: por hora solo un día; por día hasta tres meses; por semana desde
// dos semanas; por mes desde dos meses.
export function vistasPosibles(dias: number): VerPanel[] {
  if (dias === 1) return ['hora'];
  return [dias <= 92 && 'dia', dias >= 14 && 'semana', dias >= 60 && 'mes'].filter(Boolean) as VerPanel[];
}
export function vistaPorDefecto(dias: number): VerPanel {
  return dias === 1 ? 'hora' : dias <= 45 ? 'dia' : dias <= 180 ? 'semana' : 'mes';
}

// ── Agrupar lo cobrado ─────────────────────────────────────────────────────────

export type Balde = { clave: string; etiqueta: string; corta: string; total: number; anterior: number | null };

export function agrupar(p: PanelResumen, ver: VerPanel): Balde[] {
  const anterior = p.cobrado.anterior;
  if (ver === 'hora' && p.cobrado.porHora) {
    // Hoy, hasta la hora en curso; otro día, las 24.
    const hasta = p.rango.desde === p.hoy.fecha ? p.hoy.horaActual : 23;
    return p.cobrado.porHora.slice(0, hasta + 1).map((total, h) => ({
      clave: String(h), etiqueta: `${String(h).padStart(2, '0')}:00 a ${String(h + 1).padStart(2, '0')}:00`, corta: `${String(h).padStart(2, '0')} h`,
      total, anterior: anterior?.porHora ? anterior.porHora[h] ?? 0 : null,
    }));
  }
  const grupos = new Map<string, Balde & { primero: string; ultimo: string }>();
  p.cobrado.porDia.forEach((d, i) => {
    const f = dayjs(d.fecha);
    const clave = ver === 'mes' ? f.format('YYYY-MM') : ver === 'semana' ? f.subtract((f.day() + 6) % 7, 'day').format('YYYY-MM-DD') : d.fecha;
    const g = grupos.get(clave) ?? { clave, etiqueta: '', corta: '', total: 0, anterior: anterior ? 0 : null, primero: d.fecha, ultimo: d.fecha };
    g.total += d.total;
    if (g.anterior !== null) g.anterior += anterior?.porDia[i]?.total ?? 0;
    g.ultimo = d.fecha;
    grupos.set(clave, g);
  });
  return [...grupos.values()].map(({ primero, ultimo, ...g }) => {
    const a = dayjs(primero), b = dayjs(ultimo);
    if (ver === 'mes') return { ...g, etiqueta: `${MESES_LARGOS[a.month()]} ${a.year()}`, corta: MESES[a.month()] };
    if (ver === 'semana') return { ...g, etiqueta: `Semana del ${diaCorto(primero)} al ${diaCorto(ultimo)}`, corta: `${a.date()}–${b.date()} ${MESES[b.month()]}` };
    return { ...g, etiqueta: diaLargo(primero), corta: p.rango.dias <= 8 ? `${DIAS_CORTOS[a.day()]} ${a.date()}` : diaCorto(primero) };
  });
}
