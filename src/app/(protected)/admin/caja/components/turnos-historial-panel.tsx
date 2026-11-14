'use client';
import { TurnoResumenPanel } from '@/components/turno-resumen';
import { Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompactPagination } from '@/components/compact-pagination';
import { Iniciales, money, Pill } from '@/components/turno-ui';
import { cn } from '@/lib/utils';
import { Turno } from '@/types/turno.type';
import { getTurnosAction, getOperadoresAction } from '@/actions/turnos/cash-context.action';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const PAGE_SIZE = 10;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const date = (s: string) => dayjs(s).tz(TZ).format('DD/MM/YY · HH:mm');
const hora = (s: string) => dayjs(s).tz(TZ).format('HH:mm');

function CorteDiario({ turno }: { turno: Turno }) {
  return <details className="group rounded-xl border border-dashed border-gm-line">
    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-gm-surface-3/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gm-yellow [&::-webkit-details-marker]:hidden">
      <span className="font-semibold text-foreground">{operator(turno.usuarioApertura)}</span>
      <span>Corte de jornada · {turno.caja?.nombre ?? 'Caja del esquema anterior'} · <span className="gm-mono">{rango(turno.fechaApertura, turno.fechaCierre)}</span></span>
      {turno.resumen && <span>Cobró <span className="font-semibold tabular-nums text-foreground">{money(turno.resumen.efectivoCobrado)}</span> en efectivo</span>}
      <span className="ml-auto inline-flex items-center gap-1">Sigue en la próxima planilla<ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden /></span>
    </summary>
    <div className="border-t border-dashed border-gm-line px-4 py-3 text-sm"><TurnoResumenPanel turno={turno} /></div>
  </details>;
}
// Mientras carga, filas con la forma de los turnos en vez del ícono grande: junto con el de las
// cajas eran dos animaciones con brillo a la vez y la página saltaba al llegar los datos.
export function TurnosCargando() {
  return <div role="status" className="space-y-2">
    <span className="sr-only">Cargando turnos…</span>
    <Skeleton aria-hidden className="mx-1 h-3 w-14" />
    {[0, 1, 2].map(i => <div key={i} aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gm-line px-4 py-3">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3 w-56 max-w-full" />
      <Skeleton className="ml-auto h-3 w-28" />
    </div>)}
  </div>;
}

// Si el turno cruza de día se muestran las fechas: un corte diario se leía «00:00 – 00:00», como si
// hubiera durado cero.
const rango = (desde: string, hasta?: string | null) => {
  if (!hasta) return hora(desde) + ' – s/f';
  const mismoDia = dayjs(desde).tz(TZ).format('YYYY-MM-DD') === dayjs(hasta).tz(TZ).format('YYYY-MM-DD');
  return mismoDia ? `${hora(desde)} – ${hora(hasta)}` : `${dayjs(desde).tz(TZ).format('DD/MM HH:mm')} → ${dayjs(hasta).tz(TZ).format('DD/MM HH:mm')}`;
};
const operator = (user: Turno['usuarioCierre']) => user ? `${user.firstName} ${user.lastName}`.trim() : 'Operador no disponible';
type Period = 'today' | 'week' | 'month' | 'all';
const periods: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'all', label: 'Todos' },
];

// Los cierres se agrupan por el día en que cerraron: «Hoy», «Ayer» o «sábado 10/10».
function diaDe(turno: Turno) {
  if (!turno.fechaCierre) return 'Sin fecha de cierre';
  const d = dayjs(turno.fechaCierre).tz(TZ);
  const hoy = dayjs().tz(TZ);
  if (d.isSame(hoy, 'day')) return 'Hoy';
  if (d.isSame(hoy.subtract(1, 'day'), 'day')) return 'Ayer';
  return `${DIAS[d.day()]} ${d.format('DD/MM')}`;
}

export function TurnosHistorialPanel({ revision = 0 }: { revision?: number } = {}) {
  const [usuarioId, setUsuarioId] = useState('');
  const [operadores, setOperadores] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  useEffect(() => { let current = true; getOperadoresAction().then(result => { if (current) setOperadores(result.operadores ?? []); }); return () => { current = false; }; }, [revision]);
  const [period, setPeriod] = useState<Period>('week');
  const [page, setPage] = useState(0);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    const today = dayjs().tz(TZ);
    const from = period === 'today' ? today : period === 'week' ? today.subtract(6, 'day') : period === 'month' ? today.subtract(29, 'day') : null;
    setPending(true);
    getTurnosAction({ usuarioId: usuarioId || undefined, desde: from?.format('YYYY-MM-DD'), hasta: from ? today.format('YYYY-MM-DD') : undefined, estado: 'CERRADO', fechaPor: 'CIERRE', page: page + 1, limit: PAGE_SIZE }).then(result => {
      if (!current) return;
      setTurnos(result.result?.data ?? []);
      setTotal(result.result?.meta.totalItems ?? 0);
      setError(result.error ?? '');
    }).finally(() => { if (current) setPending(false); });
    return () => { current = false; };
  }, [period, page, revision, retry, usuarioId]);

  const grupos = turnos.reduce<{ dia: string; turnos: Turno[] }[]>((acc, turno) => {
    const dia = diaDe(turno);
    const ultimo = acc[acc.length - 1];
    if (ultimo?.dia === dia) ultimo.turnos.push(turno); else acc.push({ dia, turnos: [turno] });
    return acc;
  }, []);

  return <section className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Historial de turnos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cobros, retiros y vehículos de cada turno.</p>
      </div>
      {!pending && !error && <span className="text-xs text-muted-foreground">{total} {total === 1 ? 'cierre' : 'cierres'}</span>}
    </div>
    <div data-tour="caja-rangos" className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Período" className="inline-flex rounded-xl border border-gm-line bg-gm-surface-2/60 p-1">
        {periods.map(item => <button key={item.value} type="button" aria-pressed={period === item.value} onClick={() => { setPeriod(item.value); setPage(0); }} className={cn('h-8 rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow', period === item.value ? 'bg-gm-yellow text-gm-ink shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{item.label}</button>)}
      </div>
      <div className="w-full sm:w-60"><Select value={usuarioId || 'all'} onValueChange={value => { setUsuarioId(value === 'all' ? '' : value); setPage(0); }}><SelectTrigger aria-label="Filtrar por usuario" className="h-10 rounded-xl"><SelectValue placeholder="Todos los usuarios" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los usuarios</SelectItem>{operadores.map(user => <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div aria-live="polite" aria-busy={pending} data-tour="caja-tabla">
      {pending ? <TurnosCargando />
        : error ? <div role="alert" className="space-y-2 rounded-2xl border border-destructive/50 bg-destructive/5 p-4 text-sm"><p>{error}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Reintentar</Button></div>
          : turnos.length === 0 ? <p className="rounded-2xl border border-dashed border-gm-line-strong p-8 text-center text-sm text-muted-foreground">No hay turnos cerrados en este período.</p>
            : <div className="space-y-6">
              {grupos.map(grupo => <div key={grupo.dia} className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground first-letter:uppercase">{grupo.dia}</p>
                <div className="space-y-2">{grupo.turnos.map(turno => <ShiftCard key={turno.id} turno={turno} />)}</div>
              </div>)}
              <CompactPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>}
    </div>
  </section>;
}

function ShiftCard({ turno }: { turno: Turno }) {
  // El corte de las 00:00 no es un cierre: es la misma jornada que sigue en la planilla de otro día.
  // Como tarjeta completa llenaba el historial y escondía los cierres reales; va como fila compacta.
  if (turno.cierreAutomatico) return <CorteDiario turno={turno} />;
  const individual = !!turno.cashSessionId && !turno.cierreCaja;
  const difference = turno.diferencia;
  const status = turno.cierreAutomatico ? 'Corte de las 00:00' : individual ? 'Turno finalizado · La caja sigue abierta' : difference == null ? 'Efectivo no contado' : difference === 0 ? 'Caja correcta' : difference > 0 ? `Faltaron ${money(difference)}` : `Sobraron ${money(-difference)}`;
  const tono = turno.cierreAutomatico || individual || difference == null ? 'neutro' : difference === 0 ? 'ok' : 'aviso';
  const closedBy = turno.cierreAutomatico ? 'Sistema (corte diario)' : operator(turno.usuarioCierre);
  const openedBy = operator(turno.usuarioApertura);
  return <details className="group overflow-hidden rounded-2xl border border-gm-line bg-gm-surface-2/50 transition-colors open:border-gm-line-strong">
    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:bg-gm-surface-3/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gm-yellow sm:gap-4 [&::-webkit-details-marker]:hidden">
      <Iniciales nombre={openedBy} className="max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="break-words font-semibold">{openedBy}</p>
          <Pill tono={tono}>{status}</Pill>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {turno.caja?.nombre ?? 'Caja del esquema anterior'} · <span className="gm-mono">{rango(turno.fechaApertura, turno.fechaCierre)}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{individual ? (turno.cierreAutomatico ? <>La jornada continúa en la siguiente planilla.{turno.resumen && <> · Cobró <span className="font-semibold text-foreground tabular-nums">{money(turno.resumen.efectivoCobrado)}</span> en efectivo</>}</> : 'La caja sigue abierta con otros operadores.') : <>Contó <span className="font-semibold text-foreground tabular-nums">{turno.efectivoContado == null ? 'sin registro' : money(turno.efectivoContado)}</span> · Dejó <span className="font-semibold text-foreground tabular-nums">{turno.efectivoParaSiguiente == null ? 'sin registro' : money(turno.efectivoParaSiguiente)}</span></>}</p>
      </div>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
    </summary>
    <div className="space-y-4 border-t border-gm-line px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>Abrió <span className="gm-mono text-foreground">{date(turno.fechaApertura)}</span></span>
        <ArrowRight className="size-3.5" aria-hidden />
        <span>{turno.fechaCierre ? <>Cerró <span className="gm-mono text-foreground">{date(turno.fechaCierre)}</span></> : 'Cierre sin fecha'}</span>
        {closedBy !== openedBy && <span>· Cerrado por {closedBy}</span>}
      </div>
      {!individual && <dl className={cn('grid gap-px overflow-hidden rounded-2xl border border-gm-line bg-gm-line', turno.resumen ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
        <Amount label="Fondo inicial de la caja" value={turno.cashSession?.fondoInicial ?? turno.fondoInicial} />
        <Amount label="Esperado al cerrar" value={turno.efectivoTeorico} />
        <Amount label="Contado" value={turno.efectivoContado} tono={difference == null || difference === 0 ? undefined : 'text-gm-atencion'} />
        {!turno.resumen && <Amount label="Efectivo retirado" value={turno.efectivoRetirado} />}
      </dl>}
      {!!turno.cashSession?.diferenciaApertura && <p className="rounded-xl border border-gm-atencion/30 bg-gm-atencion/[0.05] p-3 text-xs text-gm-atencion">Diferencia al recibir esta caja: {money(turno.cashSession.diferenciaApertura)} · {turno.cashSession.motivoApertura}</p>}
      <TurnoResumenPanel turno={turno} />
      {turno.observaciones && <p className="whitespace-pre-wrap break-words rounded-xl bg-gm-surface-3/60 p-3 text-xs"><strong>Nota:</strong> {turno.observaciones}</p>}
      {turno.cierreForzado && <p className="break-words rounded-xl border border-gm-atencion/30 bg-gm-atencion/[0.05] p-3 text-xs text-gm-atencion"><strong>Cierre por administrador:</strong> {turno.motivoCierreForzado || 'Sin motivo registrado'}</p>}
    </div>
  </details>;
}

function Amount({ label, value, tono }: { label: string; value: number | null; tono?: string }) {
  return <div className="bg-card p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn('mt-1 font-semibold tabular-nums', tono)}>{value == null ? 'No registrado' : money(value)}</dd></div>;
}
