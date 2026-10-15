'use client';

// «Ver tarifas» como una escalera: cada escalón es una duración con su precio y la barra crece con
// el importe, así se ve de un vistazo cómo sube el cobro. En computadora las barras son verticales;
// en el celular se acuestan (siete barras con su precio no entran a lo ancho). El control de abajo
// prueba una duración: ilumina el escalón y muestra el importe que calcula el backend con la misma
// vista previa del cobro; la pantalla no recalcula precios por su cuenta.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Info, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { formatImporte } from '@/components/pricing-breakdown';
import { previewDurationAction } from '@/actions/tickets/preview-price.action';
import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import type { PricingPreviewResult } from '@/types/pricing-options.type';
import type { TicketSchedule } from '@/services/tickets.service';
import { armarEscalera, escalonDe, maximoDuracion, tiempoCorto, type Escalon } from '@/utils/tarifas-escalera';

type Periodo = 'DAY' | 'NIGHT';

const NOMBRES: Record<string, string> = { AUTO: 'Auto', CAMIONETA: 'Camioneta', MOTO: 'Moto' };
const ALTO_BARRA = 196;
const CURVA = [0.2, 0.9, 0.25, 1] as const;
const hora = (h: number) => String(h).padStart(2, '0') + ':00';
const rayas = (color: string) => `repeating-linear-gradient(135deg, ${color} 0 7px, transparent 7px 14px)`;

// Los colores de siempre del horario: ámbar el día, índigo la noche (como el resto de las tarifas).
// Clases completas, no armadas, para que Tailwind las genere.
const TEMA = {
  DAY: {
    pastilla: 'bg-gm-yellow', textoPastilla: 'text-gm-ink', texto: 'text-gm-yellow', barra: 'bg-gm-yellow',
    brillo: 'shadow-[0_12px_32px_-6px_rgba(246,198,27,0.45)]', brilloFila: 'shadow-[0_0_18px_rgba(246,198,27,0.35)]',
    bordeAdicional: 'shadow-[inset_0_0_0_1.5px_rgba(246,198,27,0.55)]', fila: 'bg-gm-yellow/[0.08]', rango: 'accent-[hsl(var(--gm-yellow))]',
    tarjeta: 'bg-gm-yellow text-gm-ink', tarjetaSecundario: 'text-[#4A3608]', rayas: 'rgba(246,198,27,0.35)',
  },
  NIGHT: {
    pastilla: 'bg-indigo-400', textoPastilla: 'text-indigo-950', texto: 'text-indigo-300', barra: 'bg-indigo-400',
    brillo: 'shadow-[0_12px_32px_-6px_rgba(129,140,248,0.5)]', brilloFila: 'shadow-[0_0_18px_rgba(129,140,248,0.4)]',
    bordeAdicional: 'shadow-[inset_0_0_0_1.5px_rgba(129,140,248,0.6)]', fila: 'bg-indigo-400/[0.1]', rango: 'accent-indigo-400',
    tarjeta: 'bg-indigo-400 text-indigo-950', tarjetaSecundario: 'text-indigo-950/75', rayas: 'rgba(129,140,248,0.4)',
  },
} as const;

// Guías del gráfico en valores redondos (1, 2, 2,5 o 5 por potencia de 10).
function escala(maximo: number) {
  const crudo = Math.max(maximo, 1) / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= crudo) ?? crudo;
  return { tope: paso * 4, guias: [0, 1, 2, 3, 4].map((k) => paso * k) };
}

const valorDe = (e: Escalon) => (e.adicional ? (e.incremento != null ? `+ ${formatImporte(e.incremento)}` : formatImporte(e.precio)) : formatImporte(e.precio));
const etiquetaDe = (e: Escalon) => (e.adicional ? `${e.tiempo}: ${valorDe(e)}` : `Hasta ${e.tiempo}: ${valorDe(e)}`);

export function TarifasEscalera({ brackets, schedule }: { brackets: TicketPriceBracket[]; schedule: TicketSchedule }) {
  const id = useId();
  const reducir = useReducedMotion();
  const { types } = useVehicleTypes();
  const charging = schedule.pricingOptions?.charging;
  const codigos = useMemo(
    () => Array.from(new Set(charging?.enabled ? charging.rates.map((r) => r.vehicleType) : brackets.map((b) => b.vehicleType))),
    [brackets, charging],
  );
  const [elegido, setElegido] = useState('AUTO');
  const vehiculo = codigos.includes(elegido) ? elegido : codigos[0] ?? 'AUTO';
  const [periodo, setPeriodo] = useState<Periodo>('DAY');
  const [minutos, setMinutos] = useState(60);
  const nombre = (code: string) => types.find((t) => t.code === code)?.name ?? NOMBRES[code] ?? code;

  const { escalones, porPeriodo } = useMemo(() => armarEscalera(brackets, schedule.pricingOptions, vehiculo, periodo), [brackets, schedule.pricingOptions, vehiculo, periodo]);
  const maximo = maximoDuracion(escalones);
  const duracion = Math.min(minutos, maximo);
  const activo = escalones.length ? escalonDe(escalones, duracion, schedule.graceMinutes) : -1;
  const { tope, guias } = escala(Math.max(0, ...escalones.map((e) => e.precio)));
  const alto = (precio: number) => Math.max(8, Math.round((precio / tope) * ALTO_BARRA));

  // El importe lo calcula el backend: se pide al dejar de mover el control y solo vale la última
  // respuesta (una vieja que llega tarde no pisa a la nueva).
  const [resultado, setResultado] = useState<PricingPreviewResult | null>(null);
  const [error, setError] = useState('');
  const [calculando, setCalculando] = useState(false);
  const pedido = useRef(0);
  useEffect(() => {
    if (!escalones.length) { setResultado(null); return; }
    const numero = ++pedido.current;
    setCalculando(true);
    const espera = setTimeout(async () => {
      const respuesta = await previewDurationAction(vehiculo, periodo, duracion);
      if (numero !== pedido.current) return;
      setResultado(respuesta.result ?? null);
      setError(respuesta.error ?? '');
      setCalculando(false);
    }, 250);
    return () => clearTimeout(espera);
  }, [vehiculo, periodo, duracion, escalones.length]);

  const entrada = periodo === 'DAY' ? schedule.dayStartHour : schedule.dayEndHour;
  const crossing = schedule.pricingOptions?.crossing;
  const cruce = crossing?.enabled && crossing.mode === 'SPLIT'
    ? 'cada tramo con su precio'
    : (crossing?.enabled ? crossing.mode : schedule.pricingDayTypeBasis) === 'ENTRY' ? 'por la hora de entrada' : 'por la hora de salida';
  const hayMinutosDeMas = !porPeriodo && escalones.some((e) => !e.adicional && e.minutos < 60) && escalones.some((e) => !e.adicional && e.minutos >= 60);
  const modoPeriodo = charging?.mode === 'COMPLETED' ? 'solo períodos completos' : charging?.mode === 'PROPORTIONAL' ? 'por los minutos usados' : 'cada período que empieza';

  const elegir = (e: Escalon) => setMinutos(e.minutos);
  const t = TEMA[periodo];
  const segmento = (on: boolean) => cn(
    'relative inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gm-yellow',
    on ? cn('font-bold', t.textoPastilla) : 'font-semibold text-[#CFC6B8] hover:text-foreground',
  );
  const pastilla = (grupo: string) => <motion.span layoutId={`${id}-${grupo}`} transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0.18, duration: 0.4 }} className={cn('absolute inset-0 rounded-full transition-colors', t.pastilla)} aria-hidden />;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <LayoutGroup id={`${id}-vehiculos`}>
          <div role="group" aria-label="Vehículo" className="flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-full border border-gm-line bg-background p-1 max-sm:flex-1">
            {codigos.map((code) => (
              <button key={code} type="button" aria-pressed={code === vehiculo} onClick={() => setElegido(code)} className={cn(segmento(code === vehiculo), 'max-sm:flex-1')}>
                {code === vehiculo && pastilla('vehiculo')}
                <span className="relative">{nombre(code)}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <LayoutGroup id={`${id}-horario`}>
          <div role="group" aria-label="Horario" className="flex gap-0.5 rounded-full border border-gm-line bg-background p-1">
            {(['DAY', 'NIGHT'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={p === periodo} onClick={() => setPeriodo(p)} className={segmento(p === periodo)}
                title={p === 'DAY' ? `Día, ${hora(schedule.dayStartHour)} a ${hora(schedule.dayEndHour)}` : `Noche, ${hora(schedule.dayEndHour)} a ${hora(schedule.dayStartHour)}`}>
                {p === periodo && pastilla('horario')}
                {p === 'DAY' ? <Sun className="relative size-4" aria-hidden /> : <Moon className="relative size-4" aria-hidden />}
                <span className="relative max-sm:sr-only">{p === 'DAY' ? 'Día' : 'Noche'}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <p className="text-[12.5px] text-muted-foreground max-sm:w-full">
          {nombre(vehiculo)} de {periodo === 'DAY' ? `día, ${hora(schedule.dayStartHour)} a ${hora(schedule.dayEndHour)}` : `noche, ${hora(schedule.dayEndHour)} a ${hora(schedule.dayStartHour)}`}
          {porPeriodo ? ' · se cobra por período' : ''}
        </p>
      </div>

      {escalones.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gm-line-strong px-4 py-8 text-center text-sm text-muted-foreground">
          No hay precios cargados para {nombre(vehiculo).toLowerCase()} de {periodo === 'DAY' ? 'día' : 'noche'}.
        </p>
      ) : (
        <>
          {/* Computadora: barras verticales sobre guías de precio. */}
          <div className="relative hidden h-[262px] pl-14 sm:block">
            {guias.map((valor, k) => (
              <div key={k} aria-hidden className={cn('absolute inset-x-0 border-t', k ? 'border-dashed border-gm-line' : 'border-gm-line-strong')} style={{ bottom: 30 + Math.round((valor / tope) * ALTO_BARRA) }}>
                <span className="gm-mono absolute -top-2 left-0 w-12 text-right text-[10.5px] text-[#8A8173]">{formatImporte(valor)}</span>
              </div>
            ))}
            <ol aria-label="Precio por tiempo de estadía" className="relative grid h-full items-end gap-2.5" style={{ gridTemplateColumns: `repeat(${escalones.length}, minmax(0, 1fr))` }}>
              {escalones.map((e, i) => {
                const on = i === activo;
                return (
                  <li key={i} className="h-full min-w-0">
                    <button type="button" aria-pressed={on} aria-label={etiquetaDe(e)} onClick={() => elegir(e)}
                      className="group flex h-full w-full flex-col items-stretch justify-end gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-4 focus-visible:ring-offset-card">
                      <motion.span initial={reducir ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducir ? 0 : 0.3 + i * 0.06, duration: 0.4 }}
                        className={cn('gm-mono truncate text-center font-bold transition-colors', on ? cn('text-[15px]', t.texto) : e.adicional ? cn('text-[13px]', t.texto) : 'text-[13px] text-[#CFC6B8]')}>
                        {valorDe(e)}
                      </motion.span>
                      <motion.span initial={reducir ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: reducir ? 0 : i * 0.06, duration: 0.7, ease: CURVA }}
                        className={cn('block origin-bottom rounded-b-[4px] rounded-t-[12px] transition-[height,background-color,box-shadow,filter] duration-500 ease-out group-hover:brightness-110 motion-reduce:transition-none',
                          on ? cn(t.barra, t.brillo) : e.adicional ? t.bordeAdicional : 'bg-[#3A342B]')}
                        style={{ height: alto(e.precio), backgroundImage: e.adicional ? rayas(on ? 'rgba(31,18,4,0.35)' : t.rayas) : undefined }} />
                      <span className={cn('h-[22px] truncate text-center text-[12.5px] leading-[22px]', on ? 'font-bold text-foreground' : e.adicional ? cn('font-semibold', t.texto) : 'font-semibold text-muted-foreground')}>
                        {e.tiempo}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Celular: la misma escalera acostada, una fila por escalón. */}
          <ol aria-label="Precio por tiempo de estadía" className="flex flex-col gap-1 sm:hidden">
            {escalones.map((e, i) => {
              const on = i === activo;
              return (
                <li key={i}>
                  <button type="button" aria-pressed={on} aria-label={etiquetaDe(e)} onClick={() => elegir(e)}
                    className={cn('grid min-h-11 w-full grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl px-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gm-yellow', on && t.fila)}>
                    <span className={cn('truncate text-[13px]', on ? 'font-bold text-foreground' : e.adicional ? cn('font-semibold', t.texto) : 'font-medium text-[#CFC6B8]')}>
                      {e.adicional ? e.tiempo : `Hasta ${e.tiempo}`}
                    </span>
                    <span className="relative h-[22px] overflow-hidden rounded-lg bg-gm-surface-2" aria-hidden>
                      <motion.span initial={reducir ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reducir ? 0 : 0.15 + i * 0.06, duration: 0.7, ease: CURVA }}
                        className={cn('absolute inset-y-0 left-0 origin-left rounded-lg transition-[width,background-color,box-shadow] duration-500 ease-out motion-reduce:transition-none',
                          on ? cn(t.barra, t.brilloFila) : e.adicional ? t.bordeAdicional : 'bg-[#3A342B]')}
                        style={{ width: `${Math.max(6, Math.round((e.precio / tope) * 100))}%`, backgroundImage: e.adicional ? rayas(on ? 'rgba(31,18,4,0.35)' : t.rayas) : undefined }} />
                    </span>
                    <span className={cn('gm-mono text-right font-bold transition-colors', on ? cn('text-[15px]', t.texto) : e.adicional ? cn('text-[13.5px]', t.texto) : 'text-[13.5px] text-foreground')}>
                      {valorDe(e)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="flex flex-col justify-center gap-1.5 rounded-[18px] border border-gm-line bg-gm-surface-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`${id}-duracion`} className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Probá una duración</label>
                <output htmlFor={`${id}-duracion`} className="gm-mono text-[15px] font-bold">{tiempoCorto(duracion)}</output>
              </div>
              <input id={`${id}-duracion`} type="range" min={15} max={maximo} step={5} value={duracion} onChange={(ev) => setMinutos(Number(ev.target.value))}
                className={cn('h-8 w-full cursor-pointer', t.rango)} />
              <div aria-hidden className="gm-mono flex justify-between text-[10.5px] text-[#8A8173]">
                <span>15 min</span><span>{tiempoCorto(Math.round(maximo / 2 / 15) * 15)}</span><span>{tiempoCorto(maximo)}</span>
              </div>
            </div>
            <motion.div aria-live="polite" initial={reducir ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: reducir ? 0 : 0.5, duration: 0.35 }}
              className={cn('flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 transition-colors sm:flex-col sm:items-start sm:justify-center sm:gap-1', t.tarjeta)}>
              <div className="min-w-0 sm:order-2">
                <p className="text-[12px] font-semibold">Cobra por {tiempoCorto(duracion)}</p>
                <p className={cn('truncate text-[11.5px] font-medium', t.tarjetaSecundario)}>
                  {error ? error : resultado ? `${resultado.label} · entrando ${hora(entrada)}` : 'Calculando…'}
                </p>
              </div>
              <strong className={cn('gm-display shrink-0 text-[34px] font-bold leading-none transition-opacity sm:order-1 sm:text-[38px]', calculando && 'opacity-50')}>
                {resultado ? formatImporte(resultado.price) : '—'}
              </strong>
            </motion.div>
          </div>
          {resultado?.usedFallback && (
            <p className="text-[12.5px] text-destructive">Esta duración supera las que tienen precio: se usó la última tarifa disponible.</p>
          )}
        </>
      )}

      <ul aria-label="Reglas" className="flex flex-wrap gap-1.5">
        <li className="rounded-full border border-gm-line px-3 py-1.5 text-[12px] text-[#CFC6B8]">
          {schedule.graceMinutes ? <>Tolerancia <strong className="gm-mono text-foreground">{schedule.graceMinutes} min</strong></> : 'Sin tolerancia'}
        </li>
        {porPeriodo && <li className="rounded-full border border-gm-line px-3 py-1.5 text-[12px] text-[#CFC6B8]">Se cobra <strong className="text-foreground">{modoPeriodo}</strong></li>}
        {hayMinutosDeMas && <li className="rounded-full border border-gm-line px-3 py-1.5 text-[12px] text-[#CFC6B8]">Minutos de más: <strong className="text-foreground">precio de los escalones cortos, sin pasar el siguiente</strong></li>}
        <li className="rounded-full border border-gm-line px-3 py-1.5 text-[12px] text-[#CFC6B8]">Día a noche: <strong className="text-foreground">{cruce}</strong></li>
      </ul>
      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-gm-yellow" aria-hidden />
        <span>Si el vehículo ya está adentro, su importe exacto está en <strong className="text-foreground">Cobrar salida</strong>: puede conservar una tarifa anterior.</span>
      </p>
    </div>
  );
}
