 'use client';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VehicleTypePicker } from '@/components/vehicle-type-options';
import { PricingBreakdown, formatPrice } from '@/components/pricing-breakdown';
import { simulateStayAction } from '@/actions/tickets/preview-price.action';
import type { PricingOptions, PricingPreviewResult } from '@/types/pricing-options.type';
const todayAt = (hour: string) => `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T${hour}`;
export function PricingPreview({ options }: { options?: PricingOptions }) {
  const id = useId();
  const requestVersion = useRef(0);
  const [vehicle, setVehicle] = useState('AUTO');
  const [entryHour, setEntryHour] = useState('19');
  const [entryMinute, setEntryMinute] = useState('30');
  const [hours, setHours] = useState('2'); const [minutes, setMinutes] = useState('17');
  const [result, setResult] = useState<PricingPreviewResult | null>(null); const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const clear = () => { requestVersion.current++; setResult(null); setError(''); };
  useEffect(clear, [options]);
  useEffect(() => { window.addEventListener('pricing-options-updated', clear); return () => window.removeEventListener('pricing-options-updated', clear); }, []);
  const setTime = (hour: string, minute: string) => { setEntryHour(hour); setEntryMinute(minute); clear(); };
  const simulate = () => {
    const hour = Number(entryHour), minute = Number(entryMinute);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      setError('Ingresá una hora entre 0 y 23 y minutos entre 0 y 59.');
      return;
    }
    const entryAt = `${todayAt('00:00').split('T')[0]}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;
    startTransition(async () => {
      clear();
      const version = requestVersion.current;
      const data = await simulateStayAction(vehicle, entryAt, Number(hours) * 60 + Number(minutes), options);
      if (version === requestVersion.current) { setResult(data.result ?? null); setError(data.error ?? ''); }
    });
  };
  return <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-5 sm:p-6 space-y-5">
    <div className="space-y-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-500"><FlaskConical aria-hidden="true" className="size-3.5" /> Zona de prueba · no cobra</span>
      <h3 className="text-xl font-semibold">Probá cuánto cobrarías</h3>
      <p className="text-sm text-muted-foreground">Probá un vehículo, una hora y cuánto se queda. El cálculo no registra entradas ni cobros. {options ? 'Usa los cambios que estás editando, aunque no los hayas guardado.' : 'Usa los precios que están guardados.'}</p>
    </div>
    <form onSubmit={e => { e.preventDefault(); simulate(); }} className="space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
        <div className="min-w-0 rounded-xl border bg-background/60 p-4 space-y-4">
          <h4 className="text-sm font-semibold">1. Elegí el vehículo</h4>
          <div className="space-y-2"><Label className="block whitespace-nowrap">Vehículo</Label><VehicleTypePicker value={vehicle} onChange={v => { setVehicle(v); clear(); }} disabled={pending} /></div>
        </div>
        <div className="min-w-0 rounded-xl border bg-background/60 p-4 space-y-4">
          <h4 className="text-sm font-semibold">2. ¿A qué hora entra?</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2"><Label htmlFor={`${id}-hour`} className="block whitespace-nowrap">Hora</Label><Input id={`${id}-hour`} type="number" inputMode="numeric" min={0} max={23} required value={entryHour} onChange={e => { setEntryHour(e.target.value); clear(); }} disabled={pending} /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor={`${id}-minute`} className="block whitespace-nowrap">Minutos</Label><Input id={`${id}-minute`} type="number" inputMode="numeric" min={0} max={59} required value={entryMinute} onChange={e => { setEntryMinute(e.target.value); clear(); }} disabled={pending} /></div>
          </div>
          <div className="flex flex-wrap gap-2">{[['08', '00'], ['19', '30'], ['22', '00']].map(([hour, minute]) => <Button key={`${hour}:${minute}`} type="button" size="sm" variant="outline" disabled={pending} onClick={() => setTime(hour, minute)}>{hour}:{minute}</Button>)}</div>
          <p className="text-xs text-muted-foreground">Formato de 24 horas: 19:30 es 7:30 de la tarde.</p>
        </div>
        <div className="min-w-0 rounded-xl border bg-background/60 p-4 space-y-4">
          <h4 className="text-sm font-semibold">3. ¿Cuánto tiempo se queda?</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2"><Label htmlFor={`${id}-hours`} className="block whitespace-nowrap">Horas</Label><Input id={`${id}-hours`} type="number" inputMode="numeric" min={0} max={87600} required value={hours} onChange={e => { setHours(e.target.value); clear(); }} disabled={pending} /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor={`${id}-minutes`} className="block whitespace-nowrap">Minutos</Label><Input id={`${id}-minutes`} type="number" inputMode="numeric" min={0} max={59} required value={minutes} onChange={e => { setMinutes(e.target.value); clear(); }} disabled={pending} /></div>
          </div>
          <div className="flex flex-wrap gap-2">{[['0', '30', '30 min'], ['1', '0', '1 hora'], ['24', '0', '1 día']].map(([h, m, label]) => <Button key={label} type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setHours(h); setMinutes(m); clear(); }}>{label}</Button>)}</div>
          <p className="text-xs text-muted-foreground">Por ejemplo: 2 horas y 17 minutos.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">Usamos hoy como entrada. Si se queda hasta otro día, la salida se calcula automáticamente.</p>
        <Button type="submit" disabled={pending} className="w-full shrink-0 sm:w-auto">{pending ? 'Calculando…' : 'Calcular ejemplo'}</Button>
      </div>
    </form>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {result && <div aria-live="polite" className="space-y-3 border-t border-amber-500/25 pt-5"><p className="text-2xl font-bold">Corresponde cobrar {formatPrice(result.price)}</p><p className="text-sm text-muted-foreground">Permanencia: {result.elapsedMinutes} min. Tiempo considerado para cobrar: {result.billableMinutes} min.</p><details className="rounded-lg border"><summary className="cursor-pointer p-3 font-medium">Ver cómo se calculó</summary><div className="border-t p-3"><PricingBreakdown lines={result.breakdown} total={result.price} /></div></details>{result.usedFallback && <p className="text-sm text-destructive">La estadía superó las duraciones con precio. Se usó la última tarifa disponible. Revisá las tarifas antes de usar este caso.</p>}</div>}
  </section>;
}
