'use client';

import { useId, useState } from 'react';

const C = 130, RIN = 58, LARGO = 46;
const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;
// Del ámbar oscuro al amarillo según cuántos autos había.
const tono = (t: number) => {
  const a = [122, 78, 0], b = [245, 196, 25], k = 0.25 + 0.75 * t;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
};

// Los autos adentro hoy, como un reloj de 24 horas: cada hora es una barra que sale del centro
// (más larga y más amarilla, más autos). No depende de la capacidad de la playa.
export function AutosAdentro({ porHora, ahora, entradas, salidas }: { porHora: number[]; ahora: number; entradas: number; salidas: number }) {
  const uid = useId().replace(/:/g, '');
  const [activa, setActiva] = useState<number | null>(null);
  const actual = porHora.length - 1;
  const max = Math.max(1, ...porHora);
  const pico = porHora.indexOf(Math.max(...porHora, 0));
  const barras = Array.from({ length: 24 }, (_, h) => {
    const ang = ((h + 0.5) / 24) * Math.PI * 2 - Math.PI / 2;
    const v = h <= actual ? porHora[h] : null;
    const fin = RIN + (v === null ? 4 : 4 + (v / max) * LARGO);
    const p = (r: number) => [C + r * Math.cos(ang), C + r * Math.sin(ang)].map((n) => n.toFixed(1));
    return { h, v, desde: p(RIN), hasta: p(fin), tope: p(RIN + 4 + LARGO) };
  });
  const marcas = [0, 6, 12, 18].map((h) => {
    const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
    return { h, x: C + 122 * Math.cos(ang), y: C + 122 * Math.sin(ang) };
  });
  const centro = activa !== null ? porHora[activa] : ahora;

  return (
    <section aria-labelledby={`${uid}-t`} className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 id={`${uid}-t`} className="text-sm font-medium text-muted-foreground">Autos adentro</h2>
        <p className="text-[13px] text-gm-texto-tenue">Hoy, hora por hora · no cambia con el período</p>
      </div>
      <div role="img" aria-label={`Autos adentro hoy, hora por hora. Ahora hay ${ahora}; lo más lleno fue a las ${hora(pico)} con ${porHora[pico] ?? 0}.`}
        className="relative mx-auto aspect-square w-full max-w-[260px]" onMouseLeave={() => setActiva(null)}>
        <svg aria-hidden viewBox="0 0 260 260" className="h-full w-full overflow-visible">
          <defs><filter id={`${uid}-b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter></defs>
          <circle cx={C} cy={C} r={50} fill="none" stroke="hsl(var(--gm-line))" strokeWidth="1" />
          {barras.map((b) => (
            <g key={b.h}>
              <line x1={b.desde[0]} y1={b.desde[1]} x2={b.tope[0]} y2={b.tope[1]} stroke="hsl(var(--gm-surface-2))" strokeWidth="7" strokeLinecap="round" />
              {b.v !== null && b.h === actual && <line x1={b.desde[0]} y1={b.desde[1]} x2={b.hasta[0]} y2={b.hasta[1]} stroke="#F5C419" strokeWidth="9" strokeLinecap="round" filter={`url(#${uid}-b)`} opacity={0.7} />}
              {b.v !== null && <line className="panel-rayo" x1={b.desde[0]} y1={b.desde[1]} x2={b.hasta[0]} y2={b.hasta[1]} stroke={b.h === actual ? '#FFE58A' : tono(b.v / max)} strokeWidth="7" strokeLinecap="round"
                pathLength={100} strokeDasharray="100 100" opacity={activa === null || activa === b.h ? 1 : 0.35} style={{ animationDelay: `${150 + b.h * 35}ms`, transition: 'opacity 150ms' }} />}
              <line data-testid="hora-reloj" x1={b.desde[0]} y1={b.desde[1]} x2={b.tope[0]} y2={b.tope[1]} stroke="transparent" strokeWidth="16"
                onMouseEnter={() => b.v !== null && setActiva(b.h)} onClick={() => b.v !== null && setActiva(b.h)} />
            </g>
          ))}
          {marcas.map((m) => <text key={m.h} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle" className="fill-gm-texto-tenue font-mono text-[11px]">{String(m.h).padStart(2, '0')}</text>)}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="gm-tnum text-[34px] font-bold leading-none tracking-[-0.03em]">{centro}</span>
          <span className="mt-1 text-xs text-muted-foreground">{activa !== null && activa !== actual ? `autos a las ${hora(activa + 1)}` : 'adentro ahora'}</span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {[['Entraron', String(entradas)], ['Salieron', String(salidas)], ['Más lleno', `${porHora[pico] ?? 0}`]].map(([t, v], i) => (
          <div key={t} className="rounded-2xl bg-gm-surface-2/60 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{t}</dt>
            <dd className="gm-tnum text-lg font-bold">{v}{i === 2 && porHora.length > 0 && <span className="ml-1 text-xs font-medium text-muted-foreground">{String(pico + 1).padStart(2, '0')} h</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
