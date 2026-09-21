'use client';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompactPagination } from '@/components/compact-pagination';
import { Turno } from '@/types/turno.type';
import { getOperadoresAction, getTurnosAction } from '@/actions/turnos/cash-context.action';
dayjs.extend(utc); dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const date = (s: string) => dayjs(s).tz(TZ).format('DD/MM/YY · HH:mm');
const nombre = (u: Turno['usuarioCierre']) => u ? `${u.firstName} ${u.lastName}` : 'Operador no disponible';
type Rango = 'hoy' | 'ayer' | 'semana' | 'todo' | 'libre';
function limites(rango: Rango, desde: string, hasta: string) {
  const hoy = dayjs().tz(TZ);
  if (rango === 'hoy') return { desde: hoy.format('YYYY-MM-DD'), hasta: hoy.format('YYYY-MM-DD') };
  if (rango === 'ayer') return { desde: hoy.subtract(1, 'day').format('YYYY-MM-DD'), hasta: hoy.subtract(1, 'day').format('YYYY-MM-DD') };
  if (rango === 'semana') return { desde: hoy.subtract(6, 'day').format('YYYY-MM-DD'), hasta: hoy.format('YYYY-MM-DD') };
  return rango === 'libre' ? { desde: desde || undefined, hasta: hasta || undefined } : {};
}
const rangos: { id: Rango; label: string }[] = [{ id: 'hoy', label: 'Hoy' }, { id: 'ayer', label: 'Ayer' }, { id: 'semana', label: '7 días' }, { id: 'todo', label: 'Todo' }];
const inputClass = 'h-11 w-full min-w-0 rounded-lg border border-border bg-gm-surface-2 px-3 text-sm [color-scheme:dark]';
export function TurnosHistorialPanel({ revision = 0 }: { revision?: number } = {}) {
  const [rango, setRango] = useState<Rango>('hoy');
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('');
  const [operador, setOperador] = useState('todos');
  const [operadores, setOperadores] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [error, setError] = useState(''); const [pending, setPending] = useState(true);
  const [soloDiferencias, setSoloDiferencias] = useState(false); const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let vigente = true;
    getOperadoresAction().then(r => { if (vigente && r.operadores) setOperadores(r.operadores); });
    return () => { vigente = false; };
  }, [revision]);
  useEffect(() => {
    let vigente = true;
    setPending(true); setError(''); setPage(0);
    if (rango === 'libre' && desde && hasta && desde > hasta) { setError('Desde debe ser anterior o igual a Hasta.'); setPending(false); return; }
    getTurnosAction({ ...limites(rango, desde, hasta), usuarioId: operador === 'todos' ? undefined : operador, estado: 'CERRADO', fechaPor: 'CIERRE' }).then(r => {
      if (!vigente) return;
      setTurnos(r.turnos ?? []); setError(r.error ?? ''); setPending(false);
    });
    return () => { vigente = false; };
  }, [rango, desde, hasta, operador, revision, retry]);
  const conDiferencias = turnos.filter(t => t.efectivoContado != null && t.diferencia != null && t.diferencia !== 0);
  const visibles = soloDiferencias ? conDiferencias : turnos;
  const pagina = Math.min(page, Math.max(0, Math.ceil(visibles.length / 5) - 1));
  const hoy = dayjs().tz(TZ).format('YYYY-MM-DD');
  return <section className="min-w-0 space-y-4">
    <div><h2 className="text-lg font-semibold">Turnos cerrados</h2><p className="text-sm text-muted-foreground">Buscá por el día en que se cerró el turno.</p></div>
    <div className="space-y-3 rounded-xl border border-border p-3 sm:p-4">
      <div data-tour="caja-rangos" className="flex flex-wrap gap-2">{rangos.map(r => <Button key={r.id} aria-pressed={rango === r.id} size="sm" variant={rango === r.id ? 'default' : 'outline'} onClick={() => { setRango(r.id); setDesde(''); setHasta(''); }}>{r.label}</Button>)}</div>
      <details data-tour="caja-fechas"><summary className="flex min-h-10 cursor-pointer items-center text-sm font-medium">Más filtros{(rango === 'libre' || operador !== 'todos') && <span className="ml-2 text-gm-yellow">· activos</span>}</summary>
        <div className="grid gap-3 pt-3 sm:grid-cols-3">
          <label className="min-w-0 space-y-1 text-sm">Desde<input type="date" className={inputClass} value={desde} max={hasta || hoy} onChange={e => { setDesde(e.target.value); setRango('libre'); }} /></label>
          <label className="min-w-0 space-y-1 text-sm">Hasta<input type="date" className={inputClass} value={hasta} min={desde || undefined} max={hoy} onChange={e => { setHasta(e.target.value); setRango('libre'); }} /></label>
          <label className="min-w-0 space-y-1 text-sm">Abierto por<select className={inputClass} value={operador} onChange={e => setOperador(e.target.value)}><option value="todos">Todos los operadores</option>{operadores.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}</select></label>
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setRango('hoy'); setDesde(''); setHasta(''); setOperador('todos'); setSoloDiferencias(false); }}>Restablecer filtros</Button>
      </details>
      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-yellow-400" checked={soloDiferencias} onChange={e => { setSoloDiferencias(e.target.checked); setPage(0); }} /> Solo con diferencias de efectivo</label>
    </div>
    <div aria-live="polite" aria-busy={pending}>{pending ? <p className="py-8 text-center text-muted-foreground">Cargando cierres…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>Reintentar</Button></div> : <>
      <div data-tour="caja-totales" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-gm-surface-2 p-3 text-sm"><span><strong>{turnos.length}</strong> cierres en el período</span><span><strong>{conDiferencias.length}</strong> con diferencias</span><span className="text-muted-foreground"><strong>{turnos.filter(t => t.efectivoContado == null).length}</strong> sin conteo</span></div>
      <div data-tour="caja-tabla" className="space-y-3">{visibles.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{soloDiferencias ? 'No hay cierres con diferencias en este período.' : 'No hay turnos cerrados en este período. Probá con otra fecha.'}</p> : visibles.slice(pagina * 5, pagina * 5 + 5).map(t => <Ficha key={t.id} turno={t} />)}<CompactPagination page={pagina} total={visibles.length} pageSize={5} onChange={setPage} /></div>
    </>}</div>
  </section>;
}
function Ficha({ turno: t }: { turno: Turno }) {
  const d = t.diferencia; const sinConteo = t.efectivoContado == null;
  const verificado = !sinConteo && d != null;
  const estado = sinConteo ? 'Sin conteo' : !verificado ? 'Sin comparación registrada' : d === 0 ? 'Sin diferencias' : d! > 0 ? `Faltaron ${money(d!)}` : `Sobraron ${money(-d!)}`;
  const color = !verificado ? 'border-border text-muted-foreground' : d === 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/40 text-amber-400';
  const valores: [string, number | null][] = [['Efectivo al abrir', t.fondoInicial], ['Esperado al cerrar', t.efectivoTeorico], ['Efectivo contado', t.efectivoContado], ['Efectivo retirado', t.efectivoRetirado], ['Para el siguiente turno', t.efectivoParaSiguiente]];
  return <details className="group overflow-hidden rounded-xl border border-border bg-gm-surface-2/40">
    <summary className="cursor-pointer list-none p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gm-yellow [&::-webkit-details-marker]:hidden">
      <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words font-semibold">{nombre(t.usuarioApertura)}</p><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{estado}</span></div>
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2"><span>Abrió: {date(t.fechaApertura)}</span><span>Cerró: {t.fechaCierre ? date(t.fechaCierre) : 'Fecha no registrada'}</span></div>
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gm-yellow"><span className="group-open:hidden">Ver detalle del cierre</span><span className="hidden group-open:inline">Ocultar detalle</span><ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" /></div>
    </summary>
    <div className="space-y-4 border-t border-border p-4"><dl className="grid gap-3 sm:grid-cols-2">{valores.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums">{value == null ? 'No registrado' : money(value)}</dd></div>)}</dl>
      {sinConteo && <p className="text-sm text-muted-foreground">No se registró un conteo de efectivo. No se puede confirmar si la caja coincidió.</p>}
      <div className="space-y-1 text-sm text-muted-foreground"><p>Turno: {t.nombre || 'Sin nombre'}</p><p>Cerrado por: {nombre(t.usuarioCierre)}</p></div>
      {t.observaciones && <p className="whitespace-pre-wrap break-words text-sm"><strong>Observaciones:</strong> {t.observaciones}</p>}
      {t.cierreForzado && <p className="break-words text-sm text-amber-400"><strong>Cierre por un administrador:</strong> {t.motivoCierreForzado || 'Sin motivo registrado'}</p>}
    </div>
  </details>;
}
