'use client';

import { useRef, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import { CalendarDays, Inbox, Phone, RotateCcw } from 'lucide-react';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { useTenant } from '@/components/tenant-provider';
import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { Button } from '@/components/ui/button';
import { DataLoading } from '@/components/ui/data-loading';
import { cn } from '@/lib/utils';
import { getFrequentCustomersPageAction } from '@/actions/tickets/get-frequent-customers.action';
import type { FrequentCustomer } from '@/types/frequent-customer.type';
import { formatEstadia } from '@/utils/estadia';
import { PlateHistoryDialog } from './plate-history-dialog';
import { TariffSelect } from '../../tarifas/tariff-select';
import { AppDatePicker } from '@/components/app-date-picker';
import {
  CabeceraTabla, ChapaVehiculo, ChipFiltro, EtiquetaTipo, Permanencia, PieTabla, TarjetaResumen, tarjetaPlanilla, tdPlanilla, thPlanilla,
} from '@/components/planilla/planilla-ui';

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
const POR_PAGINA = 25;
const defaults: Filters = { from: '', to: '', vehicleType: 'ALL', minVisits: '2' };
const date = (value: string) => dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '—';
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function FrequentCustomersBody({ initialCustomers, initialTotal }: { initialCustomers: FrequentCustomer[]; initialTotal: number }) {
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(initialTotal);
  const [customers, setCustomers] = useState(initialCustomers);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [applied, setApplied] = useState<Filters>(defaults);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const request = useRef(0);
  const { types, error: vehicleError } = useVehicleTypes();
  // Playa gratuita: las visitas no tienen importe ni franja de tarifa.
  const { cobroHabilitado } = useTenant();
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
        const result = await getFrequentCustomersPageAction({ page: nextPage + 1, limit: POR_PAGINA, from: filters.from || undefined, to: filters.to || undefined,
          vehicleType: filters.vehicleType === 'ALL' ? undefined : filters.vehicleType, minVisits: Number(filters.minVisits) });
        if (token !== request.current) return;
        setCustomers(result.data); setTotal(result.meta.totalItems); setPage(nextPage); setApplied(filters); setError('');
      } catch { if (token === request.current) setError('No se pudo consultar el listado. Los resultados anteriores se conservan. Volvé a aplicar los filtros.'); }
    });
  };
  const today = hoyAR();
  const desdeHace = (days: number) => dayjs(today).subtract(days - 1, 'day').format('YYYY-MM-DD');
  const period = (days: number | null) => update(days === null ? { from: '', to: '' } : { from: desdeHace(days), to: today });
  const periodoActivo = (days: number | null) => days === null ? !draft.from && !draft.to : draft.from === desdeHace(days) && draft.to === today;
  const contactCount = customers.filter(customer => customer.phoneCustomer).length;
  const vehicleOptions = [...new Set([...types.filter(t => t.enabled).map(t => t.code), ...customers.map(c => c.vehicleType), ...(draft.vehicleType === 'ALL' ? [] : [draft.vehicleType])])];
  const resumenFiltros = [
    applied.from || applied.to ? (applied.from ? date(applied.from) : 'Desde el inicio') + ' → ' + (applied.to ? date(applied.to) : 'Hoy') : 'Todo el historial',
    applied.vehicleType === 'ALL' ? 'Todos los vehículos' : vehicleName(applied.vehicleType),
    'Desde ' + applied.minVisits + ' visitas',
  ].join(' · ');
  const botonFecha = (valor: string, vacio: string, etiqueta: string) => (
    <Button type="button" variant="outline" aria-label={etiqueta} className="h-10 gap-2 rounded-full border-gm-line-strong px-3.5 text-[13px] font-semibold">
      <CalendarDays className="size-[15px] text-gm-yellow" aria-hidden />{valor ? date(valor) : vacio}
    </Button>
  );
  const visitasTexto = (c: FrequentCustomer) => c.avgDaysBetweenVisits !== null ? 'cada ' + c.avgDaysBetweenVisits.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' días' : 'sin intervalo suficiente';
  const rango = (c: FrequentCustomer) => c.minDurationMinutes != null && c.maxDurationMinutes != null ? `${formatEstadia(c.minDurationMinutes)} a ${formatEstadia(c.maxDurationMinutes)}` : null;

  return <div className="flex flex-col gap-5">
    <PageHeader breadcrumb={['Estacionamiento', 'Administración', 'Frecuentes']} title="Clientes frecuentes"
      description="Quiénes vuelven, sus contactos y su historial de visitas." actions={<PageTour steps={TOUR_STEPS} />} />

    <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-3 [&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1">
      <TarjetaResumen destacada etiqueta="Clientes" valor={total.toLocaleString('es-AR')} detalle="con los filtros aplicados" />
      <TarjetaResumen etiqueta="En esta página" valor={customers.length} detalle={total ? `resultados ${page * POR_PAGINA + 1} a ${page * POR_PAGINA + customers.length}` : 'sin resultados'} />
      <TarjetaResumen etiqueta="Con teléfono" valor={contactCount} detalle="de los clientes de esta página" />
    </section>

    <form data-tour="frecuentes-filtros" onSubmit={event => { event.preventDefault(); load(draft); }} className={cn(tarjetaPlanilla, 'flex flex-col gap-3 p-3.5')}>
      <div role="group" aria-label="Período" className="flex flex-wrap items-center gap-1.5">
        <ChipFiltro disabled={isPending} activo={periodoActivo(null)} onClick={() => period(null)}>Todo el historial</ChipFiltro>
        <ChipFiltro disabled={isPending} activo={periodoActivo(7)} onClick={() => period(7)}>7 días</ChipFiltro>
        <ChipFiltro disabled={isPending} activo={periodoActivo(30)} onClick={() => period(30)}>30 días</ChipFiltro>
        <AppDatePicker title="Desde" value={draft.from} max={draft.to || undefined} clearable onChange={from => update({ from })} trigger={botonFecha(draft.from, 'Desde', 'Elegir fecha desde')} />
        <AppDatePicker title="Hasta" value={draft.to} min={draft.from || undefined} clearable onChange={to => update({ to })} trigger={botonFecha(draft.to, 'Hasta', 'Elegir fecha hasta')} />
      </div>
      <fieldset disabled={isPending} className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div data-tour="frecuentes-tipo" className="min-w-0">
          <TariffSelect disabled={isPending} name="Tipo de vehículo" value={draft.vehicleType} onValueChange={vehicleType => update({ vehicleType })}
            options={[{ value: 'ALL', label: 'Todos los vehículos' }, ...vehicleOptions.map(code => ({ value: code, label: vehicleName(code) }))]} />
        </div>
        <label data-tour="frecuentes-visitas" className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-gm-line-strong bg-background px-3.5 text-sm">
          <span className="shrink-0 text-muted-foreground">Mínimo de visitas</span>
          <input aria-label="Mínimo de visitas" type="number" min={1} step={1} required value={draft.minVisits} onChange={event => update({ minVisits: event.target.value })}
            className="gm-mono h-full min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold text-foreground outline-none" />
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="h-11" disabled={isPending} onClick={() => { setDraft(defaults); load(defaults); }}><RotateCcw className="mr-2 size-4" aria-hidden />Limpiar</Button>
          <Button data-tour="frecuentes-aplicar" type="submit" className="h-11 rounded-xl" disabled={isPending}>{isPending ? 'Buscando…' : 'Aplicar'}</Button>
        </div>
      </fieldset>
      {vehicleError && <p className="px-1 text-xs text-muted-foreground">{vehicleError} Se muestran también los tipos presentes en los resultados.</p>}
      {dirty && <p role="status" className="px-1 text-xs text-gm-yellow">Tenés filtros sin aplicar. La lista muestra la última consulta.</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    </form>

    <section data-tour="frecuentes-tabla" aria-label="Clientes" aria-busy={isPending} className={cn(tarjetaPlanilla, 'overflow-hidden')}>
      <CabeceraTabla titulo="Clientes" cantidad={total}>
        <span className="text-xs text-muted-foreground">{resumenFiltros} · ordenados por visitas</span>
      </CabeceraTabla>
      {isPending ? <div className="p-6"><DataLoading label="Cargando clientes…" /></div> : !customers.length ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <h3 className="font-semibold">No encontramos clientes</h3>
          <p className="text-sm text-muted-foreground">Probá ampliar el período o reducir el mínimo de visitas.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-[#15130F]">
                <tr>
                  <th scope="col" className={thPlanilla}>Cliente</th>
                  <th scope="col" className={thPlanilla}>Tipo</th>
                  <th scope="col" className={thPlanilla}>Visitas</th>
                  <th scope="col" className={thPlanilla}>Última visita</th>
                  <th scope="col" className={cn(thPlanilla, 'w-[200px]')}>Permanencia típica</th>
                  {cobroHabilitado && <th scope="col" className={thPlanilla}>Gasto</th>}
                  <th scope="col" className={cn(thPlanilla, 'text-right')}><span className="sr-only">Historial</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.licensePlateNormalized} className="border-t border-gm-line transition-colors hover:bg-gm-surface-2">
                    <td className={tdPlanilla}>
                      <div className="flex items-center gap-3">
                        <ChapaVehiculo texto={c.licensePlateOriginal} />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold">{c.lastNameCustomer || 'Sin apellido guardado'}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="size-3 shrink-0" aria-hidden />{c.phoneCustomer ? '+' + c.phoneCustomer.replace(/^\+/, '') : 'Sin teléfono'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdPlanilla}><EtiquetaTipo>{vehicleName(c.vehicleType)}</EtiquetaTipo></td>
                    <td className={cn(tdPlanilla, 'whitespace-nowrap')}>
                      <span className="gm-mono block text-[15px] font-bold">{c.visits}</span>
                      <span className="block text-xs text-muted-foreground">{visitasTexto(c)}</span>
                    </td>
                    <td className={cn(tdPlanilla, 'whitespace-nowrap')}>
                      <span className="gm-mono block text-[14px] font-bold">{date(c.lastVisit)}</span>
                      <span className="block text-xs text-muted-foreground">primera {date(c.firstVisit)}</span>
                    </td>
                    <td className={tdPlanilla}>
                      <Permanencia minutos={c.medianDurationMinutes} />
                      {(rango(c) || (cobroHabilitado && c.mostCommonBracket)) && (
                        <span className="mt-1 block text-xs text-muted-foreground">{[rango(c), cobroHabilitado ? c.mostCommonBracket : null].filter(Boolean).join(' · ')}</span>
                      )}
                    </td>
                    {cobroHabilitado && <td className={cn(tdPlanilla, 'whitespace-nowrap')}><span className="gm-mono text-[14px] font-bold">{money(c.totalSpent)}</span></td>}
                    <td className={cn(tdPlanilla, 'text-right')}><PlateHistoryDialog licensePlateNormalized={c.licensePlateNormalized} licensePlateOriginal={c.licensePlateOriginal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 p-3 md:hidden">
            {customers.map(c => (
              <li key={c.licensePlateNormalized} className="flex flex-col gap-2.5 rounded-2xl border border-gm-line bg-gm-surface-2 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2"><ChapaVehiculo texto={c.licensePlateOriginal} /><span className="text-xs text-muted-foreground">{vehicleName(c.vehicleType)}</span></div>
                  <span className="gm-mono shrink-0 text-[13px] font-bold">{c.visits} {c.visits === 1 ? 'visita' : 'visitas'}</span>
                </div>
                <p className="text-[13px]"><span className="font-semibold">{c.lastNameCustomer || 'Sin apellido guardado'}</span><span className="text-muted-foreground"> · {c.phoneCustomer ? '+' + c.phoneCustomer.replace(/^\+/, '') : 'sin teléfono'}</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="block text-[11px] text-muted-foreground">Última visita</span><span className="gm-mono text-[14px] font-bold">{date(c.lastVisit)}</span></div>
                  {cobroHabilitado && <div><span className="block text-[11px] text-muted-foreground">Gasto</span><span className="gm-mono text-[14px] font-bold">{money(c.totalSpent)}</span></div>}
                </div>
                <Permanencia minutos={c.medianDurationMinutes} />
                <PlateHistoryDialog licensePlateNormalized={c.licensePlateNormalized} licensePlateOriginal={c.licensePlateOriginal} />
              </li>
            ))}
          </ul>
        </>
      )}
      <PieTabla pagina={page} porPagina={POR_PAGINA} total={total} mostrados={customers.length} onCambiar={p => load(applied, p)} disabled={isPending} />
    </section>
  </div>;
}
