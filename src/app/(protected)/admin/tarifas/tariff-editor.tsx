'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Clock3, List, Moon, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SetupStepHeading, SetupStepper, Step } from '@/components/setup-stepper/setup-stepper';
import { cn } from '@/lib/utils';
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

export function TariffEditor({ draft, onChange, vehicles, step, onStepChange, canApply, applying, onApply, disabled, notice }: {
  draft: TariffDraft;
  onChange: (draft: TariffDraft) => void;
  vehicles: Vehicle[];
  step: number;
  onStepChange: (step: number) => void;
  canApply: boolean;
  applying: boolean;
  onApply: () => void;
  disabled?: boolean;
  // Lo que impide aplicar (datos faltantes, conflicto): se muestra en el último paso, junto al botón.
  notice?: ReactNode;
}) {
  const method = tariffMethod(draft);
  const options = draft.schedule.pricingOptions;
  const supported = method === 'CUSTOM' || method === 'STARTED';
  const [night, setNight] = useState(() => hasNightPrices(draft));
  const [confirmNight, setConfirmNight] = useState(false);
  // Con lista de precios, el paso 2 tiene dos partes: las duraciones y qué se cobra si se queda más
  // tiempo. Continuar/Atrás recorren las partes antes de cambiar de paso.
  const [part, setPart] = useState<'durations' | 'endings'>('durations');
  const top = useRef<HTMLDivElement>(null);
  const known = new Map(vehicles.map(vehicle => [vehicle.code, vehicle]));
  const codes = [...new Set([...vehicles.filter(v => v.enabled).map(v => v.code), ...draft.brackets.map(row => row.vehicleType), ...options.charging.rates.map(row => row.vehicleType)])];
  const editableVehicles = codes.map(code => known.get(code) ?? { code, name: code, enabled: false });
  // Sin cobro de noche no hay horarios que elegir. Una tarifa vieja que separa tramos (SPLIT) los
  // sigue mostrando: ese modo cuenta los períodos por tramo aunque los precios coincidan.
  const schedules = night || crossingMode(draft) === 'SPLIT';
  const titles = ['Cobro', 'Precios', schedules ? 'Horarios' : 'Tolerancia'];
  const last = step === titles.length;
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
  const twoParts = supported && method === 'CUSTOM';
  // Al cambiar de paso o de parte, el comienzo del paso vuelve a quedar a la vista.
  const toTop = () => requestAnimationFrame(() => { const box = top.current?.getBoundingClientRect(); if (box && box.top < 0) top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  const showPart = (next: 'durations' | 'endings') => { setPart(next); toTop(); };
  const goTo = (target: number) => {
    if (!supported && target !== 1) return;
    if (target === 2) setPart(step > 2 ? 'endings' : 'durations');
    onStepChange(target); toTop();
  };

  return <>
    <div ref={top} className="scroll-mt-4" />
    <SetupStepper
      className="tariff-stepper"
      titles={titles}
      step={step}
      onStepChange={goTo}
      onComplete={onApply}
      completeLabel={applying ? 'Aplicando…' : 'Aplicar tarifas'}
      disabled={disabled}
      nextDisabled={(!supported && step === 1) || (last && !canApply)}
      locked={number => !supported && number > 1}
      stateLabel={(number, status) => status === 'active' && number === 2 && twoParts ? `En curso · ${part === 'durations' ? 1 : 2}/2` : undefined}
      backButtonProps={{ onClick: event => { if (step === 2 && twoParts && part === 'endings') { event.preventDefault(); showPart('durations'); } } }}
      nextButtonProps={{ onClick: event => { if (step === 2 && twoParts && part === 'durations') { event.preventDefault(); showPart('endings'); } } }}
    >
      <Step>
        <section className="space-y-4">
          <StepHeading number={1} title="¿Cómo cobrás en esta playa?">Elegí cómo se calcula el precio de una estadía.</StepHeading>
          <div role="radiogroup" aria-label="Modalidad de cobro" className="grid gap-3 lg:grid-cols-2">
            {([
              ['CUSTOM', 'Con una lista de precios', 'Un precio para 30 minutos, otro para 1 hora, y así.', List],
              ['STARTED', 'Por hora o fracción', 'El mismo importe por cada período que empieza.', Clock3],
            ] as const).map(([value, title, description, Icon]) => <label key={value} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors', method === value ? 'border-gm-yellow bg-gm-yellow/[0.07]' : 'border-gm-line bg-gm-surface-2 hover:border-gm-line-strong')}>
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', method === value ? 'bg-gm-yellow text-gm-ink' : 'bg-gm-line text-[#D9D1C3]')}><Icon className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span>{value === 'CUSTOM' && <span className="mt-2 inline-block rounded-full bg-gm-yellow/15 px-2 py-0.5 text-[11px] font-bold text-gm-yellow">Predeterminada</span>}</span>
              <input type="radio" name="tariff-method" value={value} checked={method === value} onChange={() => selectMethod(value)} className="mt-1 size-[18px] accent-amber-500" />
            </label>)}
          </div>
          {!supported && <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">Esta tarifa usa una modalidad anterior. Elegí una de las dos opciones para editarla. La tarifa vigente se conserva hasta que apliques los cambios.</p>}
        </section>
      </Step>

      <Step>
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><StepHeading number={2} title={twoParts && part === 'endings' ? 'Si se queda más tiempo' : 'Cargá tus precios'} /><Link href="/admin/configuracion/operacion#vehiculos" className="text-sm font-medium text-gm-yellow underline-offset-4 hover:underline">Agregar o administrar vehículos</Link></div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gm-line bg-gm-surface-2 p-4">
            <div className="flex items-start gap-3"><Moon className={cn('mt-0.5 size-4 shrink-0', night ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden="true" /><div><label htmlFor="tariff-night" className="cursor-pointer text-sm font-medium">Cobro distinto de noche</label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{night ? 'Cargá precios de día y de noche. Los horarios se eligen en el paso 3.' : 'Tus precios se aplican durante todo el día.'}</p></div></div>
            <Switch id="tariff-night" checked={night} onCheckedChange={toggleNight} />
          </div>
          {method !== 'CUSTOM' ? <div className="space-y-5">
            <div className="grid gap-4 rounded-2xl border border-gm-line bg-gm-surface-2 p-4 sm:grid-cols-2 sm:items-end">
              <DurationField label="Duración de cada período" name="Duración del período de cobro" value={options.charging.unitMinutes} max={10080} onChange={value => updateCharging({ unitMinutes: value })} />
              <p className="text-sm leading-relaxed text-muted-foreground">Cada período que empieza se cobra completo.</p>
            </div>
            <div className="divide-y divide-gm-line rounded-2xl border border-gm-line px-4 sm:px-5">{editableVehicles.map(vehicle => {
              const rate = options.charging.rates.find(row => row.vehicleType === vehicle.code);
              return <div key={vehicle.code} className="grid items-end gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div className="sm:pb-2"><p className="font-semibold">{vehicle.name}</p><p className="mt-1 text-xs text-muted-foreground">{vehicle.enabled ? 'Precio por ' + durationLabel(options.charging.unitMinutes) : 'Deshabilitado · precio conservado'}</p></div>
                <div className={'grid gap-4 ' + (night ? 'sm:grid-cols-2' : '')}>
                  <MoneyField label={night ? 'De día' : 'Todo el día'} name={vehicle.name + ': precio ' + (night ? 'de día' : 'todo el día')} value={rate?.dayPrice} max={100000000} onChange={value => setRate(vehicle.code, 'dayPrice', value)} />
                  {night && <MoneyField label="De noche" name={vehicle.name + ': precio de noche'} value={rate?.nightPrice} max={100000000} onChange={value => setRate(vehicle.code, 'nightPrice', value)} />}
                </div>
              </div>;
            })}</div>
          </div> : <>
            <div role="group" aria-label="Partes del paso 2" className="grid grid-cols-2 gap-1 rounded-2xl border border-gm-line bg-background p-1">
              {([['durations', 'Duraciones', 'Precio por tiempo'], ['endings', 'Más tiempo', 'Cobro posterior']] as const).map(([value, label, hint], index) => <button key={value} type="button" aria-pressed={part === value} onClick={() => showPart(value)} className={cn('flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow', part === value ? 'bg-gm-surface-3 shadow-[inset_0_0_0_1px_hsl(var(--gm-line-strong))]' : 'hover:bg-gm-surface-2')}>
                <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', part === value ? 'text-gm-yellow shadow-[inset_0_0_0_2px_hsl(var(--gm-yellow))]' : index === 0 ? 'bg-gm-yellow text-gm-ink' : 'text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--gm-line-strong))]')}>{part !== value && index === 0 ? <Check className="size-3" strokeWidth={3} aria-hidden /> : '2' + 'ab'[index]}</span>
                <span className="min-w-0"><span className={cn('block truncate text-[13px] font-semibold', part === value ? 'text-foreground' : 'text-muted-foreground')}>{label}</span><span className="block truncate text-[11px] text-muted-foreground">{hint}</span></span>
              </button>)}
            </div>
            <div key={part} className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
              <TariffPriceList draft={draft} onChange={onChange} vehicles={editableVehicles} night={night} onEnableNight={() => setNight(true)} section={part} />
            </div>
          </>}
          {!editableVehicles.length && <p className="text-sm text-muted-foreground">Agregá al menos un tipo de vehículo para cargar sus precios.</p>}
        </section>
      </Step>

      <Step>
        <section className="space-y-5">
          {schedules ? <>
            <StepHeading number={3} title="Horarios y tolerancia">Cobrás distinto de noche: elegí cuándo empieza cada horario.</StepHeading>
            <div className="overflow-hidden rounded-2xl border border-gm-line">
              <div className="grid grid-cols-2 divide-x divide-gm-line">
                <label className="block space-y-2 p-4 text-sm font-medium"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sun className="size-3.5 text-gm-yellow" aria-hidden />Día: desde</span><TariffSelect name="Inicio del horario de día" value={String(draft.schedule.dayStartHour)} onValueChange={value => updateSchedule({ dayStartHour: Number(value) })} options={hours} compact /></label>
                <label className="block space-y-2 p-4 text-sm font-medium"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Moon className="size-3.5" aria-hidden />Día: hasta</span><TariffSelect name="Fin del horario de día" value={String(draft.schedule.dayEndHour)} onValueChange={value => updateSchedule({ dayEndHour: Number(value) })} options={hours} compact /></label>
              </div>
              <p className="border-t border-gm-line px-4 py-2.5 text-xs text-muted-foreground">Fuera de ese horario se aplica el precio de noche. Las horas se interpretan en Argentina.</p>
            </div>
            <label className="block space-y-2 text-sm"><span className="font-medium">Si un vehículo entra de día y sale de noche, o al revés</span><TariffSelect name="Precio al cambiar de horario" value={crossingMode(draft)} onValueChange={value => onChange(changeCrossing(draft, value as 'ENTRY' | 'EXIT' | 'SPLIT'))} options={Object.entries(crossingNames).map(([value, label]) => ({ value, label }))} /></label>
            <p className="rounded-xl bg-gm-surface-2 p-3 text-sm">{crossingMode(draft) === 'SPLIT' ? 'Cada tramo cuenta sus propios períodos o duraciones, aun si los precios de día y noche coinciden. Probá una entrada cercana al cambio de horario.' : crossingMode(draft) === 'ENTRY' ? 'Si entra de día, toda la estadía usa los precios de día, aunque salga de noche.' : 'Si sale de noche, toda la estadía usa los precios de noche, aunque haya entrado de día.'}</p>
          </> : <>
            <StepHeading number={3} title="Tolerancia">Minutos que puede pasarse antes de cobrar la siguiente duración.</StepHeading>
            <div className="flex items-start gap-3 rounded-2xl border border-gm-line bg-gm-surface-2 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gm-line text-[#D9D1C3]"><Sun className="size-4" aria-hidden /></span>
              <div className="min-w-0 text-sm"><p className="font-semibold">Un precio para todo el día</p><p className="mt-0.5 text-muted-foreground">No hay horarios que configurar. Para cobrar distinto de noche, activalo en Precios.</p><button type="button" onClick={() => onStepChange(2)} className="mt-2 text-[13px] font-semibold text-gm-yellow underline-offset-4 hover:underline">Ir a Precios</button></div>
            </div>
          </>}
          <label className="block max-w-xl space-y-2 text-sm"><span className="block font-medium">Tolerancia entre duraciones</span><div className="relative max-w-[200px]"><Input aria-label="Tolerancia en minutos" className="h-11 rounded-xl pr-16" type="number" min={0} max={5256000} step={1} value={num(draft.schedule.graceMinutes)} onChange={event => updateSchedule({ graceMinutes: parse(event.target.value) })} /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">minutos</span></div>
            <span className="block text-xs text-muted-foreground">{method === 'STARTED' ? 'No hace gratis el primer período. Permite pasarse estos minutos antes de cobrar el siguiente; como máximo se aplica un minuto menos que el período.' : 'Permite pasarse unos minutos de una duración antes de avanzar al siguiente precio. Probá las duraciones límite en el simulador.'}</span></label>
          {notice}
        </section>
      </Step>
    </SetupStepper>
    <TariffConfirmDialog open={confirmNight} onOpenChange={setConfirmNight} title="¿Usar el mismo precio todo el día?" description="Los precios de día también se usarán durante la noche." cancelLabel="Mantener precios de noche" confirmLabel="Usar precios de día" onConfirm={() => { onChange(useDayPricesAllDay(draft)); setNight(false); }}>
      <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed"><p>Los precios exclusivos de noche se quitarán del borrador.</p><p className="text-muted-foreground">Tus tarifas vigentes no cambian hasta que apliques el borrador.</p></div>
    </TariffConfirmDialog>
  </>;
}

function StepHeading({ number, title, children }: { number: number; title: string; children?: ReactNode }) {
  return <SetupStepHeading number={number} total={3} title={title}>{children}</SetupStepHeading>;
}
