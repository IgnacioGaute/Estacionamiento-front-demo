'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { curva, plata, porcentaje, variacion, type Balde } from './utilidades';
import { animarCometa, type SerieCometa } from './cometa-canvas';

const W = 720, H = 240, X0 = 14, X1 = 706;
// Las paletas del cometa: la del período (la dorada de la librería) y una apagada para el comparado.
const PRIMARIA: SerieCometa['colores'] = ['#c8891a', '#ffd45e', '#f2a91f', '#ffe9a3'];
const SECUNDARIA: SerieCometa['colores'] = ['#5E5548', '#A59A8A', '#857B6D', '#D9D1C4'];

// Lo cobrado en el período: la línea se dibuja detrás de una cabeza brillante que deja chispas
// (el «cometa»), sobre un rayado diagonal que se desvanece arriba y abajo. Al pasar el mouse, una
// columna baja del punto, la línea se apaga salvo el tramo cercano y la fecha queda en una pastilla.
export function CobradoCometa({ titulo, baldes, total, anteriorTotal, compara, promedio }: {
  titulo: string; baldes: Balde[]; total: number; anteriorTotal: number | null; compara: string | null; promedio: string;
}) {
  const uid = useId().replace(/:/g, '');
  const [activo, setActivo] = useState<number | null>(null);
  const n = baldes.length;
  const hayComparacion = baldes.some((b) => b.anterior !== null);
  const geo = useMemo(() => {
    const valores = baldes.flatMap((b) => [b.total, ...(b.anterior !== null ? [b.anterior] : [])]);
    const max = Math.max(1, ...valores) * 1.1;
    const x = (i: number) => (n > 1 ? X0 + (i / (n - 1)) * (X1 - X0) : W / 2);
    const y = (v: number) => H - 18 - (v / max) * (H - 40);
    const puntos = baldes.map((b, i) => [x(i), y(b.total)] as [number, number]);
    const anteriores = hayComparacion ? baldes.map((b, i) => [x(i), y(b.anterior ?? 0)] as [number, number]) : null;
    return { puntos, linea: curva(puntos), anterior: anteriores ? curva(anteriores) : null, x, y };
  }, [baldes, n, hayComparacion]);
  const cambio = variacion(total, anteriorTotal);
  // Cambia la clave cuando cambian los datos: el cometa vuelve a pasar con cada filtro.
  const firma = baldes.map((b) => b.total).join('-');
  const etiquetas = useMemo(() => {
    if (n <= 8) return baldes.map((_, i) => i);
    const paso = Math.ceil(n / 6);
    const idx = baldes.map((_, i) => i).filter((i) => i % paso === 0);
    if (n - 1 - idx[idx.length - 1] < paso / 2) idx.pop();
    return [...idx, n - 1];
  }, [baldes, n]);

  const a = activo !== null ? baldes[activo] : null;
  const xa = activo !== null ? (geo.puntos[activo][0] / W) * 100 : 0;
  const ya = activo !== null ? (geo.puntos[activo][1] / H) * 100 : 0;
  const resalte = activo !== null ? curva(geo.puntos.slice(Math.max(0, activo - 2), Math.min(n, activo + 3))) : '';

  // La entrada: mientras pasa el cometa (canvas), la línea en SVG espera; después queda el SVG,
  // que en reposo se ve igual. Vuelve a pasar cada vez que cambian los datos.
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [cometa, setCometa] = useState(true);
  useEffect(() => {
    const canvas = lienzo.current;
    const sinMovimiento = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || n < 2 || sinMovimiento || /jsdom/i.test(navigator.userAgent)) { setCometa(false); return; }
    setCometa(true);
    const series: SerieCometa[] = [
      ...(geo.anterior ? [{ puntos: baldes.map((b, i) => [geo.x(i), geo.y(b.anterior ?? 0)] as [number, number]), colores: SECUNDARIA, ancho: 1.5, densidad: 3, spread: 110 }] : []),
      { puntos: geo.puntos, colores: PRIMARIA, ancho: 2.5, densidad: 7, spread: 150 },
    ];
    return animarCometa(canvas, series, canvas.getBoundingClientRect().width / W, () => setCometa(false));
    // La firma resume los datos: el efecto corre una vez por conjunto de datos.
  }, [firma, hayComparacion]);

  return (
    <section aria-labelledby={`${uid}-t`} className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <div className="space-y-1.5">
        <h2 id={`${uid}-t`} className="text-sm font-medium text-muted-foreground">{titulo}</h2>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="gm-tnum text-[40px] font-bold leading-none tracking-[-0.03em] sm:text-[44px]">{plata(total)}</span>
          {cambio !== null && (
            <span className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold', cambio >= 0 ? 'bg-gm-ok/10 text-gm-ok' : 'bg-gm-falta/10 text-[#FF8A7D]')}>
              <span aria-hidden>{cambio >= 0 ? '▲' : '▼'}</span>{cambio >= 0 ? 'Subió' : 'Bajó'} {porcentaje(cambio)}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">{compara ? `${compara} (${plata(anteriorTotal ?? 0)}) · ` : ''}{promedio}</p>
      </div>

      {n < 2 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Todavía no hay datos suficientes para dibujar la curva de este período.</p>
      ) : (
        <div>
          <div role="img" aria-label={`${titulo}: ${plata(total)}${cambio !== null ? `, ${cambio >= 0 ? 'subió' : 'bajó'} ${porcentaje(cambio)}` : ''}.`}
            className="relative aspect-[3/1] w-full" onMouseLeave={() => setActivo(null)}>
            <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="panel-aparecer absolute inset-0 h-full w-full">
              <defs>
                <pattern id={`${uid}-rayado`} width="6" height="6" patternUnits="userSpaceOnUse" viewBox="0 0 6 6"><path d="M-2 1L1 -2M-1 6L6 -1M4 7L7 4" fill="none" stroke="hsl(var(--gm-line-strong))" strokeWidth="1" /></pattern>
                <linearGradient id={`${uid}-fh`} x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="10%" stopColor="white" /><stop offset="90%" stopColor="white" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient>
                <linearGradient id={`${uid}-fv`} x1="0%" x2="0%" y1="0%" y2="100%"><stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="33%" stopColor="white" /><stop offset="67%" stopColor="white" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient>
                <mask id={`${uid}-mh`}><rect width={W} height={H} fill={`url(#${uid}-fh)`} /></mask>
                <mask id={`${uid}-m`}><g mask={`url(#${uid}-mh)`}><rect width={W} height={H} fill={`url(#${uid}-fv)`} /></g></mask>
              </defs>
              <rect width={W} height={H} fill={`url(#${uid}-rayado)`} mask={`url(#${uid}-m)`} />
              <path key={firma} className="panel-area" d={`${geo.linea} L${geo.puntos[n - 1][0].toFixed(1)} ${H} L${geo.puntos[0][0].toFixed(1)} ${H} Z`} fill={`url(#${uid}-a)`} opacity={a ? 0.35 : 1} />
            </svg>
            <div aria-hidden className="panel-indicador pointer-events-none absolute bottom-0 w-7 -translate-x-1/2 rounded-[4px] bg-gradient-to-b from-gm-yellow/30 to-gm-yellow/0"
              style={{ left: `${xa}%`, top: `${ya}%`, opacity: a ? 1 : 0 }} />
            <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" style={{ opacity: cometa ? 0 : 1 }}>
              <defs>
                {[['g', PRIMARIA], ['s', SECUNDARIA]].map(([id, colores]) => (
                  <linearGradient key={id as string} id={`${uid}-${id}`} gradientUnits="userSpaceOnUse" x1={X0} y1="0" x2={X1} y2="0">
                    {(colores as string[]).map((c, i) => <stop key={c} offset={`${(i / 3) * 100}%`} stopColor={c} />)}
                  </linearGradient>
                ))}
                <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F5C419" stopOpacity="0.12" /><stop offset="100%" stopColor="#F5C419" stopOpacity="0" /></linearGradient>
                <filter id={`${uid}-bl`} colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="-40" y="-40" width={W + 80} height={H + 80}><feGaussianBlur stdDeviation="3.5" /></filter>
              </defs>
              {[...(geo.anterior ? [{ d: geo.anterior, g: 's', ancho: 1.5 }] : []), { d: geo.linea, g: 'g', ancho: 2.5 }].map((l) => (
                <g key={l.g} opacity={a ? 0.25 : 1} style={{ transition: 'opacity 400ms ease-in-out' }}>
                  <path d={l.d} fill="none" stroke={`url(#${uid}-${l.g})`} strokeWidth={l.ancho * 1.5} strokeOpacity={a ? 0 : 0.6} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-bl)`} />
                  <path d={l.d} fill="none" stroke={`url(#${uid}-${l.g})`} strokeWidth={l.ancho} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
              {a && <path d={resalte} fill="none" stroke={`url(#${uid}-g)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
            <canvas ref={lienzo} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
            <div aria-hidden className="panel-indicador pointer-events-none absolute grid size-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gm-yellow/20"
              style={{ left: `${xa}%`, top: `${ya}%`, opacity: a ? 1 : 0 }}><span className="size-2.5 rounded-full bg-gm-yellow" /></div>
            <div role="status" className="panel-indicador pointer-events-none absolute z-10 min-w-[180px] rounded-xl border border-border bg-popover shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
              style={{ left: `${xa}%`, top: `${ya}%`, opacity: a ? 1 : 0, transform: xa > 62 ? 'translate(calc(-100% - 22px), -50%)' : 'translate(22px, -50%)' }}>
              {a && <>
                <div className="whitespace-nowrap border-b border-border px-3.5 py-2.5 text-[13px] font-semibold first-letter:uppercase">{a.etiqueta}</div>
                <div className="space-y-1 px-3.5 py-2.5 text-[13px]">
                  <div className="flex items-center gap-2 whitespace-nowrap"><span aria-hidden className="size-[7px] rounded-full bg-gm-yellow" /><span className="flex-1 text-muted-foreground">Cobrado</span><span className="gm-tnum font-bold">{plata(a.total)}</span></div>
                  {a.anterior !== null && <div className="flex items-center gap-2 whitespace-nowrap"><span aria-hidden className="size-[7px] rounded-full bg-[#A59A8A]" /><span className="flex-1 text-muted-foreground">Antes</span><span className="gm-tnum">{plata(a.anterior)}</span></div>}
                </div>
              </>}
            </div>
            <div className="absolute inset-0 flex">
              {baldes.map((b, i) => <div key={b.clave} data-testid="zona-cobrado" className="flex-1" onMouseEnter={() => setActivo(i)} onClick={() => setActivo(i)} />)}
            </div>
          </div>
          <div aria-hidden className="relative mt-1 h-7">
            {etiquetas.map((i, k) => (
              <span key={i} className={cn('absolute top-1.5 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground transition-opacity',
                // En el celular, una sí y una no (siempre la primera y la última), para que no se pisen.
                k > 0 && k < etiquetas.length - 1 && (etiquetas.length - 1 - k) % 2 === 1 && 'max-sm:hidden')}
                style={{ left: `${(geo.puntos[i][0] / W) * 100}%`, opacity: activo !== null && Math.abs(geo.puntos[i][0] - geo.puntos[activo][0]) < 60 ? 0 : 1 }}>{baldes[i].corta}</span>
            ))}
            <span className="panel-indicador absolute top-0 inline-flex h-7 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-foreground px-3.5 text-xs font-semibold text-background shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
              style={{ left: `${xa}%`, opacity: a ? 1 : 0 }}>{a?.corta}</span>
          </div>
          {hayComparacion && <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span aria-hidden className="h-0.5 w-4 rounded-full bg-[#A59A8A]" />Línea gris: el período con el que se compara</p>}
        </div>
      )}
    </section>
  );
}
