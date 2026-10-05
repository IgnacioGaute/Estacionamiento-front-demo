'use client';
import { DataLoading } from '@/components/ui/data-loading';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompactPagination } from '@/components/compact-pagination';
import { Turno } from '@/types/turno.type';
import { getTurnosAction, getOperadoresAction } from '@/actions/turnos/cash-context.action';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const PAGE_SIZE = 10;
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const date = (s: string) => dayjs(s).tz(TZ).format('DD/MM/YY · HH:mm');
const operator = (user: Turno['usuarioCierre']) => user ? `${user.firstName} ${user.lastName}`.trim() : 'Operador no disponible';
type Period = 'today' | 'week' | 'month' | 'all';
const periods: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'all', label: 'Todos' },
];

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

  return <section className="min-w-0 space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Historial de turnos</h2>
      <p className="text-sm text-muted-foreground">Revisá los turnos de cada usuario y los arqueos de las cajas. El fondo queda para el próximo operador de esa caja.</p>
    </div>
    <div data-tour="caja-rangos" className="flex flex-wrap items-center gap-2">
      {periods.map(item => <Button key={item.value} size="sm" variant={period === item.value ? 'default' : 'outline'} aria-pressed={period === item.value} onClick={() => { setPeriod(item.value); setPage(0); }}>{item.label}</Button>)}
      <div className="w-full sm:w-64"><Select value={usuarioId || 'all'} onValueChange={value => { setUsuarioId(value === 'all' ? '' : value); setPage(0); }}><SelectTrigger aria-label="Filtrar por usuario" className="h-9"><SelectValue placeholder="Todos los usuarios" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los usuarios</SelectItem>{operadores.map(user => <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>)}</SelectContent></Select></div>
      {!pending && !error && <span className="ml-auto text-xs text-muted-foreground">{total} {total === 1 ? 'cierre' : 'cierres'}</span>}
    </div>
    <div aria-live="polite" aria-busy={pending} data-tour="caja-tabla">
      {pending ? <DataLoading label="Cargando turnos…" />
        : error ? <div role="alert" className="space-y-2 rounded-xl border border-destructive/50 p-4 text-sm"><p>{error}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Reintentar</Button></div>
          : turnos.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No hay turnos cerrados en este período.</p>
            : <div className="space-y-2">{turnos.map(turno => <ShiftCard key={turno.id} turno={turno} />)}<CompactPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} /></div>}
    </div>
  </section>;
}

function ShiftCard({ turno }: { turno: Turno }) {
  const individual = !!turno.cashSessionId && !turno.cierreCaja;
  const difference = turno.diferencia;
  const status = individual ? 'Turno finalizado · Caja compartida' : difference == null ? 'Sin arqueo' : difference === 0 ? 'Caja correcta' : difference > 0 ? `Faltaron ${money(difference)}` : `Sobraron ${money(-difference)}`;
  const statusColor = difference == null ? 'text-muted-foreground' : difference === 0 ? 'text-emerald-400' : 'text-amber-400';
  const closedBy = operator(turno.usuarioCierre);
  const openedBy = operator(turno.usuarioApertura);
  return <details className="group overflow-hidden rounded-xl border border-border bg-gm-surface-2/40">
    <summary className="cursor-pointer list-none p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gm-yellow [&::-webkit-details-marker]:hidden">
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{openedBy}</p><p className="mt-1 text-xs text-muted-foreground">{turno.caja?.nombre ?? 'Caja del esquema anterior'}</p><p className="mt-1 text-xs text-muted-foreground">{turno.fechaCierre ? `Cerró ${date(turno.fechaCierre)}` : 'Cierre sin fecha'}</p></div><span className={`text-sm font-semibold ${statusColor}`}>{status}</span></div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">{individual ? <span>El arqueo corresponde al último operador de la caja.</span> : <span>Contó {turno.efectivoContado == null ? 'sin registro' : money(turno.efectivoContado)} · Reservó {turno.efectivoParaSiguiente == null ? 'sin registro' : money(turno.efectivoParaSiguiente)}</span>}<ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" /></div>
    </summary>
    <div className="border-t border-border px-4 py-4 text-sm">
      {!individual && <dl className="grid gap-3 sm:grid-cols-3">
        <Amount label="Fondo inicial de la caja" value={turno.cashSession?.fondoInicial ?? turno.fondoInicial} />
        <Amount label="Esperado al cerrar" value={turno.efectivoTeorico} />
        <Amount label="Efectivo retirado" value={turno.efectivoRetirado} />
      </dl>}
      <p className="mt-4 text-xs text-muted-foreground">Abrió {date(turno.fechaApertura)}{closedBy !== openedBy ? ` · Cerrado por ${closedBy}` : ''}</p>
      {!!turno.cashSession?.diferenciaApertura && <p className="mt-3 text-xs text-amber-400">Diferencia al recibir esta caja: {money(turno.cashSession.diferenciaApertura)} · {turno.cashSession.motivoApertura}</p>}
      {turno.observaciones && <p className="mt-3 whitespace-pre-wrap break-words text-xs"><strong>Nota:</strong> {turno.observaciones}</p>}
      {turno.cierreForzado && <p className="mt-3 break-words text-xs text-amber-400"><strong>Cierre por administrador:</strong> {turno.motivoCierreForzado || 'Sin motivo registrado'}</p>}
    </div>
  </details>;
}

function Amount({ label, value }: { label: string; value: number | null }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 font-semibold tabular-nums">{value == null ? 'No registrado' : money(value)}</dd></div>;
}
