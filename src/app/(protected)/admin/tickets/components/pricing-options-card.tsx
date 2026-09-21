 'use client';
import { useState, useTransition, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { defaultPricingOptions, PricingOptions } from '@/types/pricing-options.type';
import { savePricingOptionsAction } from '@/actions/tickets/pricing-options.action';
import { TicketSchedule } from '@/services/tickets.service';
import { PricingPreview } from './ticket-price-bracket/pricing-preview';

function OptionSection({ title, description, enabled, onChange, pending, children }: { title: string; description: string; enabled: boolean; onChange: (value: boolean) => void; pending: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="rounded-xl border p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>
      <div className="flex items-center gap-2 shrink-0"><span className="text-xs">{enabled ? 'Activado' : 'Apagado'}</span><Switch aria-label={`Activar ${title.toLowerCase()}`} checked={enabled} onCheckedChange={value => { onChange(value); if (value) setExpanded(true); }} disabled={pending} /></div>
    </div>
    {enabled && <>
      <Button type="button" variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="gap-1.5 px-0 text-amber-500 hover:text-amber-400">
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />{expanded ? 'Ocultar detalles' : 'Ver detalles'}
      </Button>
      {expanded && <div className="space-y-4 border-t pt-4">{children}</div>}
    </>}
  </section>;
}

// Las etiquetas se repiten a propósito en el trigger. Si <SelectValue> va vacío, Radix portea
// el texto del ítem elegido hacia el trigger, y al desmontarse el Select (cambio de pestaña)
// React intenta remover ese nodo porteado de un padre que ya no existe: NotFoundError en
// removeChild. Pasarle hijos activa valueNodeHasChildren y desactiva el portal.
const MODOS_COBRO: Record<PricingOptions['charging']['mode'], string> = {
  STARTED: 'Períodos iniciados',
  COMPLETED: 'Períodos completos',
  PROPORTIONAL: 'Minutos exactos (proporcional)',
};

const MODOS_CRUCE: Record<PricingOptions['crossing']['mode'], string> = {
  ENTRY: 'Usar el precio de la hora de entrada',
  EXIT: 'Usar el precio de la hora de salida',
  SPLIT: 'Cobrar cada parte con su precio de día o noche',
};

export function PricingOptionsCard({ schedule, onSaved }: { schedule: TicketSchedule; onSaved?: (options: PricingOptions) => void }) {
  const initial = schedule.pricingOptions ?? defaultPricingOptions();
  const [saved, setSaved] = useState(initial);
  const [options, setOptions] = useState<PricingOptions>(initial);
  const [pending, startTransition] = useTransition();
  const { types, error, loading } = useVehicleTypes();
  const update = <K extends keyof PricingOptions>(key: K, patch: Partial<PricingOptions[K]>) => setOptions(previous => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  const active = types.filter(t => t.enabled);
  const dirty = JSON.stringify(saved) !== JSON.stringify(options);
  const setRate = (vehicle: string, field: 'dayPrice' | 'nightPrice', raw: string) => {
    const existing = options.charging.rates.find(r => r.vehicleType === vehicle) ?? { vehicleType: vehicle, dayPrice: NaN, nightPrice: NaN };
    update('charging', { rates: [...options.charging.rates.filter(r => r.vehicleType !== vehicle), { ...existing, [field]: raw === '' ? NaN : Number(raw) }] });
  };
  const numeric = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? '' : value;
  const safeOptions: PricingOptions = { ...options,
    charging: { ...options.charging, rates: options.charging.enabled ? options.charging.rates : options.charging.rates.filter(r => Number.isFinite(r.dayPrice) && Number.isFinite(r.nightPrice) && r.dayPrice >= 0 && r.nightPrice >= 0) },
    stay: { ...options.stay, enabled: false },
  };
  const save = () => startTransition(async () => {
    const result = await savePricingOptionsAction(safeOptions);
    if (result.error) toast.error(result.error);
    else { setSaved(safeOptions); setOptions(safeOptions); onSaved?.(safeOptions); toast.success('Guardado. Se usará desde los próximos ingresos.'); window.dispatchEvent(new Event('pricing-options-updated')); }
  });
  return <div className="space-y-6">
    <div className="rounded-xl bg-muted/50 p-4 space-y-1"><h2 className="text-lg font-semibold">Elegí cómo querés cobrar</h2><p className="text-sm">1. Activá las opciones que necesitás. 2. Probá un ejemplo abajo. 3. Guardá cuando el importe sea el esperado.</p><p className="text-sm text-muted-foreground">No hace falta activar todo. Los vehículos que ya están adentro conservan las tarifas con las que ingresaron.</p></div>
    <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <OptionSection title="Forma de cobro" description="Elegí si cobrás por hora, por fracción o por el tiempo exacto." enabled={options.charging.enabled} onChange={enabled => update('charging', { enabled })} pending={pending}>
        <p className="rounded-lg bg-muted p-3 text-sm">Con esta opción activada, se usan los precios de abajo. La lista de precios por duración de la pestaña Precios por duración queda guardada, pero no se usa para nuevos ingresos.</p>
        <div className="grid sm:grid-cols-2 gap-3"><div className="space-y-1"><Label>¿Cómo se cuenta el tiempo?</Label><Select value={options.charging.mode} onValueChange={mode => update('charging', { mode: mode as PricingOptions['charging']['mode'] })} disabled={pending}><SelectTrigger aria-label="Cómo se cuenta el tiempo"><SelectValue>{MODOS_COBRO[options.charging.mode]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="STARTED">Períodos iniciados</SelectItem><SelectItem value="COMPLETED">Períodos completos</SelectItem><SelectItem value="PROPORTIONAL">Minutos exactos (proporcional)</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label htmlFor="billing-unit">¿Cuántos minutos tiene cada período?</Label><Input id="billing-unit" type="number" min={1} max={10080} required value={options.charging.unitMinutes} onChange={e => update('charging', { unitMinutes: Number(e.target.value) })} disabled={pending} /><p className="text-xs text-muted-foreground">60 = una hora · 30 = media hora · 15 = un cuarto de hora</p></div></div>
        {options.charging.mode === 'COMPLETED' && <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm">En períodos completos, el siguiente período recién se cobra cuando termina. Con períodos de 60 minutos, 59 minutos se cobran como 0 y 1 h 59 min como 1. Para evitar tramos largos sin cobrar, probá períodos cortos, por ejemplo de 5, 10 o 15 minutos.</p>}
        {options.charging.mode !== 'PROPORTIONAL' && <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
          <p className="font-semibold">La diferencia, con períodos de 1 hora</p>
          <p className="text-muted-foreground">Ejemplo sin tolerancia. Los números muestran cuántos períodos se cobran.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[330px] text-center">
              <thead><tr className="border-b"><th scope="col" className="py-2 text-left">Tiempo que estuvo</th><th scope="col" className={`px-2 py-2 ${options.charging.mode === 'STARTED' ? 'text-amber-500' : ''}`}>Cada período<br />que empieza</th><th scope="col" className={`px-2 py-2 ${options.charging.mode === 'COMPLETED' ? 'text-amber-500' : ''}`}>Sólo períodos<br />completos</th></tr></thead>
              <tbody>{[['20 min', '1', '0'], ['1 h', '1', '1'], ['1 h 20 min', '2', '1']].map(([time, started, completed]) => <tr key={time} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-normal">{time}</th><td className={options.charging.mode === 'STARTED' ? 'font-bold text-amber-500' : undefined}>{started}</td><td className={options.charging.mode === 'COMPLETED' ? 'font-bold text-amber-500' : undefined}>{completed}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-muted-foreground">«Cada período que empieza» cobra el primero desde el primer minuto. «Sólo completos» cobra $0 hasta completar el primero. La tolerancia puede evitar el cobro de un período adicional cuando elegís períodos iniciados.</p>
        </div>}
        {options.charging.mode === 'PROPORTIONAL' && <p className="rounded-lg bg-muted p-3 text-sm">Cobro proporcional: si el período es de 60 minutos, una estadía de 1 h 20 min se cobra como 1 hora más 20 minutos. No se redondea a períodos enteros.</p>}
        <div className="grid gap-3 sm:grid-cols-2">{active.map(t => {
          const rate = options.charging.rates.find(r => r.vehicleType === t.code);
          return <fieldset key={t.code} className="min-w-0 space-y-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">{t.name}</legend>
            {(['dayPrice', 'nightPrice'] as const).map(field => <label key={field} className="block space-y-2 text-sm">
              <span>Precio {field === 'dayPrice' ? 'de día' : 'de noche'} por período</span>
              <Input aria-label={`${t.name}: precio ${field === 'dayPrice' ? 'de día' : 'de noche'}`} type="number" min={0} max={100000000} required value={numeric(rate?.[field])} onChange={e => setRate(t.code, field, e.target.value)} disabled={pending} />
            </label>)}
          </fieldset>;
        })}</div>
        <details className="text-sm"><summary className="cursor-pointer">¿Cómo funciona la tolerancia?</summary><p className="mt-2 text-muted-foreground">Al cobrar períodos iniciados, la tolerancia general permite pasarse unos minutos sin cobrar otro período. No se descuenta del primer período. En cobro proporcional o por períodos completos, no se aplica esta tolerancia.</p></details>
      </OptionSection>
      <OptionSection title="Cruces de horario" description="Decidí qué pasa si un vehículo entra de día y sale de noche, o al revés." enabled={options.crossing.enabled} onChange={enabled => update('crossing', { enabled })} pending={pending}>
        <Select value={options.crossing.mode} onValueChange={mode => update('crossing', { mode: mode as PricingOptions['crossing']['mode'] })} disabled={pending}><SelectTrigger aria-label="Qué precio usar al cambiar el horario"><SelectValue>{MODOS_CRUCE[options.crossing.mode]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ENTRY">Usar el precio de la hora de entrada</SelectItem><SelectItem value="EXIT">Usar el precio de la hora de salida</SelectItem><SelectItem value="SPLIT">Cobrar cada parte con su precio de día o noche</SelectItem></SelectContent></Select>
        <p className="text-sm text-muted-foreground">{options.crossing.mode === 'SPLIT' ? 'Ejemplo: entra 19:30 y la noche empieza 20:00. La primera media hora usa el precio de día; desde las 20:00 usa el precio de noche. Cada parte cuenta sus propios períodos. Si querés cobrar los minutos exactos, elegí cobro proporcional arriba.' : options.crossing.mode === 'ENTRY' ? 'Si entra de día, toda la estadía usa el precio de día, aunque salga de noche.' : 'Si sale de noche, toda la estadía usa el precio de noche, aunque haya entrado de día.'}</p>
      </OptionSection>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4"><Button type="submit" disabled={pending || loading || !!error}>{pending ? 'Guardando…' : 'Guardar cambios para los próximos ingresos'}</Button>{dirty && <><span className="text-sm text-amber-600" role="status">Tenés cambios sin guardar</span><Button type="button" variant="ghost" disabled={pending} onClick={() => setOptions(saved)}>Descartar cambios</Button></>}{!dirty && <span className="text-sm text-muted-foreground">Configuración guardada</span>}</div>
    </form>
    <div className="mt-10 border-t-2 border-dashed border-amber-500/30 pt-8">
      <PricingPreview options={safeOptions} />
    </div>
  </div>;
}
