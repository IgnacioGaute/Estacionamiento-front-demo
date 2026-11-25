'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MedioPanel } from '@/types/panel.type';
import { corto, MEDIOS } from './utilidades';

const C = 140, R = 130, RI = 60, PAD = 0.03, SALIDA = 10;
// Las tramas de los presets de la librería de gráficos (cuadro de 6, línea de 1,25).
const TRAMAS = { diagonal: 'M-2 1L1 -2M-1 6L6 -1M4 7L7 4', horizontal: 'M0 5.5H6M0 -0.5H6', vertical: 'M5.5 0V6M-0.5 0V6' };

// Una porción de anillo con separación constante entre porciones (en el borde de afuera y el de adentro).
function porcion(a0: number, a1: number) {
  const po = PAD / 2, pi = (PAD / 2) * R / RI;
  const o0 = a0 + po, o1 = Math.max(o0 + 1e-4, a1 - po), i0 = a0 + pi, i1 = Math.max(i0 + 1e-4, a1 - pi);
  const p = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  const lo = o1 - o0 > Math.PI ? 1 : 0, li = i1 - i0 > Math.PI ? 1 : 0;
  return `M${p(R, o0)} A${R} ${R} 0 ${lo} 1 ${p(R, o1)} L${p(RI, i1)} A${RI} ${RI} 0 ${li} 0 ${p(RI, i0)} Z`;
}
const resorte = (t: number) => 1 - Math.pow(1 - t, 3) * Math.cos(t * 0.9);

// Cómo pagaron: un anillo de porciones con tramas (rayas, horizontales y verticales), que crecen
// una tras otra. La porción bajo el mouse sale hacia afuera y el centro muestra su monto.
export function PagosTramas({ porMedio, periodo }: { porMedio: Record<MedioPanel, number>; periodo: string }) {
  const uid = useId().replace(/:/g, '');
  const [activo, setActivo] = useState<number | null>(null);
  const total = MEDIOS.reduce((a, m) => a + (porMedio[m.clave] ?? 0), 0);
  let angulo = -Math.PI / 2;
  const porciones = MEDIOS.map((m, i) => {
    const valor = porMedio[m.clave] ?? 0;
    const parte = total ? valor / total : 0;
    const a0 = angulo, a1 = angulo + parte * Math.PI * 2;
    angulo = a1;
    const medio = (a0 + a1) / 2;
    return { ...m, i, valor, parte, d: parte > 0 ? porcion(a0, a1) : null, medio,
      cuadros: parte > 0 ? Array.from({ length: 13 }, (_, k) => porcion(a0, a0 + (a1 - a0) * Math.min(1, resorte(k / 12)))).join(';') : '' };
  });
  const firma = MEDIOS.map((m) => porMedio[m.clave] ?? 0).join('-');
  const a = activo !== null ? porciones[activo] : null;

  return (
    <section aria-labelledby={`${uid}-t`} className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 id={`${uid}-t`} className="text-sm font-medium text-muted-foreground">Cómo te pagaron</h2>
        <p className="text-[13px] text-gm-texto-tenue">{periodo}</p>
      </div>
      {total > 0 ? <>
        <div role="img" aria-label={`Cómo te pagaron: ${porciones.filter((p) => p.valor > 0).map((p) => `${p.nombre} ${Math.round(p.parte * 100)}%`).join(', ')}.`}
          className="relative mx-auto aspect-square w-full max-w-[260px]" onMouseLeave={() => setActivo(null)}>
          <svg key={firma} aria-hidden viewBox="0 0 280 280" className="h-full w-full overflow-visible">
            <defs>
              {porciones.map((p) => (
                <pattern key={p.clave} id={`${uid}-${p.clave}`} width="6" height="6" patternUnits="userSpaceOnUse" viewBox="0 0 6 6">
                  <path d={TRAMAS[p.trama]} fill="none" stroke={p.color} strokeWidth="1.25" />
                </pattern>
              ))}
            </defs>
            {porciones.map((p) => p.d && (
              <path key={p.clave} data-testid={`porcion-${p.clave}`} className="panel-porcion" d={p.d} fill={`url(#${uid}-${p.clave})`}
                style={{ transform: activo === p.i ? `translate(${(Math.cos(p.medio) * SALIDA).toFixed(2)}px, ${(Math.sin(p.medio) * SALIDA).toFixed(2)}px)` : 'translate(0px, 0px)', opacity: activo === null || activo === p.i ? 1 : 0.4 }}
                onMouseEnter={() => setActivo(p.i)} onClick={() => setActivo(p.i)}>
                <animate attributeName="d" values={p.cuadros} dur="0.62s" begin={`${(0.1 + p.i * 0.08).toFixed(2)}s`} fill="freeze" />
              </path>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="gm-tnum text-[19px] font-bold leading-none tracking-[-0.02em] sm:text-[21px]">{corto(a ? a.valor : total)}</span>
            <span className="mt-1 text-[11px] text-muted-foreground">{a ? a.nombre : 'Total'}</span>
          </div>
        </div>
        <ul className="space-y-1">
          {porciones.map((p) => (
            <li key={p.clave} onMouseEnter={() => setActivo(p.i)} onMouseLeave={() => setActivo(null)}
              className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-[background,opacity]', activo === p.i && 'bg-gm-surface-2', activo !== null && activo !== p.i && 'opacity-40')}>
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16"><rect x="0.75" y="0.75" width="14.5" height="14.5" rx="4" fill={`url(#${uid}-${p.clave})`} stroke={p.color} strokeWidth="1.5" /></svg>
              <span className="flex-1 text-gm-texto-2">{p.nombre}</span>
              <span className="gm-tnum font-mono text-muted-foreground">{corto(p.valor)}</span>
              <span className="gm-tnum w-10 text-right font-bold">{Math.round(p.parte * 100)}%</span>
            </li>
          ))}
        </ul>
      </> : <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">No hubo cobros en este período.</p>}
    </section>
  );
}
