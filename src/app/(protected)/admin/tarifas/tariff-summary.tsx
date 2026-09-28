'use client';

import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock3, Moon, Sun } from 'lucide-react';
import { formatPrice } from '@/components/pricing-breakdown';
import type { TariffBracket, TariffPlan } from '@/types/tariff-plan.type';
import { crossingMode, durationLabel, hasNightPrices, tariffMethod } from '@/utils/tariff-plan.utils';
import { TariffDayNightToggle, VehicleTariffTabs } from './tariff-summary-controls';

export const methodNames = {
  STARTED: 'Por hora o fracción iniciada',
  COMPLETED: 'Sólo períodos completos',
  PROPORTIONAL: 'Por minuto, proporcional al tiempo',
  CUSTOM: 'Lista de precios por duración',
};
export const crossingNames = {
  ENTRY: 'Usar el precio de la hora de entrada',
  EXIT: 'Usar el precio de la hora de salida',
  SPLIT: 'Separar el tiempo de día y de noche',
};
export function TariffSummary({ plan, vehicles }: { plan: TariffPlan; vehicles: { code: string; name: string; enabled: boolean }[] }) {
  const [selected, setSelected] = useState('');
  const [day, setDay] = useState<'DAY' | 'NIGHT'>('DAY');
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  const isNight = day === 'NIGHT';
  const PeriodIcon = isNight ? Moon : Sun;
  const accent = isNight ? 'text-indigo-300' : 'text-amber-300';
  const border = isNight ? 'border-indigo-400/25' : 'border-amber-400/25';
  const method = tariffMethod(plan), options = plan.schedule.pricingOptions;
  const names = new Map(vehicles.map(v => [v.code, v.name]));
  const pricedCodes = method === 'CUSTOM' ? plan.brackets.map(row => row.vehicleType) : options.charging.rates.map(rate => rate.vehicleType);
  const codes = [...new Set([...vehicles.filter(v => v.enabled).map(v => v.code), ...pricedCodes])];
  const vehicle = codes.includes(selected) ? selected : codes[0] ?? '';
  const tabs = codes.map(code => ({ code, name: names.get(code) ?? code }));
  const night = hasNightPrices(plan), crossing = crossingMode(plan);
  const hasPrices = pricedCodes.length > 0;
  const hour = (value: number) => String(value).padStart(2, '0') + ':00';
  // Specific DAY/NIGHT prices replace the general price only for the same duration.
  // The open-ended rule (null duration) follows exactly the same precedence.
  const scoped = new Map<number | null, TariffBracket>();
  for (const row of plan.brackets.filter(row => row.vehicleType === vehicle && row.ticketDayType === null)) scoped.set(row.uptoMinutes, row);
  for (const row of plan.brackets.filter(row => row.vehicleType === vehicle && row.ticketDayType === day)) scoped.set(row.uptoMinutes, row);
  const rows = [...scoped.values()].sort((a,b) => (a.uptoMinutes ?? Infinity) - (b.uptoMinutes ?? Infinity));
  const rate = options.charging.rates.find(row => row.vehicleType === vehicle);
  const dayHours = hour(plan.schedule.dayStartHour) + ' a ' + hour(plan.schedule.dayEndHour);
  const nightHours = hour(plan.schedule.dayEndHour) + ' a ' + hour(plan.schedule.dayStartHour);

  return <section aria-labelledby="current-tariff-heading" data-tariff-summary data-period={day} className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <div><span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Tarifas vigentes</span>
      <h2 id="current-tariff-heading" className="mt-1 text-xl font-semibold">{hasPrices ? methodNames[method] : 'Todavía no configuraste tus precios'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hasPrices ? 'Las estadías con tarifa fijada al ingresar conservan sus precios. Los registros antiguos sin tarifa fijada usan los precios actuales.' : 'Cargá los importes de tu playa y probá un ejemplo antes de empezar a registrar ingresos.'}</p>
    </div>
    {hasPrices && <>
      <div className={'flex flex-col gap-4 rounded-xl border p-3 transition-colors duration-500 motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:p-4 ' + (isNight ? 'border-indigo-400/25 bg-indigo-500/[0.06]' : 'border-amber-400/25 bg-amber-500/[0.06]')}>
        <div className="min-w-0 space-y-2"><p className="text-xs font-medium text-muted-foreground">Tipo de vehículo</p><VehicleTariffTabs vehicles={tabs} value={vehicle} onChange={setSelected} panelId={panelId} /></div>
        <TariffDayNightToggle value={day} onChange={setDay} panelId={panelId} description={day === 'DAY' ? dayHours : nightHours} />
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={panelId + '-tab-' + vehicle} tabIndex={0} className={'overflow-hidden rounded-2xl border outline-none transition-colors duration-500 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' + border + (isNight ? ' bg-indigo-950/20 focus-visible:ring-indigo-400' : ' bg-amber-950/10 focus-visible:ring-amber-400')}>
        <motion.div key={vehicle + day} initial={reduceMotion ? false : { opacity: 0.55, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}>
        <div className={'relative overflow-hidden border-b px-4 py-5 sm:px-5 ' + border + (isNight ? ' bg-gradient-to-r from-indigo-500/20 to-indigo-500/[0.03]' : ' bg-gradient-to-r from-amber-500/20 to-amber-500/[0.03]')}>
          <PeriodIcon aria-hidden="true" className={'pointer-events-none absolute -right-3 -top-4 size-32 rotate-12 opacity-[0.08] ' + accent} />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={'flex size-11 shrink-0 items-center justify-center rounded-xl border ' + border + (isNight ? ' bg-indigo-400/10' : ' bg-amber-400/10')}><PeriodIcon className={'size-6 ' + accent} aria-hidden="true" /></span>
              <div className="min-w-0"><p className={'text-xs font-bold uppercase tracking-wider ' + accent}>Tarifas de {isNight ? 'noche' : 'día'}</p><h3 className="mt-1 break-words text-xl font-semibold">{names.get(vehicle) ?? vehicle}</h3></div>
            </div>
            <span className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ' + border + ' ' + accent}><Clock3 className="size-3.5" aria-hidden="true" />{isNight ? nightHours : dayHours}</span>
          </div>
        </div>
        <div className="space-y-4 p-3 sm:p-5">
        {method !== 'CUSTOM' ? rate ? <div className="space-y-2 rounded-xl border bg-background/40 p-5">
          <p className="text-3xl font-bold tabular-nums">{formatPrice(day === 'DAY' ? rate.dayPrice : rate.nightPrice)}</p>
          <p className="text-sm">Por cada <strong>{durationLabel(options.charging.unitMinutes)}</strong>.</p>
          <p className="text-xs text-muted-foreground">{method === 'STARTED' ? 'Se cobra cada período que empieza.' : method === 'PROPORTIONAL' ? 'Se cobra sólo la proporción utilizada y se redondea el total a pesos.' : 'El tiempo que no completa un período no se cobra.'}</p>
        </div> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Este vehículo todavía no tiene precios configurados.</p> : rows.length ? <>
          <table className="w-full border-separate border-spacing-y-2 text-sm"><caption className="sr-only">Precios vigentes de {names.get(vehicle) ?? vehicle} — {day === 'DAY' ? 'día' : 'noche'}</caption>
            <thead><tr className="text-left text-muted-foreground"><th scope="col" className="px-3 pb-1 text-xs font-medium uppercase tracking-wide">Duración / regla</th><th scope="col" className="px-3 pb-1 text-right text-xs font-medium uppercase tracking-wide">Importe</th></tr></thead>
            <tbody>{rows.map((row,index) => <tr key={row.id ?? index} className={'group transition-colors motion-reduce:transition-none ' + (row.uptoMinutes === null ? (isNight ? 'bg-indigo-400/10' : 'bg-amber-400/10') : 'bg-background/40 hover:bg-white/[0.04]')}>
              <th scope="row" className={'rounded-l-xl border-y border-l-[3px] px-3 py-4 text-left font-medium ' + (isNight ? 'border-y-indigo-400/10 border-l-indigo-400/60' : 'border-y-amber-400/10 border-l-amber-400/60')}>
                {row.uptoMinutes === null && <span className={'mb-1.5 block text-[10px] font-bold uppercase tracking-wider ' + accent}>Si se queda más tiempo</span>}
                {row.uptoMinutes !== null ? 'Hasta ' + durationLabel(row.uptoMinutes) : row.recurringUnitMinutes ? 'Después: cada ' + durationLabel(row.recurringUnitMinutes) + ' adicional' : 'Después: precio total fijo'}
                {row.ticketDayType === null && <span className="mt-1 block text-xs font-normal text-muted-foreground">Precio general para este horario</span>}
                {row.recurringUnitMinutes && row.recurringPriceMode !== 'FIXED' ? <span className={'mt-1 block text-xs font-normal ' + accent}>Adicional calculado con la lista; se muestra el importe de respaldo.</span> : null}
              </th>
              <td className={'whitespace-nowrap rounded-r-xl border-y border-r px-2 py-4 text-right text-sm font-bold tabular-nums sm:px-3 sm:text-base ' + accent + (isNight ? ' border-indigo-400/10' : ' border-amber-400/10')}>{row.recurringUnitMinutes && row.recurringPriceMode === 'FIXED' ? '+ ' : ''}{formatPrice(row.price)}</td>
            </tr>)}</tbody>
          </table>
          <p className="text-xs text-muted-foreground">El cálculo puede combinar duraciones menores. Comprobá el resultado en el simulador.</p>
        </> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No hay precios para este vehículo en el horario de {day === 'DAY' ? 'día' : 'noche'}.</p>}
        </div>
        </motion.div>
      </div>
      <p role="status" className="sr-only">Mostrando tarifas de {isNight ? 'noche' : 'día'} para {names.get(vehicle) ?? vehicle}.</p>
      <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
        <p>{night ? 'Precios según horario' : 'Mismos precios todo el día'}{(night || crossing === 'SPLIT') && <> · Día: {dayHours}</>}</p>
        {(night || crossing === 'SPLIT') && <p>{crossingNames[crossing]}.</p>}
        {crossing === 'SPLIT' && <p className="text-amber-600 dark:text-amber-400">Cada tramo cuenta sus propios períodos, aun cuando el precio de día y noche sea igual.</p>}
        {(method === 'CUSTOM' || method === 'STARTED') && <p>Tolerancia: <strong>{plan.schedule.graceMinutes} min</strong> antes de pasar al siguiente período o duración.</p>}
      </div>
    </>}
  </section>;
}
