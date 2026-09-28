'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PricingBreakdown, formatPrice } from '@/components/pricing-breakdown';
import { simulateTariffPlanAction } from '@/actions/tickets/tariff-plan.action';
import { tariffForVehicle, validateTariffDraft } from '@/utils/tariff-plan.utils';
import type { TariffDraft } from '@/types/tariff-plan.type';
import type { PricingPreviewResult } from '@/types/pricing-options.type';

import { TariffSelect } from './tariff-select';

type Preview = { result?: PricingPreviewResult; error?: string };
export function TariffSimulator({ draft, revision, invalid, vehicles }: {
  draft: TariffDraft | null; revision: string; invalid: boolean; vehicles: { code: string; name: string; enabled: boolean }[];
}) {
  const active = vehicles.filter(v => v.enabled);
  const [selected, setSelected] = useState('');
  const vehicle = active.some(v => v.code === selected) ? selected : active[0]?.code ?? '';
  const draftErrors = draft && vehicle ? validateTariffDraft(tariffForVehicle(draft, vehicle), active.filter(v => v.code === vehicle)) : [];
  const cannotSimulate = invalid || draftErrors.length > 0;
  const [time, setTime] = useState('19:30');
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('15');
  const [current, setCurrent] = useState<Preview | null>(null);
  const [proposed, setProposed] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const version = useRef(0);
  const clear = () => { version.current++; setCurrent(null); setProposed(null); setError(''); };
  useEffect(clear, [draft, revision, vehicle]);
  const run = () => {
    clear();
    if (cannotSimulate) return;
    const duration = Number(hours) * 60 + Number(minutes);
    if (!vehicle || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || hours === '' || minutes === '' || !Number.isInteger(Number(hours)) || Number(hours) < 0 || !Number.isInteger(Number(minutes)) || Number(minutes) < 0 || Number(minutes) > 59 || duration > 5256000) {
      setError('Elegí un vehículo y completá una hora y permanencia válidas.'); return;
    }
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const entryAt = date + 'T' + time + ':00-03:00';
    const token = version.current;
    startTransition(async () => {
      const results = await Promise.all([
        simulateTariffPlanAction(vehicle, entryAt, duration),
        draft ? simulateTariffPlanAction(vehicle, entryAt, duration, draft) : Promise.resolve(null),
      ]);
      if (version.current === token) { setCurrent(results[0]); setProposed(results[1]); }
    });
  };
  const resultCard = (title: string, preview: Preview | null) => preview && <div className="min-w-0 space-y-3 rounded-xl border bg-background p-4">
    <h3 className="font-semibold">{title}</h3>
    {preview.error && <p className="text-sm text-destructive" role="alert">{preview.error}</p>}
    {preview.result && <><p className="text-3xl font-bold tabular-nums">{formatPrice(preview.result.price)}</p>
      <p className="text-xs text-muted-foreground">{preview.result.elapsedMinutes} min de permanencia · {preview.result.billableMinutes} min considerados para cobrar.</p>
      <details className="rounded-lg border"><summary className="cursor-pointer p-3 text-sm">Ver cómo se calculó</summary><div className="border-t p-3"><PricingBreakdown lines={preview.result.breakdown} total={preview.result.price} /></div></details>
      {preview.result.usedFallback && <p className="text-sm text-amber-600 dark:text-amber-400">Se usó el último precio disponible porque no hay una regla para esa duración. Configurá qué cobrar después de la última duración.</p>}
    </>}
  </div>;
  return <section aria-labelledby="tariff-simulator-heading" className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-4 sm:p-6">
    <div><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-amber-500"><FlaskConical className="size-4" aria-hidden="true" /> Prueba sin cobros</span>
      <h2 id="tariff-simulator-heading" className="mt-1 text-xl font-semibold">{draft ? 'Compará los precios actuales con tu borrador' : 'Probá cuánto cobrarías'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{draft ? 'Usamos el mismo vehículo y permanencia con todas las reglas, precios y horarios que estás editando.' : 'El cálculo usa las tarifas vigentes y no registra ingresos ni cobros.'}</p></div>
    <form onSubmit={event => { event.preventDefault(); run(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm"><span>Vehículo</span><TariffSelect name="Vehículo del ejemplo" value={vehicle} onValueChange={value => { setSelected(value); clear(); }} disabled={!active.length} placeholder="Sin vehículos habilitados" options={active.map(v => ({ value: v.code, label: v.name }))} /></label>
        <label className="space-y-2 text-sm"><span>Hora de entrada</span><Input type="time" required value={time} onChange={event => { setTime(event.target.value); clear(); }} /></label>
        <label className="space-y-2 text-sm"><span>Horas de permanencia</span><Input type="number" min={0} max={87600} step={1} required value={hours} onChange={event => { setHours(event.target.value); clear(); }} /></label>
        <label className="space-y-2 text-sm"><span>Minutos adicionales</span><Input type="number" min={0} max={59} step={1} required value={minutes} onChange={event => { setMinutes(event.target.value); clear(); }} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">Probar permanencia:</span>{[['0', '30', '30 min'], ['1', '5', '1 h 05'], ['1', '15', '1 h 15'], ['24', '0', '24 h']].map(([h,m,label]) => <Button key={label} type="button" size="sm" variant="outline" onClick={() => { setHours(h); setMinutes(m); clear(); }}>{label}</Button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">Entrada: hoy, hora de Argentina. La salida puede ser otro día.</p><Button type="submit" disabled={pending || cannotSimulate || !vehicle}>{pending ? 'Calculando…' : draft ? 'Comparar ejemplo' : 'Calcular ejemplo'}</Button></div>
      {cannotSimulate && <p className="text-sm text-muted-foreground">{draftErrors[0] ?? 'Completá los campos del borrador para probarlo.'}</p>}
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {(current || proposed) && <div aria-live="polite" className={draft ? 'grid gap-4 lg:grid-cols-2' : ''}>{resultCard('Tarifas actuales', current)}{draft && resultCard('Con tu borrador', proposed)}</div>}
  </section>;
}

