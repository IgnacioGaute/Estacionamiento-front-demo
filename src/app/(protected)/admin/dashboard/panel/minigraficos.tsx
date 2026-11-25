'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { curva, porcentaje, variacion } from './utilidades';

export type Serie = { etiqueta: string; valor: number | null }[];
type Tipo = 'barras' | 'area' | 'linea';
const W = 280, H = 48;

// Un indicador con su minigráfico (barras, área o línea), como los de la librería de gráficos: sin
// ejes; al pasar el mouse, una línea punteada y el número de arriba pasa a ser el de ese tramo.
export function Minigrafico({ titulo, valor, nota, actual, anterior, serie, tipo, formato, sentido = 'sube' }: {
  titulo: string; valor: string; nota: string; actual: number | null; anterior: number | null | undefined;
  serie: Serie; tipo: Tipo; formato: (n: number) => string;
  // Si subir es bueno (verde), malo (rojo) o ninguna de las dos (la estadía: gris).
  sentido?: 'sube' | 'baja' | 'neutro';
}) {
  const uid = useId().replace(/:/g, '');
  const [activo, setActivo] = useState<number | null>(null);
  const cambio = actual !== null ? variacion(actual, anterior) : null;
  const tonoCambio = cambio === null || sentido === 'neutro' ? 'bg-gm-surface-2 text-gm-texto-2'
    : (sentido === 'baja' ? cambio <= 0 : cambio >= 0) ? 'bg-gm-ok/10 text-gm-ok' : 'bg-gm-falta/10 text-[#FF8A7D]';
  const puntos = serie.filter((s) => s.valor !== null);
  const dibuja = serie.length >= 2 && puntos.length >= 2;
  const vals = serie.map((s) => s.valor ?? 0);
  const min = tipo === 'barras' ? 0 : Math.min(...puntos.map((s) => s.valor!));
  const max = Math.max(...vals, 1);
  const rango = max - min || 1;
  const pts = serie.map((s, i) => [4 + (i / Math.max(1, serie.length - 1)) * (W - 8), H - 4 - (((s.valor ?? min) - min) / rango) * (H - 10)] as [number, number]);
  const linea = curva(pts);
  const ancho = (W - 8) / Math.max(1, serie.length);
  const marcado = activo ?? serie.length - 1;
  const xActivo = activo === null ? 0 : tipo === 'barras' ? ((4 + (activo + 0.5) * ancho) / W) * 100 : (pts[activo][0] / W) * 100;

  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-[24px] border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] text-muted-foreground">{titulo}</p>
          <p className="gm-tnum text-[26px] font-bold tracking-[-0.02em]">{activo !== null && serie[activo].valor !== null ? formato(serie[activo].valor!) : valor}</p>
          <p className="text-xs text-gm-texto-tenue first-letter:uppercase">{activo !== null ? serie[activo].etiqueta : nota}</p>
        </div>
        {cambio !== null && (
          <span className={cn('inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold', tonoCambio)}>
            <span aria-hidden>{cambio >= 0 ? '▲' : '▼'}</span>{porcentaje(cambio)}
          </span>
        )}
      </div>
      {dibuja ? (
        <div role="img" aria-label={`${titulo}: ${valor}.`} className="relative h-12" onMouseLeave={() => setActivo(null)}>
          <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-12 w-full overflow-visible">
            <defs><linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F5C419" stopOpacity="0.3" /><stop offset="100%" stopColor="#F5C419" stopOpacity="0" /></linearGradient></defs>
            {tipo === 'barras' && serie.map((s, i) => {
              const h = Math.max(3, ((s.valor ?? 0) / max) * (H - 6));
              return <rect key={i} className="panel-crecer" x={4 + i * ancho + 1} y={H - h} width={Math.max(1, ancho - 3)} height={h} rx={2} fill="#F5C419"
                opacity={activo === null || activo === i ? 1 : 0.4} style={{ animationDelay: `${i * 30}ms` }} />;
            })}
            {tipo === 'area' && <path className="panel-barrido" d={`${linea} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`} fill={`url(#${uid}-g)`} />}
            {tipo !== 'barras' && <path className="panel-trazo" d={linea} fill="none" stroke="#F5C419" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray="100 100" />}
          </svg>
          {tipo !== 'barras' && <div aria-hidden className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gm-yellow shadow-[0_0_0_3px_hsl(var(--card))]"
            style={{ left: `${(pts[marcado][0] / W) * 100}%`, top: `${(pts[marcado][1] / H) * 100}%` }} />}
          {activo !== null && <div aria-hidden className="absolute -inset-y-1 border-l border-dashed border-gm-texto-tenue" style={{ left: `${xActivo}%` }} />}
          <div className="absolute inset-0 flex">
            {serie.map((s, i) => <div key={i} className="flex-1" onMouseEnter={() => setActivo(i)} onClick={() => setActivo(i)} />)}
          </div>
        </div>
      ) : <div className="h-12" aria-hidden />}
    </div>
  );
}
