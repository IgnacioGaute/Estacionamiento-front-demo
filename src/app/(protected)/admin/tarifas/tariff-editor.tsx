'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { TariffDraft, TariffMethod } from '@/types/tariff-plan.type';
import { changeCrossing, changeMethod, crossingMode, durationLabel, hasNightPrices, tariffMethod, useDayPricesAllDay } from '@/utils/tariff-plan.utils';
import { TariffSelect } from './tariff-select';
import { crossingNames } from './tariff-summary';
import { TariffConfirmDialog } from './tariff-confirm-dialog';
import { TariffPriceList } from './tariff-price-list';
import { DurationField, MoneyField } from './tariff-form-fields';

type Vehicle = { code: string; name: string; enabled: boolean };
const num = (value: number | undefined) => Number.isFinite(value) ? value : '';
const parse = (raw: string) => raw === '' ? NaN : Number(raw);
const hours = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: String(hour).padStart(2, '0') + ':00' }));

export function TariffEditor({ draft, onChange, vehicles }: { draft: TariffDraft; onChange: (draft: TariffDraft) => void; vehicles: Vehicle[] }) {
  const method = tariffMethod(draft);
  const options = draft.schedule.pricingOptions;
  const supported = method === 'CUSTOM' || method === 'STARTED';
  const [night, setNight] = useState(() => hasNightPrices(draft));
  const [confirmNight, setConfirmNight] = useState(false);
  const known = new Map(vehicles.map(vehicle => [vehicle.code, vehicle]));
  const codes = [...new Set([...vehicles.filter(v => v.enabled).map(v => v.code), ...draft.brackets.map(row => row.vehicleType), ...options.charging.rates.map(row => row.vehicleType)])];
  const editableVehicles = codes.map(code => known.get(code) ?? { code, name: code, enabled: false });
  const selectMethod = (next: TariffMethod) => {
    const changed = changeMethod(draft, next);
    setNight(hasNightPrices(changed)); onChange(changed);
  };
  const updateSchedule = (patch: Partial<TariffDraft['schedule']>) => onChange({ ...draft, schedule: { ...draft.schedule, ...patch } });
  const updateCharging = (patch: Partial<typeof options.charging>) => updateSchedule({ pricingOptions: { ...options, charging: { ...options.charging, ...patch } } });
  const setRate = (vehicleType: string, field: 'dayPrice' | 'nightPrice', value: number) => {
    const previous = options.charging.rates.find(row => row.vehicleType === vehicleType) ?? { vehicleType, dayPrice: NaN, nightPrice: NaN };
    const next = { ...previous, [field]: value, ...(!night && field === 'dayPrice' ? { nightPrice: value } : {}) };
    updateCharging({ rates: [...options.charging.rates.filter(row => row.vehicleType !== vehicleType), next] });
  };
  const toggleNight = (enabled: boolean) => {
    if (!enabled && hasNightPrices(draft)) { setConfirmNight(true); return; }
    setNight(enabled);
  };
  return <><div className="space-y-8">
    <section className="space-y-4">
      <div><h3 className="text-lg font-semibold">1. ¿Cómo cobrás en esta playa?</h3><p className="mt-1 text-sm text-muted-foreground">Elegí cómo calculás el precio de una estadía.</p></div>
      <div role="radiogroup" aria-label="Modalidad de cobro" className="grid gap-3 lg:grid-cols-2">
        {([
          ['CUSTOM', 'Con una lista de precios', 'Un precio para 30 minutos, otro para 1 hora, y así.'],
          ['STARTED', 'Por hora o fracción', 'El mismo importe por cada período que empieza.'],
        ] as const).map(([value,title,description]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${method === value ? 'border-amber-500 bg-amber-500/10' : 'bg-background'}`}>
          <input type="radio" name="tariff-method" value={value} checked={method === value} onChange={() => selectMethod(value)} className="mt-1 accent-amber-500" />
          <span className="min-w-0"><span className="block font-semibold">{title}</span>{value === 'CUSTOM' && <span className="mt-1 inline-block text-xs font-medium text-amber-600 dark:text-amber-400">Predeterminada</span>}<span className="mt-1 block text-sm text-muted-foreground">{description}</span></span>
        </label>)}
      </div>
      {!supported && <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">Esta tarifa usa una modalidad anterior. Elegí una de las dos opciones para editarla. La tarifa vigente se conserva hasta que apliques los cambios.</p>}
    </section>

    {supported && <><section className="space-y-5 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">2. Cargá tus precios</h3><Link href="/admin/configuracion/operacion#vehiculos" className="text-sm font-medium text-amber-600 underline underline-offset-4 dark:text-amber-400">Agregar o administrar vehículos</Link></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
        <div className="flex items-start gap-3"><Moon className="mt-0.5 hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" /><div><label htmlFor="tariff-night" className="cursor-pointer text-sm font-medium">Cobro distinto de noche</label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{night ? 'Podés cargar precios de día y de noche.' : 'Tus precios se aplican durante todo el día.'}</p></div></div>
        <Switch id="tariff-night" checked={night} onCheckedChange={toggleNight} />
      </div>
      {method !== 'CUSTOM' ? <div className="space-y-5">
        <div className="grid gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2 sm:items-end">
          <DurationField label="Duración de cada período" name="Duración del período de cobro" value={options.charging.unitMinutes} max={10080} onChange={value => updateCharging({ unitMinutes: value })} />
          <p className="text-sm leading-relaxed text-muted-foreground">Cada período que empieza se cobra completo.</p>
        </div>
        <div className="divide-y rounded-xl border bg-card px-4 sm:px-5">{editableVehicles.map(vehicle => {
          const rate = options.charging.rates.find(row => row.vehicleType === vehicle.code);
          return <div key={vehicle.code} className="grid items-end gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="sm:pb-2"><p className="font-semibold">{vehicle.name}</p><p className="mt-1 text-xs text-muted-foreground">{vehicle.enabled ? 'Precio por ' + durationLabel(options.charging.unitMinutes) : 'Deshabilitado · precio conservado'}</p></div>
            <div className={'grid gap-4 ' + (night ? 'sm:grid-cols-2' : '')}>
              <MoneyField label={night ? 'De día' : 'Todo el día'} name={vehicle.name + ': precio ' + (night ? 'de día' : 'todo el día')} value={rate?.dayPrice} max={100000000} onChange={value => setRate(vehicle.code, 'dayPrice', value)} />
              {night && <MoneyField label="De noche" name={vehicle.name + ': precio de noche'} value={rate?.nightPrice} max={100000000} onChange={value => setRate(vehicle.code, 'nightPrice', value)} />}
            </div>
          </div>;
        })}</div>
      </div> : <TariffPriceList draft={draft} onChange={onChange} vehicles={editableVehicles} night={night} onEnableNight={() => setNight(true)} />}
      {!editableVehicles.length && <p className="text-sm text-muted-foreground">Agregá al menos un tipo de vehículo para cargar sus precios.</p>}
    </section>

    <section className="space-y-4 border-t pt-5">
      <div><h3 className="text-lg font-semibold">3. Horarios y tolerancia</h3><p className="mt-1 text-sm text-muted-foreground">Ajustá estos detalles para completar tu forma de cobrar.</p></div>
      {night || crossingMode(draft) === 'SPLIT' ? <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium"><span className="block">Día: desde</span><TariffSelect name="Inicio del horario de día" value={String(draft.schedule.dayStartHour)} onValueChange={value => updateSchedule({ dayStartHour: Number(value) })} options={hours} compact /></label>
          <label className="block space-y-2 text-sm font-medium"><span className="block">Día: hasta</span><TariffSelect name="Fin del horario de día" value={String(draft.schedule.dayEndHour)} onValueChange={value => updateSchedule({ dayEndHour: Number(value) })} options={hours} compact /></label>
        </div>
        <p className="text-xs text-muted-foreground">Fuera de ese horario se aplica el precio de noche. Las horas se interpretan en Argentina.</p>
        <label className="block space-y-2 text-sm"><span>Si un vehículo entra de día y sale de noche, o al revés</span><TariffSelect name="Precio al cambiar de horario" value={crossingMode(draft)} onValueChange={value => onChange(changeCrossing(draft, value as 'ENTRY' | 'EXIT' | 'SPLIT'))} options={Object.entries(crossingNames).map(([value, label]) => ({ value, label }))} /></label>
        <p className="rounded-lg bg-muted/40 p-3 text-sm">{crossingMode(draft) === 'SPLIT' ? 'Cada tramo cuenta sus propios períodos o duraciones, aun si los precios de día y noche coinciden. Probá una entrada cercana al cambio de horario.' : crossingMode(draft) === 'ENTRY' ? 'Si entra de día, toda la estadía usa los precios de día, aunque salga de noche.' : 'Si sale de noche, toda la estadía usa los precios de noche, aunque haya entrado de día.'}</p>
      </div> : <p className="text-sm text-muted-foreground">Usás el mismo precio todo el día. Activá “Cobro distinto de noche” si necesitás definir horarios.</p>}
      {(method === 'STARTED' || method === 'CUSTOM') && <label className="block max-w-xl space-y-2 text-sm"><span className="block font-medium">Tolerancia entre duraciones</span><div className="relative max-w-[200px]"><Input aria-label="Tolerancia en minutos" className="h-11 rounded-lg pr-16" type="number" min={0} max={5256000} step={1} value={num(draft.schedule.graceMinutes)} onChange={event => updateSchedule({ graceMinutes: parse(event.target.value) })} /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">minutos</span></div>
        <span className="block text-xs text-muted-foreground">{method === 'STARTED' ? 'No hace gratis el primer período. Permite pasarse estos minutos antes de cobrar el siguiente; como máximo se aplica un minuto menos que el período.' : 'Permite pasarse unos minutos de una duración antes de avanzar al siguiente precio. Probá las duraciones límite en el simulador.'}</span></label>}
    </section></>}
  </div>
    <TariffConfirmDialog open={confirmNight} onOpenChange={setConfirmNight} title="¿Usar el mismo precio todo el día?" description="Los precios de día también se usarán durante la noche." cancelLabel="Mantener precios de noche" confirmLabel="Usar precios de día" onConfirm={() => { onChange(useDayPricesAllDay(draft)); setNight(false); }}>
      <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed"><p>Los precios exclusivos de noche se quitarán del borrador.</p><p className="text-muted-foreground">Tus tarifas vigentes no cambian hasta que apliques el borrador.</p></div>
    </TariffConfirmDialog>
  </>;
}

