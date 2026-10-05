'use client';
import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Wallet } from 'lucide-react';
import { DataLoading } from '@/components/ui/data-loading';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { CashContext } from '@/types/turno.type';
import { Button } from '@/components/ui/button';
import { BoxListDialog } from '@/components/box-list-dialog';
import { TurnoBar, CashMovementForm } from '@/app/(protected)/(user)/tickets/components/turno-bar';
import { TurnosHistorialPanel } from './turnos-historial-panel';
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
export function CajaActions({ shiftsEnabled = false }: { shiftsEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [context, setContext] = useState<CashContext | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const update = () => setRevision(v => v + 1);
  useEffect(() => { window.addEventListener('parking-shift-changed', update); return () => window.removeEventListener('parking-shift-changed', update); }, []);
  useEffect(() => { if (!shiftsEnabled) return; let current = true; setLoading(true); getCashContextAction().then(result => { if (current) { setContext(result.context ?? null); setError(result.error ?? ''); setLoading(false); } }); return () => { current = false; }; }, [revision, shiftsEnabled]);
  if (!shiftsEnabled) return null;
  const turnos = context?.openTurnos ?? [];
  const cajas = context?.cajas ?? [];
  const legacy = turnos.filter(t => !t.cashSessionId);
  const total = cajas.filter(c => c.session).reduce((sum, c) => sum + c.efectivoDisponible, 0) + legacy.reduce((sum, t) => sum + t.efectivoDisponible, 0);
  return <div className="space-y-7">
    <section data-tour="caja-turno" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gm-yellow/30 bg-gm-yellow/5 p-4 sm:p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-gm-yellow">Mi turno</p><p className="mt-1 font-semibold">{context?.active ? 'Tenés un turno en curso' : 'Abrí tu turno para trabajar en una caja'}</p><p className="mt-1 text-sm text-muted-foreground">Cada usuario tiene sus operaciones; quienes comparten caja hacen un arqueo común al final.</p></div><TurnoBar revision={revision} /></section>
    <section className="space-y-4" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="size-5" /> Cajas y turnos abiertos</h2><p className="mt-1 text-sm text-muted-foreground">Podés cerrar el turno de cualquier usuario con un motivo. El último operador cuenta y cierra su caja.</p></div><Button variant="outline" size="sm" onClick={update} disabled={loading}><RefreshCw className={'size-4 ' + (loading ? 'animate-spin' : '')} />Actualizar</Button></div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">{error}</p> : loading ? <DataLoading label="Cargando cajas…" /> : <>
        <div className="grid gap-3 sm:grid-cols-3"><Stat label="Operadores con turno abierto" value={String(turnos.length)} /><Stat label="Cajas abiertas" value={String(cajas.filter(c => c.session).length)} /><Stat label="Efectivo esperado en las cajas abiertas" value={money(total)} /></div>
        <p className="text-xs text-muted-foreground">El efectivo se suma una sola vez por caja. Incluye fondos iniciales; la recaudación del día está en la planilla.</p>
        {legacy.length > 0 && <div className="space-y-3 rounded-xl border border-amber-500/40 p-4"><p className="text-sm font-semibold">Turnos anteriores pendientes de cierre</p><p className="text-xs text-muted-foreground">Cerralos con su arqueo antes de abrir cajas con el nuevo esquema. Los cierres históricos se conservan.</p>{legacy.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{t.nombre} · {money(t.efectivoDisponible)}</p><TurnoBar turnoId={t.id} revision={revision} /></div>)}</div>}
        <div className="grid gap-4 lg:grid-cols-2">{cajas.map(caja => <article key={caja.id} className="space-y-4 rounded-xl border border-border bg-gm-surface-2/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{caja.nombre}</h3><span className={'text-xs font-semibold ' + (caja.session ? 'text-emerald-500' : 'text-muted-foreground')}>{caja.session ? 'Abierta' : 'Cerrada'}</span></div>
          <div><p className="text-xs text-muted-foreground">{caja.session ? 'Efectivo esperado de esta caja' : 'Fondo para la próxima apertura'}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(caja.efectivoDisponible)}</p></div>
          {caja.session ? <>
            <div className="space-y-3 border-t border-border pt-3">{turnos.filter(t => t.cajaId === caja.id).map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h4 className="break-words text-sm font-semibold">{t.nombre}</h4><p className="mt-1 text-xs text-muted-foreground">Efectivo neto de sus operaciones: {money(t.efectivoOperado ?? 0)}</p><p className="mt-1 text-xs text-muted-foreground">{t.requiereArqueo ? 'Último operador: cierre con arqueo' : 'Puede cerrar sólo su turno'}</p></div><TurnoBar turnoId={t.id} revision={revision} /></div>)}</div>
            <CashMovementForm sesionId={caja.session.id} expected={caja.efectivoDisponible} onUpdated={update} />
          </> : <p className="text-sm text-muted-foreground">El próximo usuario recibe el saldo de esta caja. Puede abrir desde Tickets.</p>}
          {!!caja.movimientos?.length && <details className="border-t border-border pt-3 text-sm"><summary className="cursor-pointer font-semibold">Retiros y aportes de esta apertura</summary><div className="mt-3 space-y-2">{caja.movimientos.map(m => <div key={m.id}><p>{m.tipo === 'RETIRO' ? 'Retiro' : 'Aporte'} · {money(Math.abs(m.amount))}</p><p className="text-xs text-muted-foreground">{m.motivo} · {m.operador}</p></div>)}</div></details>}
        </article>)}</div>
      </>}
    </section>
    <div><Button data-tour="caja-planilla" variant="outline" size="sm" onClick={() => setOpen(true)}><FileText className="size-4" /> Planilla diaria de caja</Button><BoxListDialog open={open} setOpen={setOpen} /></div>
    <TurnosHistorialPanel revision={revision} />
  </div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>; }
