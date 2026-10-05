'use client';
import { useEffect, useId, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, Wallet } from 'lucide-react';
import { CashAmountField } from '@/components/cash-amount-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataLoading } from '@/components/ui/data-loading';
import { CashContext } from '@/types/turno.type';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';
import { addCashMovementAction } from '@/actions/turnos/cajas.action';

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const date = (s: string) => new Date(s).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
const amountValid = (s: string) => s !== '' && Number.isInteger(Number(s)) && Number(s) >= 0;

export function TurnoBar({ onUpdated, turnoId, revision = 0 }: { onUpdated?: () => void; turnoId?: string; revision?: number } = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [context, setContext] = useState<CashContext | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [cajaId, setCajaId] = useState('');
  const [received, setReceived] = useState('0');
  const [added, setAdded] = useState('0');
  const [openingReason, setOpeningReason] = useState('');
  const [counted, setCounted] = useState('');
  const [withdrawn, setWithdrawn] = useState('0');
  const [notes, setNotes] = useState('');
  const [forcedReason, setForcedReason] = useState('');
  const esAdmin = session?.user?.role === 'ADMIN';
  const nombreUsuario = [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ').trim() || session?.user?.username || 'Tu usuario';
  const active = turnoId ? context?.openTurnos.find(t => t.id === turnoId) : context?.active;
  const caja = context?.cajas?.find(c => c.id === (active?.cajaId ?? cajaId));
  const expected = active?.efectivoDisponible ?? context?.efectivoDisponible ?? 0;
  const arqueo = active?.requiereArqueo !== false;
  const forzando = !!active && active.usuarioApertura?.id !== session?.user?.id;
  const canClose = !!active && (!forzando || esAdmin);
  const openingExpected = caja?.pending?.efectivoParaSiguiente ?? caja?.legacyPending?.efectivoParaSiguiente ?? 0;
  const hasPrior = !!(caja?.pending || caja?.legacyPending);
  const openingDifference = hasPrior ? openingExpected - Number(received) : 0;
  const closingDifference = expected - Number(counted);

  const refresh = async (resetOpening = false) => {
    const result = await getCashContextAction();
    if (result.error || !result.context) { setContext(null); setError(result.error ?? 'No se pudo cargar la caja.'); return; }
    const next = result.context;
    if (turnoId && !next.openTurnos.some(t => t.id === turnoId)) { setContext(null); setError('Este turno ya no está abierto. Actualizá la lista de turnos.'); return; }
    setContext(next); setError('');
    const selected = next.cajas?.find(c => c.id === cajaId) ?? next.cajas?.[0];
    if (selected) { setCajaId(selected.id); if (resetOpening) { setReceived(String(selected.session ? 0 : selected.efectivoDisponible)); setAdded('0'); setOpeningReason(''); } }
  };
  useEffect(() => {
    if (turnoId) return;
    startTransition(() => refresh());
    const update = () => startTransition(() => refresh());
    window.addEventListener('parking-shift-changed', update);
    return () => window.removeEventListener('parking-shift-changed', update);
  }, [turnoId, revision, cajaId]);
  const updated = () => { onUpdated?.(); window.dispatchEvent(new Event('parking-shift-changed')); };
  const submitOpen = () => startTransition(async () => {
    if (!caja) return;
    const result = await openTurnoAction({ cajaId: caja.id, fondoInicial: caja.session ? 0 : Number(received) + Number(added),
      sesionActivaId: caja.session?.id, sesionAnteriorId: caja.pending?.id, turnoAnteriorId: caja.legacyPending?.id,
      cambioAgregado: caja.session ? 0 : Number(added), motivoApertura: openingDifference ? openingReason : undefined });
    if (result.error) { toast.error(typeof result.error === 'string' ? result.error : result.error.message); await refresh(); return; }
    toast.success(caja.session ? 'Te uniste a la caja. Tu turno está abierto.' : 'Caja y turno abiertos.'); setOpen(false); updated(); await refresh();
  });
  const submitClose = () => startTransition(async () => {
    if (!active) return;
    const result = await closeTurnoAction(active.id, { cerrarCaja: arqueo,
      ...(arqueo ? { efectivoContado: Number(counted), efectivoEsperado: expected, efectivoParaSiguiente: Number(counted) - Number(withdrawn) } : {}),
      observaciones: notes, motivoCierreForzado: forzando ? forcedReason : undefined });
    if (result.error) { toast.error(typeof result.error === 'string' ? result.error : result.error.message); await refresh(); return; }
    toast.success(arqueo ? 'Turno y caja cerrados. El fondo queda para el próximo operador.' : 'Turno cerrado. La caja sigue abierta para los demás operadores.');
    setOpen(false); setClosing(false); updated(); await refresh();
  });
  const closingValid = canClose && (!forzando || forcedReason.trim()) && (!arqueo || (amountValid(counted) && amountValid(withdrawn) && Number(withdrawn) <= Number(counted) && (closingDifference === 0 || notes.trim())));
  const openingValid = !!caja && !context?.legacyOpen && (caja.session ? context?.multipleShiftsEnabled : amountValid(received) && amountValid(added) && (openingDifference === 0 || openingReason.trim()));
  return <>
    <Button variant="outline" size="sm" onClick={() => { setClosing(!!turnoId); setCounted(''); setWithdrawn('0'); setNotes(''); setForcedReason(''); setOpen(true); startTransition(() => refresh(true)); }}><Wallet className="size-4" />{turnoId ? 'Cerrar turno' : active ? 'Mi turno' : 'Abrir mi turno'}</Button>
    <Dialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); if (!value) setClosing(false); } }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader><DialogTitle>{active ? closing ? arqueo ? 'Cerrar turno y caja' : 'Cerrar sólo el turno' : 'Mi turno' : 'Abrir mi turno'}</DialogTitle><DialogDescription>{active ? arqueo ? 'Sos el último operador de esta caja. Contá el efectivo de todos los turnos desde su apertura.' : 'Otros operadores siguen usando esta caja. El último realiza el arqueo.' : 'El turno registra tus operaciones. El fondo se recibe de la caja que vas a usar.'}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!context ? !error && <DataLoading label="Cargando caja…" /> : active ? closing ? <form onSubmit={e => { e.preventDefault(); submitClose(); }} className="space-y-5">
          <div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="font-semibold">{active.nombre}</p><p className="mt-1 text-sm text-muted-foreground">{active.caja?.nombre ?? 'Turno anterior'} · {date(active.fechaApertura)}</p></div>
          {arqueo ? <>
            <div><p className="text-sm text-muted-foreground">Efectivo esperado de la caja</p><p className="mt-1 text-3xl font-semibold tabular-nums">{money(expected)}</p></div>
            <CashAmountField id="cash-counted" label="¿Cuánto efectivo contaste?" value={counted} onChange={setCounted} disabled={pending} placeholder="Contá el dinero antes de confirmar" shortcuts={[{ label: 'Conté todo · ' + money(expected), amount: expected, disabled: expected < 0 }, { label: 'No hay efectivo', amount: 0 }]} description="Si contaste el importe esperado, tocá Conté todo. Si hay una diferencia, ingresá el monto real." />
            {amountValid(counted) && <p className={'border-l-2 pl-3 text-sm ' + (closingDifference === 0 ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500')}>{closingDifference === 0 ? 'El efectivo coincide.' : closingDifference > 0 ? 'Faltan ' + money(closingDifference) : 'Sobran ' + money(-closingDifference)}</p>}
            <CashAmountField id="cash-withdrawn" label="Efectivo que retirás al cerrar" value={withdrawn} onChange={setWithdrawn} disabled={pending} max={amountValid(counted) ? Number(counted) : undefined} shortcuts={[{ label: 'No retiro efectivo', amount: 0 }, { label: 'Retirar todo' + (amountValid(counted) ? ' · ' + money(Number(counted)) : ''), amount: Number(counted), disabled: !amountValid(counted) }]} description={amountValid(counted) && amountValid(withdrawn) && Number(counted) >= Number(withdrawn) ? 'Quedan ' + money(Number(counted) - Number(withdrawn)) + ' en esta caja para el próximo operador.' : 'Primero indicá cuánto contaste; después podés retirar todo o una parte.'} />
            {amountValid(counted) && closingDifference !== 0 && <div className="space-y-1.5"><Label htmlFor="cash-notes">Motivo de la diferencia</Label><Input id="cash-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={pending} required /></div>}
          </> : <div className="rounded-xl border border-gm-yellow/30 bg-gm-yellow/5 p-4 text-sm"><p className="font-semibold">La caja continúa abierta</p><p className="mt-1 text-muted-foreground">Tus operaciones quedan registradas a tu nombre. El fondo y el efectivo siguen en {active.caja?.nombre ?? 'la caja compartida'}; el cierre de tu turno no retira dinero.</p></div>}
          {forzando && <div className="space-y-1.5"><Label htmlFor="forced-reason">¿Por qué cerrás el turno de otra persona?</Label><Input id="forced-reason" maxLength={255} value={forcedReason} onChange={e => setForcedReason(e.target.value)} disabled={pending} required placeholder="Ej.: se retiró sin cerrar su turno" /></div>}
          <Button className="w-full" disabled={pending || !closingValid}>{pending ? 'Cerrando…' : arqueo ? 'Confirmar cierre de turno y caja' : 'Confirmar cierre de turno'}</Button>
          <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={() => setClosing(false)}>Volver al turno</Button>
        </form> : <div className="space-y-5">
          <div className="rounded-xl border border-border p-4"><p className="text-xs font-semibold text-emerald-500">En curso</p><p className="mt-1 text-xl font-semibold">{active.nombre}</p><p className="mt-1 text-sm text-muted-foreground">{active.caja?.nombre ?? 'Turno anterior'} · Abierto el {date(active.fechaApertura)}</p></div>
          <dl className="grid grid-cols-2 gap-4"><div><dt className="text-xs text-muted-foreground">Efectivo esperado de la caja</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{money(expected)}</dd></div><div><dt className="text-xs text-muted-foreground">Efectivo neto de tus operaciones</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{money(active.efectivoOperado ?? 0)}</dd></div></dl>
          <p className="text-sm text-muted-foreground">{arqueo ? 'Al terminar, vas a contar y cerrar esta caja.' : 'Compartís esta caja con otros operadores. Podés cerrar sólo tu turno; el último cuenta el efectivo.'}</p>
          {esAdmin && active.cashSessionId && <CashMovementForm sesionId={active.cashSessionId} expected={expected} onUpdated={() => { updated(); startTransition(() => refresh()); }} />}
          <Button className="w-full" disabled={pending || !canClose} onClick={() => setClosing(true)}>{arqueo ? 'Cerrar mi turno y contar la caja' : 'Cerrar sólo mi turno'}</Button>
        </div> : <form onSubmit={e => { e.preventDefault(); submitOpen(); }} className="space-y-5">
          <div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-xs text-muted-foreground">Turno a cargo de</p><p className="mt-1 font-semibold">{nombreUsuario}</p></div>
          {context.legacyOpen && <p role="alert" className="rounded-xl border border-amber-500/40 p-4 text-sm">Hay turnos del esquema anterior abiertos. El administrador debe cerrarlos antes de empezar a usar cajas compartidas.</p>}
          {(context.cajas?.length ?? 0) > 1 ? <div className="space-y-1.5"><Label htmlFor="cash-register">¿En qué caja vas a trabajar?</Label><Select value={cajaId} disabled={pending} onValueChange={value => { setCajaId(value); const c = context.cajas?.find(item => item.id === value); setReceived(String(c?.session ? 0 : c?.efectivoDisponible ?? 0)); setAdded('0'); setOpeningReason(''); }}><SelectTrigger id="cash-register"><SelectValue placeholder="Elegí tu caja" /></SelectTrigger><SelectContent>{context.cajas?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre} · {c.session ? 'Abierta' : 'Disponible'}</SelectItem>)}</SelectContent></Select></div> : <p className="text-sm font-semibold">{caja?.nombre ?? 'Caja principal'}</p>}
          {caja?.session ? <div className="space-y-2 rounded-xl border border-gm-yellow/30 bg-gm-yellow/5 p-4 text-sm"><p className="font-semibold">{context.multipleShiftsEnabled ? 'Te vas a unir a una caja abierta' : 'Esta caja ya tiene un turno abierto'}</p><p className="text-muted-foreground">{caja.operadores.map(o => o.nombre).join(', ')} {caja.operadores.length === 1 ? 'está trabajando' : 'están trabajando'} aquí.</p><p className="text-muted-foreground">{context.multipleShiftsEnabled ? 'El fondo ya está en la caja. Tus cobros se registrarán a tu nombre sin volver a cargar el fondo.' : 'Esperá el cierre del operador actual. Para trabajar al mismo tiempo, el administrador debe activar turnos múltiples.'}</p></div> : <>
            {hasPrior && <div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-sm text-muted-foreground">Efectivo que quedó en esta caja</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(openingExpected)}</p><p className="mt-2 text-xs text-muted-foreground">Viene del último cierre de esta caja, independientemente de quién trabajó. Contalo antes de empezar.</p></div>}
            <CashAmountField id="cash-received" label="¿Cuánto efectivo recibiste en la caja?" value={received} onChange={setReceived} disabled={pending} shortcuts={[...(hasPrior ? [{ label: 'Recibí todo · ' + money(openingExpected), amount: openingExpected }] : []), { label: 'Sin efectivo recibido', amount: 0 }]} description="Podés confirmar el fondo completo con un toque o ingresar lo que contaste. Si no coincide, registramos la diferencia." />
            {openingDifference !== 0 && amountValid(received) && <div className="space-y-1.5"><p className="text-sm text-amber-500">{openingDifference > 0 ? 'Faltan ' + money(openingDifference) : 'Hay ' + money(-openingDifference) + ' adicionales'}</p><Label htmlFor="opening-reason">Motivo de la diferencia al recibir</Label><Input id="opening-reason" maxLength={255} required value={openingReason} onChange={e => setOpeningReason(e.target.value)} disabled={pending} placeholder="Ej.: retiro que no quedó registrado" /></div>}
            <CashAmountField id="cash-added" label="Cambio que agregás ahora" value={added} onChange={setAdded} disabled={pending} shortcuts={[{ label: 'No agrego cambio', amount: 0 }]} increments description="El cambio que sumás queda separado del fondo recibido y de las ventas. También podés escribir otro importe." />
          </>}
          <Button className="w-full" disabled={pending || !openingValid}>{pending ? 'Abriendo…' : caja?.session ? 'Abrir mi turno en esta caja' : 'Abrir caja y mi turno'}</Button>
        </form>}
        {esAdmin && <Link href="/admin/caja?tab=turnos" onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); setOpen(false); setTimeout(() => router.push('/admin/caja?tab=turnos'), 200); }} className="text-center text-sm text-muted-foreground underline underline-offset-4">Ver cajas, turnos abiertos e historial</Link>}
      </DialogContent>
    </Dialog>
  </>;
}

export function CashMovementForm({ sesionId, expected, onUpdated }: { sesionId: string; expected: number; onUpdated: () => void }) {
  const { data: session } = useSession();
  const formId = useId();
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<'RETIRO' | 'APORTE'>('RETIRO');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  if (session?.user?.role !== 'ADMIN') return null;
  const withdrawal = type === 'RETIRO';
  const valid = amountValid(amount) && Number(amount) > 0 && (!withdrawal || Number(amount) <= expected) && !!reason.trim();
  const nextCash = expected + (withdrawal ? -Number(amount) : Number(amount));
  return <section aria-label="Movimientos de efectivo" className="overflow-hidden rounded-xl border border-border bg-secondary/20">
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">Movimientos de efectivo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registrá el dinero que sacás o agregás al cajón durante la jornada.</p></div><ShieldCheck className="mt-0.5 size-4 shrink-0 text-gm-yellow" aria-label="Sólo administración" /></div>
      <div className="grid grid-cols-2 gap-2">{(['RETIRO', 'APORTE'] as const).map(option => <Button key={option} type="button" variant="outline" disabled={pending} aria-pressed={expanded && type === option} aria-expanded={expanded && type === option} className="h-11 rounded-lg aria-pressed:border-gm-yellow/50 aria-pressed:bg-gm-yellow/10 aria-pressed:text-gm-yellow" onClick={() => { if (type !== option) { setAmount(''); setReason(''); } setType(option); setExpanded(true); }}>{option === 'RETIRO' ? <ArrowUpRight /> : <ArrowDownLeft />}{option === 'RETIRO' ? 'Retirar efectivo' : 'Agregar efectivo'}</Button>)}</div>
    </div>
    {expanded && <form className="space-y-4 border-t border-border p-4" onSubmit={e => { e.preventDefault(); if (!valid || pending) return; startTransition(async () => { const result = await addCashMovementAction(sesionId, { tipo: type, importe: Number(amount), efectivoEsperado: expected, motivo: reason }); if (result.error) { toast.error(result.error); onUpdated(); return; } toast.success(withdrawal ? 'Retiro registrado' : 'Aporte registrado'); setAmount(''); setReason(''); setExpanded(false); onUpdated(); }); }}>
      <CashAmountField id={'movement-amount-' + formId} label={withdrawal ? '¿Cuánto efectivo retirás?' : '¿Cuánto efectivo agregás?'} value={amount} onChange={setAmount} disabled={pending} max={withdrawal ? Math.max(0, expected) : undefined} shortcuts={withdrawal ? [{ label: 'Retirar todo · ' + money(expected), amount: expected, disabled: expected <= 0 }] : []} increments={!withdrawal} />
      <div className="space-y-2"><Label htmlFor={'movement-reason-' + formId}>Motivo del {withdrawal ? 'retiro' : 'aporte'}</Label><Input id={'movement-reason-' + formId} placeholder={withdrawal ? 'Ej.: entrega al encargado' : 'Ej.: reposición de cambio'} maxLength={255} value={reason} onChange={e => setReason(e.target.value)} disabled={pending} required /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-xs"><span className="text-muted-foreground">{amountValid(amount) && nextCash >= 0 ? 'Efectivo después del movimiento' : 'Efectivo disponible'}</span><span className="font-semibold tabular-nums">{money(amountValid(amount) && nextCash >= 0 ? nextCash : expected)}</span></div>
      <p className="text-xs leading-relaxed text-muted-foreground">Queda registrado con tu nombre y motivo. No modifica las ventas ni los gastos de la planilla.</p>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={() => { setExpanded(false); setAmount(''); setReason(''); }}>Cancelar</Button><Button disabled={pending || !valid}>{pending ? 'Registrando…' : withdrawal ? 'Confirmar retiro' : 'Confirmar aporte'}</Button></div>
    </form>}
  </section>;
}
