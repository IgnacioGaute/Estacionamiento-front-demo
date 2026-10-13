'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, FlaskConical, Pencil, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { DataLoading } from '@/components/ui/data-loading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { toast } from '@/lib/toast';
import { getTariffPlanAction, saveTariffPlanAction } from '@/actions/tickets/tariff-plan.action';
import type { TariffDraft, TariffPlan } from '@/types/tariff-plan.type';
import type { ticketPrice } from '@/types/ticket-price';
import { changeMethod, tariffMethod, validateTariffDraft } from '@/utils/tariff-plan.utils';
import { TariffPasses } from './tariff-passes';
import { TariffEditor } from './tariff-editor';
import { TariffConfirmDialog } from './tariff-confirm-dialog';
import { TariffSummary } from './tariff-summary';
import { TariffSimulator } from './tariff-simulator';

const copyDraft = (plan: TariffPlan): TariffDraft => structuredClone({ schedule: plan.schedule, brackets: plan.brackets });
export function TariffsBody({ initialPlan, loadError, passPrices }: { initialPlan: TariffPlan | null; loadError?: string; passPrices: ticketPrice[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(params.get('tab') === 'pases' ? 'pases' : 'tiempo');
  const [current, setCurrent] = useState(initialPlan);
  const [draft, setDraft] = useState<TariffDraft | null>(null);
  const [baseRevision, setBaseRevision] = useState(initialPlan?.revision ?? '');
  const [baseDraft, setBaseDraft] = useState('');
  const [error, setError] = useState(loadError ?? '');
  const [conflict, setConflict] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [step, setStep] = useState(1);
  // Pasar también a la tarifa nueva los vehículos que están adentro: se decide en cada aplicación.
  const [aplicarActivos, setAplicarActivos] = useState(false);
  const [pending, startTransition] = useTransition();
  const { types: vehicles, loading, error: vehicleError } = useVehicleTypes();
  const previousInitial = useRef(initialPlan?.revision);
  const dirty = draft !== null && JSON.stringify(draft) !== baseDraft;
  const retiredMethod = draft !== null && !['CUSTOM', 'STARTED'].includes(tariffMethod(draft));
  const errors = draft ? [...(retiredMethod ? ['Elegí Lista de precios o Por hora o fracción para continuar.'] : []), ...validateTariffDraft(draft, vehicles)] : [];
  const activeStays = current?.activeStays ?? 0;
  const canApply =!pending && !loading && !vehicleError && dirty && errors.length === 0 && !conflict;
  const hasPrices = current &&(current.schedule.pricingOptions.charging.enabled ? current.schedule.pricingOptions.charging.rates.length : current.brackets.length) > 0;

  useEffect(() => {
    if (initialPlan && previousInitial.current !== initialPlan.revision) {
      previousInitial.current = initialPlan.revision;
      setCurrent(initialPlan);
      if (draft && initialPlan.revision !== baseRevision) setConflict(true);
      else if (!draft) setBaseRevision(initialPlan.revision);
    }
  }, [initialPlan, draft, baseRevision]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      if (!window.confirm('Tenés cambios de tarifas sin aplicar. Si salís, se perderá este borrador. ¿Salir de todos modos?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const edit = () => {
    if (!current) return;
    const saved = copyDraft(current);
    const next = !saved.brackets.length && !saved.schedule.pricingOptions.charging.rates.length ? changeMethod(saved, 'CUSTOM') : saved;
    setDraft(next); setBaseDraft(JSON.stringify(next)); setBaseRevision(current.revision); setConflict(false); setError(''); setStep(1); setAplicarActivos(false);
    window.scrollTo({ top: 0 });
  };
  const discard = () => {
    if (dirty) { setConfirmDiscard(true); return; }
    setDraft(null); setError(''); setConflict(false);
  };
  const reload = () => startTransition(async () => {
    const result = await getTariffPlanAction();
    if (result.error) setError(result.error);
    else if (result.plan) {
      setCurrent(result.plan); setError('');
      if (draft && result.plan.revision !== baseRevision) setConflict(true);
      else if (!draft) setBaseRevision(result.plan.revision);
    }
  });
  const save = () => {
    if (!draft || errors.length || conflict) return;
    startTransition(async () => {
      setError('');
      const result = await saveTariffPlanAction(baseRevision, draft, aplicarActivos && activeStays > 0);
      if (result.error) {
        setError(result.error);
        if (result.conflict) {
          setConflict(true);
          const latest = await getTariffPlanAction();
          if (latest.plan) setCurrent(latest.plan);
        }
        return;
      }
      if (result.plan) {
        const actualizadas = result.plan.estadiasActualizadas ?? 0;
        setCurrent(result.plan); setBaseRevision(result.plan.revision); setDraft(null); setConflict(false); setAplicarActivos(false);
        toast.success(actualizadas ? `Tarifas aplicadas a los próximos ingresos y a ${actualizadas === 1 ? 'el vehículo que está adentro' : `los ${actualizadas} vehículos que están adentro`}.` : 'Tarifas aplicadas a los próximos ingresos.'); router.refresh();
      }
    });
  };
  // Editar es una vista aparte: mientras hay borrador sólo se ven los pasos, sin el resumen, las
  // pestañas ni el simulador abiertos alrededor.
  if (draft && current) return <>
    <section aria-labelledby="tariff-draft-heading" className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={discard} disabled={pending} aria-label="Volver a tarifas" className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50"><ArrowLeft className="size-4" aria-hidden="true" />Tarifas</button>
        <Button type="button" variant="ghost" disabled={pending} onClick={discard}><X className="mr-1 size-4" aria-hidden="true" />{dirty ? 'Descartar cambios' : 'Cancelar'}</Button>
      </div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gm-yellow/35 bg-gm-yellow/10 px-2.5 py-0.5 text-[11px] font-bold text-gm-yellow"><span aria-hidden className="size-1.5 rounded-full bg-gm-yellow" />Borrador · todavía no se cobra</span>
        <h1 id="tariff-draft-heading" className="gm-display mt-3 text-[30px] leading-none sm:text-[36px]">Editar tarifas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Completá los 3 pasos. Los cambios se aplican juntos al final.</p>
      </div>
      {vehicleError && <p role="alert" className="text-sm text-destructive">{vehicleError}</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {conflict && <div role="alert" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><p className="font-semibold">Las tarifas o los vehículos cambiaron mientras editabas.</p><p>Tu borrador se conserva. Revisá la configuración vigente y comparala con tu borrador antes de continuar.</p>
        <details className="rounded-xl border border-amber-500/30 bg-background/40"><summary className="cursor-pointer px-3 py-2 font-medium">Ver las tarifas vigentes</summary><div className="border-t border-amber-500/30 p-3"><TariffSummary plan={current} vehicles={vehicles} /></div></details>
        {current.revision !== baseRevision ? <Button type="button" variant="outline" disabled={pending} onClick={() => { setBaseRevision(current.revision); setDraft(previous => previous ? { ...previous, brackets: previous.brackets.map(row => { if (!row.id || current.brackets.some(saved => saved.id === row.id)) return row; const { id: _obsoleteId, ...fields } = row; return fields; }) } : previous); setBaseDraft(JSON.stringify(copyDraft(current))); setConflict(false); setError(''); }}>Revisé la versión vigente: conservar mi borrador</Button> : <Button variant="outline" disabled={pending} onClick={reload}>Cargar la versión vigente</Button>}
        <p className="text-xs text-muted-foreground">Luego podrás aplicar tu borrador completo. Si otra persona vuelve a modificar las tarifas, te avisaremos nuevamente.</p></div>}
      {loading ? <DataLoading label="Cargando tipos de vehículo…" /> : <fieldset disabled={pending || !!vehicleError} className="min-w-0">
        <TariffEditor draft={draft} onChange={next => { setDraft(next); setError(''); }} vehicles={vehicles} step={step} onStepChange={setStep} canApply={canApply} applying={pending} onApply={save} disabled={pending || !!vehicleError}
          notice={<>
            {activeStays > 0 && <label className={'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-colors ' + (aplicarActivos ? 'border-gm-yellow/50 bg-gm-yellow/[0.06]' : 'border-gm-line bg-gm-surface-2')}>
              <Checkbox checked={aplicarActivos} onCheckedChange={value => setAplicarActivos(value === true)} className="mt-0.5" aria-describedby="aplicar-activos-ayuda" />
              <span className="min-w-0">
                <span className="block font-semibold">{activeStays === 1 ? 'Aplicar también al vehículo que está adentro' : `Aplicar también a los ${activeStays} vehículos que están adentro`}</span>
                <span id="aplicar-activos-ayuda" className="mt-1 block text-xs leading-relaxed text-muted-foreground">Se recalcula toda su estadía con la tarifa nueva, desde que entraron. Lo que ya pagaron se descuenta y, si pagaron de más, se devuelve al cobrar la salida. Sin marcarlo, siguen con la tarifa con la que entraron.</span>
              </span>
            </label>}
            {errors.length > 0 ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm" role="status"><p className="font-medium">Para poder aplicar el borrador:</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.map(message => <li key={message}>{message}</li>)}</ul></div>
              : conflict ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm" role="status">Revisá el aviso de arriba antes de aplicar.</p>
              : <p className="text-xs text-muted-foreground">{!dirty ? 'Todavía no hay cambios para aplicar.' : aplicarActivos ? 'Los nuevos ingresos y los vehículos que están adentro usan la tarifa nueva.' : 'Las estadías con tarifa fijada al ingresar conservan sus precios.'}</p>}
          </>} />
      </fieldset>}
      {!loading && <details data-tariff-try className="group rounded-2xl border border-gm-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors hover:bg-gm-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><FlaskConical className="size-4 text-gm-yellow" aria-hidden="true" />Probar cuánto cobrarías</span><ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="border-t border-gm-line p-3 sm:p-4"><TariffSimulator draft={draft} revision={current.revision} invalid={!!vehicleError || retiredMethod} vehicles={vehicles} /></div>
      </details>}
    </section>
    <TariffConfirmDialog open={confirmDiscard} onOpenChange={setConfirmDiscard} title="¿Descartar los cambios?" description="Se perderán los cambios de este borrador. Tus tarifas vigentes se conservan." confirmLabel="Descartar borrador" onConfirm={() => { setDraft(null); setError(''); setConflict(false); }} />
  </>;
  return <>
    <PageHeader breadcrumb={['Estacionamiento', 'Administración', 'Tarifas']} title="Tarifas" description="Definí tus precios, probá cuánto cobrarías y aplicá los cambios juntos." />
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Tipos de tarifa" className="mb-4 grid h-auto w-full grid-cols-2 sm:w-fit">
        <TabsTrigger value="tiempo" className="px-4 py-2">Por tiempo</TabsTrigger>
        <TabsTrigger value="pases" className="px-4 py-2">Día / semana / mes</TabsTrigger>
      </TabsList>
      <TabsContent value="tiempo" className="space-y-6">
        {!current ? <section className="space-y-3 rounded-xl border p-5"><h2 className="font-semibold">No se pudieron cargar las tarifas</h2><p className="text-sm text-destructive" role="alert">{error || 'Intentá nuevamente.'}</p><Button variant="outline" disabled={pending} onClick={reload}>Volver a intentar</Button></section> : <>
          <TariffSummary plan={current} vehicles={vehicles} />
          {vehicleError && <p role="alert" className="text-sm text-destructive">{vehicleError}</p>}
          <div className="flex flex-wrap items-center gap-3"><Button onClick={edit} disabled={pending}><Pencil className="mr-2 size-4" aria-hidden="true" />{hasPrices ? 'Editar tarifas' : 'Configurar mis tarifas'}</Button><p className="text-sm text-muted-foreground">Podés probar los cambios antes de aplicarlos.</p></div>
          {loading ? <DataLoading label="Cargando tarifas…" /> : <TariffSimulator draft={null} revision={current.revision} invalid={!!vehicleError} vehicles={vehicles} />}
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
        </>}
      </TabsContent>
      <TabsContent value="pases" className="space-y-4">
        <TariffPasses prices={passPrices} vehicles={vehicles} />
      </TabsContent>
    </Tabs>
  </>;
}
