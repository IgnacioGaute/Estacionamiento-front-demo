'use client';

import { useId, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { plata } from './utilidades';
import { easeAt } from './cometa-canvas';

const NIVELES = ['hsl(var(--gm-surface-2))', '#4D3F14', '#7D6210', '#B8900F', '#F5C419'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const HOY_RAYADO = 'repeating-linear-gradient(45deg, #F5C419 0 2px, #4D3F14 2px 5px)';
// Como el calendario de contribuciones de la librería: semanas de lunes a domingo, el fin de
// semana atenuado, la ola de entrada por columnas y los demás días al 30 % al pasar el mouse.
const FIN_DE_SEMANA = 0.35, INACTIVO = 0.3;
const BARRIDO_MS = 1100, INCLINACION_FILA_MS = 12;
const CURVA_COLUMNAS = [0, 0.85, 1, 0.15]; // la inversa de la curva de entrada de los gráficos
const retraso = (columna: number, columnas: number, fila: number) =>
  easeAt(CURVA_COLUMNAS, columnas > 1 ? columna / (columnas - 1) : 0) * BARRIDO_MS + fila * INCLINACION_FILA_MS;
const fechaLarga = (f: string) => { const d = dayjs(f); return `${d.date()} de ${MESES_LARGOS[d.month()]} de ${d.year()}`; };

// Las últimas 20 semanas, un cuadradito por día: cuanto más amarillo, más se cobró. Los niveles
// salen de los cuartiles de los días con cobros. Tocar un día lo elige como período.
export function CalendarioDias({ dias, hoy, elegido, onElegir }: {
  dias: { fecha: string; total: number }[]; hoy: string; elegido?: string | null; onElegir: (fecha: string) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const [activo, setActivo] = useState<{ s: number; d: number } | null>(null);
  const { semanas, meses, cortes, mejor } = useMemo(() => {
    const conCobro = dias.filter((d) => d.total > 0 && d.fecha !== hoy).map((d) => d.total).sort((a, b) => a - b);
    const q = (p: number) => conCobro[Math.min(conCobro.length - 1, Math.floor(p * conCobro.length))] ?? 0;
    const semanas: ({ fecha: string; total: number } | null)[][] = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(Array.from({ length: 7 }, (_, d) => dias[i + d] ?? null));
    const meses = semanas.map((s, i) => {
      const primero = s[0]?.fecha;
      const anterior = semanas[i - 1]?.[0]?.fecha;
      return primero && (!anterior || dayjs(anterior).month() !== dayjs(primero).month()) ? MESES[dayjs(primero).month()] : '';
    });
    const mejor = dias.filter((d) => d.fecha !== hoy).reduce<{ fecha: string; total: number } | null>((m, d) => (!m || d.total > m.total ? d : m), null);
    return { semanas, meses, cortes: [q(0.25), q(0.5), q(0.75)], mejor };
  }, [dias, hoy]);
  const nivel = (t: number) => (t <= 0 ? 0 : t < cortes[0] ? 1 : t < cortes[1] ? 2 : t < cortes[2] ? 3 : 4);
  const dia = activo ? semanas[activo.s]?.[activo.d] ?? null : null;

  return (
    <section aria-labelledby={`${uid}-t`} className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 id={`${uid}-t`} className="text-sm font-medium text-muted-foreground">Tus días</h2>
        <p className="text-[13px] text-gm-texto-tenue">Lo cobrado cada día de las últimas 20 semanas · tocá un día para verlo</p>
      </div>
      <div role="img" aria-label={`Lo cobrado cada día de las últimas 20 semanas.${mejor && mejor.total > 0 ? ` El mejor día fue el ${DIAS[dayjs(mejor.fecha).day()]} ${fechaLarga(mejor.fecha)} con ${plata(mejor.total)}.` : ''}`} className="flex gap-2.5">
        <div aria-hidden className="flex w-4 shrink-0 flex-col gap-[3px] pt-[22px] text-xs text-gm-texto-tenue">
          {INICIALES.map((d, i) => <span key={i} className="flex flex-1 items-center justify-end" style={{ opacity: i >= 5 ? FIN_DE_SEMANA : 1 }}>{d}</span>)}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div aria-hidden className="flex h-4 gap-[3px]">{meses.map((m, i) => <span key={i} className="flex-1 overflow-visible whitespace-nowrap text-xs text-muted-foreground">{m}</span>)}</div>
          <div className="relative flex gap-[3px]" onMouseLeave={() => setActivo(null)}>
            {semanas.map((s, si) => (
              <div key={si} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {s.map((d, di) => {
                  const demora = `${Math.round(retraso(si, semanas.length, di))}ms`;
                  if (!d || d.fecha > hoy) return <span key={di} aria-hidden className="panel-celda aspect-square rounded-[2px] shadow-[inset_0_0_0_1px_hsl(var(--gm-line))]" style={{ animationDelay: demora }} />;
                  const sel = activo?.s === si && activo.d === di;
                  return (
                    <button key={di} type="button" aria-label={`${DIAS[dayjs(d.fecha).day()]} ${fechaLarga(d.fecha)}: ${plata(d.total)}`}
                      onMouseEnter={() => setActivo({ s: si, d: di })} onFocus={() => setActivo({ s: si, d: di })} onClick={() => onElegir(d.fecha)}
                      className="panel-celda panel-dimable aspect-square rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                      style={{ opacity: activo && !sel ? INACTIVO : 1, animationDelay: demora, boxShadow: elegido === d.fecha ? '0 0 0 2px hsl(var(--foreground))' : 'none' }}>
                      <span aria-hidden className="block size-full rounded-[2px]" style={{ background: d.fecha === hoy ? HOY_RAYADO : NIVELES[nivel(d.total)], opacity: di >= 5 && d.fecha !== hoy ? FIN_DE_SEMANA : 1 }} />
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="panel-indicador pointer-events-none absolute z-10 min-w-[180px] overflow-hidden whitespace-nowrap rounded-xl border border-border bg-popover shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
              style={{
                opacity: dia ? 1 : 0,
                left: `${Math.min(88, Math.max(12, (((activo?.s ?? 0) + 0.5) / Math.max(1, semanas.length)) * 100))}%`,
                top: activo && activo.d < 3 ? `${((activo.d + 1) / 7) * 100}%` : `${((activo?.d ?? 0) / 7) * 100}%`,
                transform: activo && activo.d < 3 ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
              }}>
              {dia && <>
                <div className="border-b border-border px-3.5 py-2.5 text-[13px] font-semibold">
                  {fechaLarga(dia.fecha)}
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground first-letter:uppercase">{DIAS[dayjs(dia.fecha).day()]}{dia.fecha === hoy ? ' · en curso' : ''}</div>
                </div>
                <div className="px-3.5 py-3 text-sm"><span className="gm-tnum font-semibold">{plata(dia.total)}</span> <span className="text-muted-foreground">cobrado</span></div>
              </>}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gm-texto-tenue">
        <span className="flex items-center gap-1.5">Menos{NIVELES.map((c) => <span key={c} className="size-[11px] rounded-[2px]" style={{ background: c }} />)}Más</span>
        <span className="flex items-center gap-1.5"><span className="size-[11px] rounded-[2px]" style={{ background: HOY_RAYADO }} />Hoy, en curso</span>
      </div>
      {mejor && mejor.total > 0 && <p className="text-[13px] text-gm-texto-2">Tu mejor día fue el {DIAS[dayjs(mejor.fecha).day()]} {fechaLarga(mejor.fecha)} ({plata(mejor.total)}).</p>}
    </section>
  );
}
