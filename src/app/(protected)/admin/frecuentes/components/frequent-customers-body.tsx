'use client';

import { useRef, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import { CalendarDays, ChevronDown, Clock3, Filter, Inbox, Phone, RotateCcw, Users } from 'lucide-react';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataLoading } from '@/components/ui/data-loading';
import { getFrequentCustomersPageAction } from '@/actions/tickets/get-frequent-customers.action';
import type { FrequentCustomer } from '@/types/frequent-customer.type';
import { formatElapsed } from '@/utils/ticket-registration.utils';
import { PlateHistoryDialog } from './plate-history-dialog';
import { TariffSelect } from '../../tarifas/tariff-select';
import { AppDatePicker } from '@/components/app-date-picker';

const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'filtros',
    selector: '[data-tour="frecuentes-filtros"]',
    title: 'Período que se mira',
    desc: 'La lista incluye ingresos entre estas fechas, incluso abiertos. Los clientes con teléfono aparecen desde su primera visita.',
    radius: 10,
  },
  {
    key: 'tipo',
    selector: '[data-tour="frecuentes-tipo"]',
    title: 'Filtrar por tipo de vehículo',
    desc: 'Sirve para ver, por ejemplo, solo las camionetas que vuelven seguido.',
    radius: 10,
  },
  {
    key: 'visitas',
    selector: '[data-tour="frecuentes-visitas"]',
    title: 'Cuántas visitas cuentan',
    desc: 'Filtra por cantidad de ingresos. Los contactos con teléfono se conservan en la lista aunque no alcancen ese mínimo.',
    radius: 10,
  },
  {
    key: 'aplicar',
    selector: '[data-tour="frecuentes-aplicar"]',
    title: 'Aplicar filtros',
    desc: 'Los cambios no se aplican solos: tocá acá para rearmar la lista.',
    radius: 10,
  },
  {
    key: 'tabla',
    selector: '[data-tour="frecuentes-tabla"]',
    title: 'La lista',
    desc: 'Cada fila es una patente con sus visitas, el tipo de vehículo y cuándo vino la última vez. Usá Ver historial para consultar sus ingresos y salidas.',
    radius: 10,
  },
];


type Filters = { from: string; to: string; vehicleType: string; minVisits: string };
const defaults: Filters = { from: '', to: '', vehicleType: 'ALL', minVisits: '2' };
const date = (value: string) => dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '—';
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const duration = (value: number | null) => value === null ? 'Sin datos' : formatElapsed(value);

export function FrequentCustomersBody({ initialCustomers, initialTotal }: { initialCustomers: FrequentCustomer[]; initialTotal: number }) {
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [total, setTotal] = useState(initialTotal);
  const [customers, setCustomers] = useState(initialCustomers);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [applied, setApplied] = useState<Filters>(defaults);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const request = useRef(0);
  const { types, error: vehicleError } = useVehicleTypes();
  const names = new Map(types.map(type => [type.code, type.name]));
  const vehicleName = (code: string) => names.get(code) ?? ({ AUTO: 'Auto', CAMIONETA: 'Camioneta', MOTO: 'Moto' }[code] ?? code);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const update = (patch: Partial<Filters>) => { setDraft(previous => ({ ...previous, ...patch })); setError(''); };
  const load = (filters: Filters, nextPage = 0) => {
    if (filters.from && filters.to && filters.from > filters.to) { setError('La fecha Desde no puede ser posterior a Hasta.'); return; }
    if (!/^\d+$/.test(filters.minVisits) || Number(filters.minVisits) < 1) { setError('Ingresá un mínimo de visitas entero, mayor o igual a 1.'); return; }
    const token = ++request.current;
    startTransition(async () => {
      try {
        const result = await getFrequentCustomersPageAction({ page: nextPage + 1, limit: 25, from: filters.from || undefined, to: filters.to || undefined,
          vehicleType: filters.vehicleType === 'ALL' ? undefined : filters.vehicleType, minVisits: Number(filters.minVisits) });
        if (token !== request.current) return;
        setCustomers(result.data); setTotal(result.meta.totalItems); setPage(nextPage); setApplied(filters); setExpanded(null); setError('');
      } catch { if (token === request.current) setError('No se pudo consultar el listado. Los resultados anteriores se conservan. Volvé a aplicar los filtros.'); }
    });
  };
  const period = (days: number | null) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    update(days === null ? { from: '', to: '' } : { from: dayjs(today).subtract(days - 1, 'day').format('YYYY-MM-DD'), to: today });
  };
  const contactCount = customers.filter(customer => customer.phoneCustomer).length;
  const vehicleOptions = [...new Set([...types.filter(t => t.enabled).map(t => t.code), ...customers.map(c => c.vehicleType), ...(draft.vehicleType === 'ALL' ? [] : [draft.vehicleType])])];
  const chips = [applied.from || applied.to ? (applied.from ? date(applied.from) : 'Desde el inicio') + ' → ' + (applied.to ? date(applied.to) : 'Hoy') : 'Todo el historial', applied.vehicleType === 'ALL' ? 'Todos los vehículos' : vehicleName(applied.vehicleType), 'Desde ' + applied.minVisits + ' visitas + contactos'];

  return <div className="space-y-6">
    <PageHeader breadcrumb={['Estacionamiento', 'Administración', 'Frecuentes']} title="Clientes frecuentes"
      description="Consultá quiénes vuelven, sus contactos y su historial de visitas." actions={<div onClickCapture={() => setFiltersOpen(true)}><PageTour steps={TOUR_STEPS} /></div>} />
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ icon: Users, label: 'Clientes encontrados', value: total.toLocaleString('es-AR'), detail: 'Con los filtros aplicados' },
        { icon: CalendarDays, label: 'En esta página', value: String(customers.length), detail: total ? 'Resultados ' + (page * 25 + 1) + ' a ' + (page * 25 + customers.length) : 'Sin resultados' },
        { icon: Phone, label: 'Con teléfono', value: String(contactCount), detail: 'De los clientes de esta página' }].map(({icon: Icon, label, value, detail}) =>
        <div key={label} className="flex items-start gap-3 rounded-2xl border bg-card p-4"><span className="rounded-xl border bg-muted/30 p-2.5 text-muted-foreground"><Icon className="size-4" aria-hidden="true" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">25 clientes por página</p><Button type="button" variant="outline" aria-expanded={filtersOpen} aria-controls="frequent-filters" onClick={() => setFiltersOpen(value => !value)}><Filter className="mr-2 size-4" aria-hidden="true" />{filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}{dirty && <span className="ml-2 size-2 rounded-full bg-amber-400" aria-label="Cambios sin aplicar" />}<ChevronDown className={'ml-2 size-4 transition-transform motion-reduce:transition-none ' + (filtersOpen ? 'rotate-180' : '')} aria-hidden="true" /></Button></div>
    <div id="frequent-filters" hidden={!filtersOpen}>
    <form data-tour="frecuentes-filtros" onSubmit={event => { event.preventDefault(); load(draft); }} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Filter className="size-4 text-amber-400" aria-hidden="true" />Filtrar clientes</h2><div className="flex flex-wrap gap-2">{[[null,'Todo el historial'],[7,'Últimos 7 días'],[30,'Últimos 30 días']] .map(([days,label]) => <Button key={String(label)} type="button" variant="outline" size="sm" disabled={isPending} onClick={() => period(days as number | null)}>{label}</Button>)}</div></div>
      <fieldset disabled={isPending} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 space-y-2 text-sm font-medium"><span className="block">Desde</span><AppDatePicker title="Desde" value={draft.from} max={draft.to || undefined} clearable onChange={from => update({from})} trigger={<Button type="button" variant="outline" aria-label="Elegir fecha desde" className="h-11 w-full justify-start gap-2 rounded-xl font-normal"><CalendarDays className="size-4 shrink-0 text-gm-yellow" />{draft.from ? date(draft.from) : 'Elegir fecha'}</Button>} /></div>
        <div className="min-w-0 space-y-2 text-sm font-medium"><span className="block">Hasta</span><AppDatePicker title="Hasta" value={draft.to} min={draft.from || undefined} clearable onChange={to => update({to})} trigger={<Button type="button" variant="outline" aria-label="Elegir fecha hasta" className="h-11 w-full justify-start gap-2 rounded-xl font-normal"><CalendarDays className="size-4 shrink-0 text-gm-yellow" />{draft.to ? date(draft.to) : 'Elegir fecha'}</Button>} /></div>
        <label data-tour="frecuentes-tipo" className="min-w-0 space-y-2 text-sm font-medium"><span className="block">Tipo de vehículo</span><TariffSelect disabled={isPending} name="Tipo de vehículo" value={draft.vehicleType} onValueChange={vehicleType => update({vehicleType})} options={[{value:'ALL',label:'Todos los vehículos'}, ...vehicleOptions.map(code => ({value:code,label:vehicleName(code)}))]} /></label>
        <label data-tour="frecuentes-visitas" className="min-w-0 space-y-2 text-sm font-medium"><span className="block">Mínimo de visitas</span><Input aria-label="Mínimo de visitas" type="number" min={1} step={1} required value={draft.minVisits} onChange={event => update({minVisits:event.target.value})} className="h-11" /></label>
      </fieldset>
      {vehicleError && <p className="text-xs text-muted-foreground">{vehicleError} Se muestran también los tipos presentes en los resultados.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Los clientes con teléfono aparecen desde su primera visita, aunque no alcancen el mínimo.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={isPending} onClick={() => {setDraft(defaults);load(defaults);}}><RotateCcw className="mr-2 size-4" aria-hidden="true" />Limpiar</Button><Button data-tour="frecuentes-aplicar" type="submit" disabled={isPending}>{isPending ? 'Buscando…' : 'Aplicar filtros'}</Button></div></div>
      {dirty && <p role="status" className="text-xs text-amber-400">Tenés filtros sin aplicar. La lista muestra la última consulta.</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    </form>
    </div>
    {!filtersOpen && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <section data-tour="frecuentes-tabla" aria-busy={isPending} className="space-y-4 rounded-2xl border bg-card p-3 sm:p-5">
      <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Clientes <span className="ml-1 text-sm font-normal text-muted-foreground">{total.toLocaleString('es-AR')}</span></h2><p role="status" className="text-xs text-muted-foreground">{isPending ? 'Actualizando resultados…' : 'Ordenados por cantidad de visitas'}</p></div><div className="flex flex-wrap gap-2">{chips.map(chip => <span key={chip} className="rounded-full border bg-background/40 px-3 py-1 text-xs text-muted-foreground">{chip}</span>)}</div></div>
      <div className={'space-y-2 transition-opacity ' + (isPending ? 'opacity-50' : '')}>
        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground xl:grid"><span>Cliente y vehículo</span><span>Visitas</span><span>Última visita</span><span>Gasto registrado</span><span className="text-right">Historial</span></div>
        {isPending ? <DataLoading label="Cargando clientes..." /> : !customers.length ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center"><Inbox className="size-8 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">No encontramos clientes</h3><p className="text-sm text-muted-foreground">Probá ampliar el período o reducir el mínimo de visitas.</p></div> : customers.map(customer => {
          const open = expanded === customer.licensePlateNormalized;
          const detailsId = 'frequent-details-' + encodeURIComponent(customer.licensePlateNormalized);
          return <article key={customer.licensePlateNormalized} className="overflow-hidden rounded-xl border bg-background/40 transition-colors hover:border-neutral-500/50">
            <div className="grid items-center gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px]">
              <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-neutral-500/40 bg-white/[0.06] px-2.5 py-1 font-bold tracking-wide">{customer.licensePlateOriginal}</span><span className="text-xs text-muted-foreground">{vehicleName(customer.vehicleType)}</span></div><p className="break-words text-sm">{customer.lastNameCustomer || 'Sin apellido guardado'}</p><p className="flex items-center gap-1.5 break-all text-xs text-muted-foreground"><Phone className="size-3 shrink-0" aria-hidden="true" />{customer.phoneCustomer ? '+' + customer.phoneCustomer.replace(/^\+/, '') : 'Sin teléfono'}</p></div>
              <div><p className="mb-1 text-xs text-muted-foreground xl:hidden">Visitas</p><span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-bold tabular-nums text-amber-300">{customer.visits} {customer.visits === 1 ? 'visita' : 'visitas'}</span><p className="mt-2 text-xs text-muted-foreground">{customer.avgDaysBetweenVisits !== null ? 'Cada ' + customer.avgDaysBetweenVisits.toLocaleString('es-AR',{maximumFractionDigits:1}) + ' días en promedio' : 'Sin intervalo suficiente'}</p></div>
              <div><p className="mb-1 text-xs text-muted-foreground xl:hidden">Última visita</p><p className="text-sm font-medium tabular-nums">{date(customer.lastVisit)}</p><p className="mt-1 text-xs text-muted-foreground">Primera: {date(customer.firstVisit)}</p></div>
              <div><p className="mb-1 text-xs text-muted-foreground xl:hidden">Gasto registrado</p><p className="text-base font-bold tabular-nums">{money(customer.totalSpent)}</p><p className="mt-1 text-xs text-muted-foreground">En el período consultado</p></div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end"><PlateHistoryDialog licensePlateNormalized={customer.licensePlateNormalized} licensePlateOriginal={customer.licensePlateOriginal} /></div>
            </div>
            <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setExpanded(open ? null : customer.licensePlateNormalized)} className="flex min-h-10 w-full items-center justify-between gap-2 border-t px-4 py-2 text-left text-xs text-muted-foreground hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"><span className="flex items-center gap-2"><Clock3 className="size-3.5" aria-hidden="true" />Duración y franja habitual</span><ChevronDown className={'size-4 transition-transform motion-reduce:transition-none ' + (open ? 'rotate-180' : '')} aria-hidden="true" /></button>
            {open && <dl id={detailsId} className="grid gap-4 border-t bg-muted/15 p-4 sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Duración típica</dt><dd className="mt-1 text-sm font-medium">{duration(customer.medianDurationMinutes)}</dd></div><div><dt className="text-xs text-muted-foreground">Duración mínima / máxima</dt><dd className="mt-1 text-sm">{duration(customer.minDurationMinutes)} / {duration(customer.maxDurationMinutes)}</dd></div><div><dt className="text-xs text-muted-foreground">Franja habitual</dt><dd className="mt-1 text-sm">{customer.mostCommonBracket ?? 'Sin datos'}</dd></div></dl>}
          </article>;
        })}
      </div>
      <nav aria-label="Páginas de clientes frecuentes" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">{total ? (page * 25 + 1) + '–' + Math.min(page * 25 + customers.length, total) + ' de ' + total + ' clientes' : '0 clientes'}</p>
        <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={isPending || page === 0} onClick={() => load(applied, page - 1)}>Anterior</Button><span className="text-xs tabular-nums">{page + 1} / {Math.max(1, Math.ceil(total / 25))}</span><Button type="button" variant="outline" size="sm" disabled={isPending || page + 1 >= Math.ceil(total / 25)} onClick={() => load(applied, page + 1)}>Siguiente</Button></div>
      </nav>
    </section>
  </div>;
}
