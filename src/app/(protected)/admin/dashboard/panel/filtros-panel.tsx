'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarRange, Check, ChevronDown, GitCompareArrows } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppCalendarDialog, appCalendarClassNames } from '@/components/app-date-picker';
import { cn } from '@/lib/utils';
import type { CompararPanel, VerPanel } from '@/types/panel.type';
import { atajos, hoyAR, nombreRango } from './utilidades';

export type CambioFiltros = Partial<{ desde: string; hasta: string; comparar: CompararPanel; ver: VerPanel }>;

const NOMBRE_VISTA: Record<VerPanel, string> = { hora: 'Hora', dia: 'Día', semana: 'Semana', mes: 'Mes' };
const MAX_DIAS = 366;

// El período que se compara, como lo calcula el servidor: los mismos días justo antes, o un año antes.
export function rangoComparado(desde: string, hasta: string, comparar: CompararPanel) {
  if (comparar === 'no') return null;
  const dias = dayjs(hasta).diff(dayjs(desde), 'day') + 1;
  if (comparar === 'anio') return { desde: dayjs(desde).subtract(1, 'year').format('YYYY-MM-DD'), hasta: dayjs(hasta).subtract(1, 'year').format('YYYY-MM-DD') };
  return { desde: dayjs(desde).subtract(dias, 'day').format('YYYY-MM-DD'), hasta: dayjs(desde).subtract(1, 'day').format('YYYY-MM-DD') };
}

// Los filtros del panel, en una fila: el período (atajos o fechas elegidas), con qué se compara y
// cómo se agrupa. Todo viaja en la dirección, así se puede compartir o volver atrás.
export function FiltrosPanel({ desde, hasta, comparar, ver, vistas, onCambiar, disabled }: {
  desde: string; hasta: string; comparar: CompararPanel; ver: VerPanel; vistas: VerPanel[];
  onCambiar: (cambio: CambioFiltros) => void; disabled?: boolean;
}) {
  const hoy = hoyAR();
  const lista = atajos(hoy);
  const activo = lista.find((a) => a.desde === desde && a.hasta === hasta)?.clave;
  const [calendario, setCalendario] = useState(false);
  const [rango, setRango] = useState<DateRange | undefined>();
  const [comparando, setComparando] = useState(false);

  const elegirRango = (r: DateRange | undefined) => {
    setRango(r);
    if (!r?.from || !r?.to) return;
    const d = dayjs(r.from).format('YYYY-MM-DD'), h = dayjs(r.to).format('YYYY-MM-DD');
    setCalendario(false);
    setRango(undefined);
    onCambiar({ desde: d, hasta: h });
  };
  const opcionesComparar: { clave: CompararPanel; nombre: string }[] = [
    { clave: 'anterior', nombre: 'Período anterior' },
    { clave: 'anio', nombre: 'Mismo período, año anterior' },
    { clave: 'no', nombre: 'No comparar' },
  ];
  const comparado = rangoComparado(desde, hasta, comparar);

  return (
    <div className="space-y-2">
      <div role="toolbar" aria-label="Filtros del panel" className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período" className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-border bg-card p-1">
            {lista.map((a) => (
              <button key={a.clave} type="button" aria-pressed={activo === a.clave} disabled={disabled} onClick={() => onCambiar({ desde: a.desde, hasta: a.hasta })}
                className={cn('h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60',
                  activo === a.clave ? 'bg-gm-yellow text-gm-ink' : 'text-gm-texto-2 hover:bg-secondary hover:text-foreground')}>
                {a.nombre}
              </button>
            ))}
            <AppCalendarDialog open={calendario} onOpenChange={(o) => { setCalendario(o); if (!o) setRango(undefined); }} title="Elegir fechas" trigger={
              <button type="button" aria-pressed={!activo} disabled={disabled}
                className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60',
                  !activo ? 'bg-gm-yellow text-gm-ink' : 'text-gm-texto-2 hover:bg-secondary hover:text-foreground')}>
                <CalendarRange className="size-4" aria-hidden />{activo ? 'Elegir fechas' : nombreRango(desde, hasta, hoy)}
              </button>
            } footer={<span className="text-xs text-muted-foreground">{rango?.from ? 'Ahora tocá el último día' : 'Tocá el primer día y después el último'}</span>}>
              <Calendar mode="range" locale={es} selected={rango} onSelect={elegirRango} defaultMonth={dayjs(hasta).toDate()} numberOfMonths={1}
                disabled={(dia) => dayjs(dia).format('YYYY-MM-DD') > hoy || (!!rango?.from && !rango.to && Math.abs(dayjs(dia).diff(dayjs(rango.from), 'day')) >= MAX_DIAS)}
                className="p-3" classNames={appCalendarClassNames} />
            </AppCalendarDialog>
          </div>
        </div>

        <Popover open={comparando} onOpenChange={setComparando}>
          <PopoverTrigger asChild>
            <button type="button" disabled={disabled} aria-label={`Comparar con: ${opcionesComparar.find((o) => o.clave === comparar)?.nombre}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3.5 text-[13px] font-semibold text-gm-texto-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60">
              <GitCompareArrows className="size-4 text-gm-yellow" aria-hidden />
              <span className="text-muted-foreground">Comparar con</span>
              <span className="text-foreground">{opcionesComparar.find((o) => o.clave === comparar)?.nombre}</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(320px,calc(100vw-24px))] rounded-2xl p-1.5">
            <div role="radiogroup" aria-label="Comparar con">
              {opcionesComparar.map((o) => {
                const r = rangoComparado(desde, hasta, o.clave);
                const elegido = comparar === o.clave;
                return (
                  <button key={o.clave} type="button" role="radio" aria-checked={elegido} onClick={() => { setComparando(false); onCambiar({ comparar: o.clave }); }}
                    className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow', elegido && 'bg-secondary')}>
                    <Check className={cn('mt-0.5 size-4 shrink-0', elegido ? 'text-gm-yellow' : 'invisible')} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{o.nombre}</span>
                      {r && <span className="block text-xs text-muted-foreground">{nombreRango(r.desde, r.hasta, hoy)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {vistas.length > 1 && (
          <div role="group" aria-label="Ver por" className="flex items-center gap-0.5 rounded-2xl border border-border bg-card p-1">
            <span className="px-2 text-[12px] text-muted-foreground">Ver por</span>
            {vistas.map((v) => (
              <button key={v} type="button" aria-pressed={ver === v} disabled={disabled} onClick={() => onCambiar({ ver: v })}
                className={cn('h-9 rounded-xl px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60',
                  ver === v ? 'bg-secondary text-foreground' : 'text-gm-texto-2 hover:text-foreground')}>
                {NOMBRE_VISTA[v]}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-gm-texto-2">{nombreRango(desde, hasta, hoy)}</span>
        {comparado ? <> · comparado con <span className="font-semibold text-gm-texto-2">{nombreRango(comparado.desde, comparado.hasta, hoy)}</span></> : ' · sin comparar'}
      </p>
    </div>
  );
}
