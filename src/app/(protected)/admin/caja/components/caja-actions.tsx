'use client';
import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Wallet } from 'lucide-react';
import { DataLoading } from '@/components/ui/data-loading';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { CashContext } from '@/types/turno.type';
import { Button } from '@/components/ui/button';
import { BoxListDialog } from '@/components/box-list-dialog';
import { Cifra, Etiqueta, Iniciales, money, Pill } from '@/components/turno-ui';
import { TurnoBar, CashMovementForm } from '@/app/(protected)/(user)/tickets/components/turno-bar';
import { TurnosHistorialPanel } from './turnos-historial-panel';
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
  const abiertas = cajas.filter(c => c.session).length;
  const total = cajas.filter(c => c.session).reduce((sum, c) => sum + c.efectivoDisponible, 0) + legacy.reduce((sum, t) => sum + t.efectivoDisponible, 0);
  return <div className="space-y-10">
    <section data-tour="caja-turno" className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[22px] border border-gm-yellow/25 bg-gradient-to-br from-gm-yellow/[0.10] via-gm-yellow/[0.03] to-transparent p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gm-yellow text-gm-ink shadow-[0_10px_24px_-10px_hsl(var(--gm-yellow)/0.6)]"><Wallet className="size-6" /></span>
        <div className="min-w-0">
          <Etiqueta className="text-gm-yellow">Mi turno</Etiqueta>
          <p className="mt-1 text-lg font-bold leading-snug">{context?.active ? 'Tenés un turno en curso' : 'Abrí tu turno para trabajar en una caja'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Las operaciones se guardan por usuario. El último operador cuenta y cierra la caja.</p>
        </div>
      </div>
      <TurnoBar revision={revision} variant="primary" />
    </section>

    <section className="space-y-5" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-bold tracking-tight">Cajas y turnos abiertos</h2><p className="mt-1 text-sm text-muted-foreground">Podés cerrar el turno de cualquier usuario con un motivo. El último operador cuenta y cierra su caja.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button data-tour="caja-planilla" variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(true)}><FileText className="size-4" />Planilla diaria de caja</Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={update} disabled={loading}><RefreshCw className={'size-4 ' + (loading ? 'animate-spin' : '')} aria-hidden />Actualizar</Button>
        </div>
      </div>
      {error ? <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">{error}</p> : loading && !context ? <DataLoading label="Cargando cajas…" /> : <>
        <div className="space-y-2">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-gm-line bg-gm-line sm:grid-cols-[1.4fr_1fr_1fr]">
            <div className="col-span-2 bg-card p-5 sm:col-span-1"><dt><Etiqueta>Efectivo esperado en las cajas abiertas</Etiqueta></dt><dd className="mt-2"><Cifra value={total} className="text-[40px]" /></dd></div>
            <Stat label="Cajas abiertas" value={abiertas} de={cajas.length} />
            <Stat label="Operadores con turno abierto" value={turnos.length} />
          </dl>
          <p className="px-1 text-xs text-muted-foreground">El efectivo se suma una sola vez por caja. Incluye fondos iniciales; la recaudación del día está en la planilla.</p>
        </div>
        {legacy.length > 0 && <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-4"><div><p className="text-sm font-semibold">Turnos anteriores pendientes de cierre</p><p className="mt-1 text-xs text-muted-foreground">Contá el efectivo y cerralos antes de abrir una caja nueva.</p></div><ul className="divide-y divide-amber-500/20">{legacy.map(t => <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5"><span className="flex items-center gap-3"><Iniciales nombre={t.nombre} className="size-8 text-[11px]" /><span className="text-sm">{t.nombre} · <span className="tabular-nums">{money(t.efectivoDisponible)}</span></span></span><TurnoBar turnoId={t.id} revision={revision} /></li>)}</ul></div>}
        <div className="grid items-start gap-4 lg:grid-cols-2">{cajas.map(caja => {
          const operadores = turnos.filter(t => t.cajaId === caja.id);
          return <article key={caja.id} className="overflow-hidden rounded-[22px] border border-gm-line bg-gm-surface-2/50">
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="text-base font-bold">{caja.nombre}</h3><p className="mt-0.5 text-xs text-muted-foreground">{caja.session ? `${operadores.length} ${operadores.length === 1 ? 'operador' : 'operadores'} trabajando` : 'Sin turnos abiertos'}</p></div>
                <Pill tono={caja.session ? 'ok' : 'neutro'}>{caja.session ? 'Abierta' : 'Cerrada'}</Pill>
              </div>
              <div><p className="text-xs text-muted-foreground">{caja.session ? 'Efectivo esperado de esta caja' : 'Fondo para la próxima apertura'}</p><Cifra value={caja.efectivoDisponible} className="mt-1.5" /></div>
            </div>
            {caja.session ? <>
              {operadores.length > 0 && <ul className="divide-y divide-gm-line border-t border-gm-line">{operadores.map(t => <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Iniciales nombre={t.nombre} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="break-words text-sm font-semibold">{t.nombre}</h4>{t.requiereArqueo && <Pill tono="marca" className="h-5 px-2 text-[10.5px]">Cierra la caja</Pill>}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Saldo de sus operaciones: <span className="tabular-nums">{money(t.efectivoOperado ?? 0)}</span></p>
                    <p className="sr-only">{t.requiereArqueo ? 'Último operador: cuenta y cierra la caja' : 'Puede cerrar sólo su turno'}</p>
                  </div>
                </div>
                <TurnoBar turnoId={t.id} revision={revision} />
              </li>)}</ul>}
              <div className="border-t border-gm-line p-4"><CashMovementForm sesionId={caja.session.id} expected={caja.efectivoDisponible} onUpdated={update} /></div>
            </> : <p className="border-t border-gm-line px-5 py-4 text-sm text-muted-foreground">El próximo usuario recibe el saldo de esta caja. Puede abrir desde Tickets.</p>}
            {!!caja.movimientos?.length && <details className="group border-t border-gm-line text-sm">
              <summary className="cursor-pointer px-5 py-3.5 font-semibold text-muted-foreground transition-colors hover:text-foreground">Retiros y aportes de esta apertura</summary>
              <ul className="divide-y divide-gm-line border-t border-gm-line">{caja.movimientos.map(m => <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <span className="min-w-0"><span className="block font-medium">{m.tipo === 'RETIRO' ? 'Retiro' : 'Aporte'}</span><span className="mt-0.5 block text-xs text-muted-foreground">{m.motivo} · {m.operador}</span></span>
                <span className={'shrink-0 font-semibold tabular-nums ' + (m.tipo === 'RETIRO' ? '' : 'text-emerald-400')}>{m.tipo === 'RETIRO' ? '−' : '+'}{money(Math.abs(m.amount))}</span>
              </li>)}</ul>
            </details>}
          </article>;
        })}</div>
      </>}
      <BoxListDialog open={open} setOpen={setOpen} />
    </section>

    <div id="historial" className="scroll-mt-6"><TurnosHistorialPanel revision={revision} /></div>
  </div>;
}
function Stat({ label, value, de }: { label: string; value: number; de?: number }) {
  return <div className="bg-card p-5"><dt><Etiqueta>{label}</Etiqueta></dt><dd className="mt-2 font-display text-[32px] sm:text-[40px] font-bold leading-none tabular-nums">{value}{de != null && <span className="ml-1 text-xl text-muted-foreground">/ {de}</span>}</dd></div>;
}
