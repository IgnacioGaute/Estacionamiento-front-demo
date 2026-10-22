'use client';
import { useForegroundPoll } from '@/hooks/use-foreground-poll';
import { useEffect, useId, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, Banknote, ChevronRight, History, Plus, ShieldCheck, Wallet, Car, Users } from 'lucide-react';
import { TurnoResumenPanel } from '@/components/turno-resumen';
import { Etiqueta, Iniciales, Paso, Pill } from '@/components/turno-ui';
import { cn } from '@/lib/utils';
import { CashAmountField } from '@/components/cash-amount-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ActionDialog, ActionDialogBody, ActionDialogContent, ActionDialogFooter, ActionDialogHeader, ActionDialogPrimaryButton } from '@/components/ui/action-dialog';
import { DataLoading } from '@/components/ui/data-loading';
import { CashContext, EstadiaAbiertaTurno } from '@/types/turno.type';
import { getEstadiasAbiertasTurnoAction } from '@/actions/turnos/estadias-abiertas.action';
import { paraRepasar, RepasoEstadias } from './repaso-estadias';
import { useConfirmadas } from './estadias-largas';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';
import { addCashMovementAction } from '@/actions/turnos/cajas.action';

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const date = (s: string) => new Date(s).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
const amountValid = (s: string) => s !== '' && Number.isInteger(Number(s)) && Number(s) >= 0;

const horaApertura = (s: string) => new Date(s).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// `pill`: el acceso que va en la tarjeta amarilla del inicio («Turno abierto · 08:02»). `primary`:
// el botón destacado del encabezado de Caja. Los tres abren el mismo diálogo.
// `onCobrarEstadia`: desde el repaso del cierre, abre el cobro de una estadía que ya se fue (solo
// donde existe el panel de cobro; en Caja del administrador no se ofrece).
export function TurnoBar({ onUpdated, turnoId, revision = 0, variant = 'button', onCobrarEstadia }: { onUpdated?: () => void; turnoId?: string; revision?: number; variant?: 'button' | 'pill' | 'primary'; onCobrarEstadia?: (id: string) => void } = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [context, setContext] = useState<CashContext | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [cajaId, setCajaId] = useState('');
  // El saldo anterior es una referencia, nunca una confirmación del dinero recibido.
  const [received, setReceived] = useState('');
  const [added, setAdded] = useState('0');
  const [openingReason, setOpeningReason] = useState('');
  const [counted, setCounted] = useState('');
  // Sin una elección propia se sugiere el fondo de la caja. Corregir el conteo no pisa lo elegido.
  const [cashForNext, setCashForNext] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [forcedReason, setForcedReason] = useState('');
  // Las entradas del operador que siguen abiertas: hay que confirmarlas para cerrar el turno.
  const [estadias, setEstadias] = useState<EstadiaAbiertaTurno[] | null>(null);
  const [estadiasConfirmadas, setEstadiasConfirmadas] = useState<string[]>([]);
  const { confirmada: confirmadaEnDispositivo, confirmar: confirmarEnDispositivo } = useConfirmadas();
  const esAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const nombreUsuario = [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ').trim() || session?.user?.username || 'Tu usuario';
  const active = turnoId ? context?.openTurnos.find(t => t.id === turnoId) : context?.active;
  const caja = context?.cajas?.find(c => c.id === (active?.cajaId ?? cajaId));
  const expected = active?.efectivoDisponible ?? context?.efectivoDisponible ?? 0;
  const arqueo = active?.requiereArqueo !== false;
  const forzando = !!active && active.usuarioApertura?.id !== session?.user?.id;
  const canClose = !!active && (!forzando || esAdmin);
  const openingExpected = caja?.pending?.efectivoParaSiguiente ?? caja?.legacyPending?.efectivoParaSiguiente ?? 0;
  const handover = caja?.traspaso;
  const hasPrior = !!(caja?.pending || caja?.legacyPending);
  const openingDifference = hasPrior ? openingExpected - Number(received) : 0;
  const closingDifference = expected - Number(counted);
  const reserve = active?.fondoObjetivo ?? caja?.fondoObjetivo ?? 15000;
  const salaryExpected = active?.sueldoPrevisto ?? 0;
  const salaryBase = arqueo ? (amountValid(counted) ? Number(counted) : 0) : expected;
  const salary = salaryExpected > 0 && salaryBase - reserve >= salaryExpected ? salaryExpected : 0;
  const afterSalary = Math.max(0, Number(counted) - salary);
  const forNext = cashForNext ?? (amountValid(counted) ? String(Math.min(reserve, afterSalary)) : '');
  const handoverValid = amountValid(counted) && amountValid(forNext) && Number(forNext) <= afterSalary;
  const withdrawn = handoverValid ? afterSalary - Number(forNext) : null;

  const refresh = async (resetOpening = false) => {
    let result: Awaited<ReturnType<typeof getCashContextAction>>;
    // Corre dentro de una transición, y React manda cualquier error de una transición a la pantalla
    // de error. Al desbloquear el celular el reloj de un minuto dispara enseguida, antes de que
    // vuelva la red, y el «Failed to fetch» tiraba la app entera. Sin respuesta se queda lo que
    // estaba en pantalla y se reintenta en el próximo ciclo o al volver la conexión.
    try {
      result = await getCashContextAction();
    } catch {
      return;
    }
    if (result.error || !result.context) { setContext(null); setError(result.error ?? 'No se pudo cargar la caja.'); return; }
    const next = result.context;
    if (turnoId && !next.openTurnos.some(t => t.id === turnoId)) { setContext(null); setError('Este turno ya no está abierto. Actualizá la lista de turnos.'); return; }
    setContext(next); setError('');
    const selected = next.cajas?.find(c => c.id === cajaId) ?? next.cajas?.[0];
    if (selected) { setCajaId(selected.id); if (resetOpening) { setReceived(''); setAdded('0'); setOpeningReason(''); } }
  };
  useEffect(() => {
    if (turnoId) return;
    const update = () => { if (!document.hidden && navigator.onLine) startTransition(() => refresh()); };
    update();
    window.addEventListener('parking-shift-changed', update);
    return () => { window.removeEventListener('parking-shift-changed', update); };
  }, [turnoId, revision, cajaId]);
  useForegroundPoll(() => startTransition(() => refresh()), 60000, { immediate: false, enabled: !turnoId });
  // Se consultan al entrar al cierre. Si la consulta falla no se traba el cierre.
  const activeId = active?.id;
  useEffect(() => {
    if (!open || !closing || !activeId) return;
    let vigente = true;
    setEstadias(null);
    setEstadiasConfirmadas([]);
    // Quien cuenta la caja al final repasa todas las de la playa, no solo las suyas: autos que
    // registró otro turno y se fueron sin registrar la salida no le aparecían a nadie.
    void getEstadiasAbiertasTurnoAction(activeId, arqueo).then(lista => { if (vigente) setEstadias(lista ?? []); });
    return () => { vigente = false; };
  }, [open, closing, activeId, arqueo]);
  const cobrarEstadia = onCobrarEstadia && ((id: string) => { setOpen(false); setClosing(false); onCobrarEstadia(id); });
  const updated = () => { onUpdated?.(); window.dispatchEvent(new Event('parking-shift-changed')); };
  const submitOpen = () => {
    if (!caja || pending || !openingValid) return;
    startTransition(async () => {
    const result = await openTurnoAction({ cajaId: caja.id, fondoInicial: caja.session ? 0 : Number(received) + Number(added),
      sesionActivaId: caja.session?.id, sesionAnteriorId: caja.pending?.id, turnoAnteriorId: caja.legacyPending?.id,
      cambioAgregado: caja.session ? 0 : Number(added), motivoApertura: openingDifference ? openingReason : undefined });
    if (result.error) { toast.error(typeof result.error === 'string' ? result.error : result.error.message); await refresh(); return; }
    toast.success(caja.session ? 'Te uniste a la caja. Tu turno está abierto.' : 'Caja y turno abiertos.'); setOpen(false); updated(); await refresh();
    });
  };
  const submitClose = () => {
    if (!active || pending || !closingValid) return;
    startTransition(async () => {
      const result = await closeTurnoAction(active.id, { cerrarCaja: arqueo, sueldoEsperado: salary, efectivoEsperado: expected,
        ...(arqueo ? { efectivoContado: Number(counted), efectivoEsperado: expected, efectivoParaSiguiente: Number(forNext) } : {}),
        observaciones: notes, motivoCierreForzado: forzando ? forcedReason : undefined });
      if (result.error) { toast.error(typeof result.error === 'string' ? result.error : result.error.message); await refresh(); return; }
      if (result.turno?.alertaSueldo) toast.error(result.turno.alertaSueldo);
      toast.success(arqueo ? `Turno y caja cerrados. Dejás ${money(Number(forNext))} para el próximo operador.` : 'Turno cerrado. La caja sigue abierta para los demás operadores.');
      setOpen(false); setClosing(false); updated(); await refresh();
    });
  };
  // Solo se preguntan los de más de 4 horas; el turno se cierra cuando están todos revisados. Los que
  // ya se confirmaron en este dispositivo (franja del inicio o Cobrar salida) llegan marcados, y lo
  // que se marca acá queda confirmado también allá.
  const largas = estadias ? paraRepasar(estadias, Date.now()) : [];
  const confirmadas = [...new Set([...estadiasConfirmadas, ...largas.filter(e => confirmadaEnDispositivo(e.id, Date.now())).map(e => e.id)])];
  const confirmar = (ids: string[], sigue: boolean) => {
    setEstadiasConfirmadas(actuales => sigue ? [...new Set([...actuales, ...ids])] : actuales.filter(id => !ids.includes(id)));
    confirmarEnDispositivo(ids, sigue);
  };
  const closingValid = canClose && estadias !== null && largas.every(e => confirmadas.includes(e.id)) &&(!forzando || forcedReason.trim()) && (!arqueo ||(handoverValid && (closingDifference === 0 || notes.trim())));
  const openingValid = !!caja && !context?.legacyOpen && (caja.session ? context?.multipleShiftsEnabled : amountValid(received) && amountValid(added) && (openingDifference === 0 || openingReason.trim()));
  const abrir = () => { setClosing(!!turnoId); setReceived(''); setAdded('0'); setOpeningReason(''); setCounted(''); setCashForNext(null); setNotes(''); setForcedReason(''); setOpen(true); startTransition(() => refresh(true)); };
  const enlaceHistorial = esAdmin && <Link href="/admin/caja?tab=turnos" onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); setOpen(false); setTimeout(() => router.push('/admin/caja?tab=turnos'), 200); }} className="mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gm-yellow/10 hover:text-gm-yellow"><History className="size-3.5" aria-hidden />Ver turnos e historial</Link>;
  return <>
    {variant === 'pill' ? (
      <button type="button" onClick={abrir} className="inline-flex h-[34px] items-center gap-2 rounded-full bg-gm-ink px-3.5 text-[12.5px] font-bold text-[#F2EDE3] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-ink focus-visible:ring-offset-2 focus-visible:ring-offset-gm-yellow">
        <span aria-hidden className={'size-[7px] rounded-full ' + (active ? 'bg-emerald-400' : 'bg-gm-orange')} />
        {active ? `Turno abierto · ${horaApertura(active.fechaApertura)}` : 'Abrir mi turno'}
      </button>
    ) : (
      <Button variant={variant === 'primary' ? 'default' : 'outline'} size={variant === 'primary' ? 'default' : 'sm'} className={cn(variant === 'primary' && 'h-11 rounded-xl px-5 font-bold')} onClick={abrir}><Wallet className="size-4" />{turnoId ? 'Cerrar turno' : active ? 'Mi turno' : 'Abrir mi turno'}</Button>
    )}
    {/* Como registrar entrada o cobrar salida: en el celular sube desde abajo y el botón que
        confirma queda fijo en el pie, al alcance del pulgar. */}
    <ActionDialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); if (!value) setClosing(false); } }}>
      <ActionDialogContent>
        <ActionDialogHeader
          title={active ? closing ? arqueo ? 'Cerrar turno y caja' : 'Cerrar sólo el turno' : 'Mi turno' : 'Abrir mi turno'}
          description={active ? closing ? arqueo ? 'Contá el efectivo de toda la caja' : 'La caja sigue abierta para los demás' : arqueo ? 'Sos el último operador de esta caja' : 'Compartís esta caja con otros operadores' : 'Confirmá lo que recibís antes de empezar'}
          onBack={active && closing ? () => setClosing(false) : undefined}
          backLabel="Volver al turno"
          backDisabled={pending}
        />
        {!context ? <ActionDialogBody className="[&>*]:shrink-0">
          {error ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : <DataLoading label="Cargando caja…" />}
          {enlaceHistorial}
        </ActionDialogBody> : active ? closing ? <form onSubmit={e => { e.preventDefault(); submitClose(); }} className="flex min-h-0 flex-auto flex-col"><ActionDialogBody className="gap-5 [&>*]:shrink-0">
          {arqueo && <p className="text-[13px] leading-relaxed text-muted-foreground">Sos el último operador de esta caja: contá el efectivo de todos los turnos desde su apertura.</p>}
          {estadias && <RepasoEstadias estadias={largas} todas={arqueo} sobrante={arqueo && amountValid(counted) && closingDifference < 0 ? -closingDifference : 0} confirmadas={confirmadas} onConfirmar={confirmar} onCobrar={cobrarEstadia} disabled={pending} />}
          <section aria-label="Turno que cerrás" className="overflow-hidden rounded-2xl border border-gm-line bg-gm-surface-2/50">
            <div className="flex items-center gap-3 p-3.5">
              <Iniciales nombre={active.nombre} />
              <div className="min-w-0"><p className="truncate font-semibold">{active.nombre}</p><p className="truncate text-xs text-muted-foreground">{active.caja?.nombre ?? 'Turno anterior'} · desde {date(active.fechaApertura)}</p></div>
            </div>
            {arqueo && <div className="flex flex-wrap items-end justify-between gap-2 border-t border-gm-line px-3.5 py-3">
              <p className="text-xs text-muted-foreground">Efectivo esperado de la caja</p>
              <p className="font-display text-[30px] font-bold leading-none tracking-tight tabular-nums">{money(expected)}</p>
            </div>}
          </section>

          {arqueo ? <ol className="space-y-5">
            <Paso numero={1} listo={amountValid(counted) && (closingDifference === 0 || !!notes.trim())}>
              <CashAmountField id="cash-counted" label="¿Cuánto efectivo contaste?" value={counted} onChange={setCounted} disabled={pending} placeholder="Contá el dinero antes de confirmar" shortcuts={[{ label: 'Conté todo · ' + money(expected), amount: expected, disabled: expected < 0 }, { label: 'No hay efectivo', amount: 0 }, { label: 'Conté menos', edit: true, disabled: expected <= 0 }]} description="Si coincide, tocá Conté todo. Con Conté menos podés escribir el importe real; si hay una diferencia, explicá el motivo."
                status={amountValid(counted) && <Pill tono={closingDifference === 0 ? 'ok' : 'aviso'}>{closingDifference === 0 ? 'Coincide' : closingDifference > 0 ? 'Faltan ' + money(closingDifference) : 'Sobran ' + money(-closingDifference)}</Pill>} />
            </Paso>
            <Paso numero={2} listo={handoverValid} ultimo>
              <CashAmountField id="cash-for-next" label="¿Cuánto dejás en caja para el próximo turno?" labelClassName="min-w-[min(100%,14rem)] text-[13px] normal-case tracking-normal text-foreground" value={forNext} onChange={setCashForNext} disabled={pending || !amountValid(counted)} max={amountValid(counted) ? afterSalary : undefined} editLabel="Cambiar importe"
                shortcuts={[{ label: 'Usar sugerido · ' + money(reserve), amount: reserve, disabled: reserve > afterSalary }, { label: 'Dejar todo · ' + money(afterSalary), amount: afterSalary }]}
                description={amountValid(counted) ? `El fondo sugerido de ${money(reserve)} es una referencia. Podés dejar más, menos o $0. El cambio vale solo para este cierre.` : 'Primero indicá cuánto contaste; después elegí cuánto dejás para el próximo turno.'} />
              {amountValid(counted) && amountValid(forNext) && Number(forNext) > afterSalary && <p role="alert" className="mt-2 text-sm text-destructive">No podés dejar más de {money(afterSalary)}: es el efectivo disponible después del sueldo.</p>}
              {amountValid(counted) && <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-gm-surface-2 px-3.5 py-3 text-sm" aria-live="polite">
                <span className="text-muted-foreground">Retirás de recaudación (sin sueldo)</span>
                <strong className="gm-mono tabular-nums">{withdrawn === null ? '—' : money(withdrawn)}</strong>
              </div>}
            </Paso>
          </ol> : <div className="flex gap-3 rounded-2xl border border-gm-yellow/25 bg-gm-yellow/[0.06] p-4 text-sm"><Users className="mt-0.5 size-4 shrink-0 text-gm-yellow" aria-hidden /><div><p className="font-semibold">La caja continúa abierta</p><p className="mt-1 leading-relaxed text-muted-foreground">Tus operaciones quedan registradas a tu nombre. El fondo y el efectivo siguen en {active.caja?.nombre ?? 'la caja compartida'}; el cierre registra solamente el retiro de sueldo si está configurado y hay efectivo suficiente.</p></div></div>}

          {salaryExpected > 0 && <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4 text-sm">
            <Banknote className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
            <div className="min-w-0">
              <p>Sueldo previsto: <strong className="tabular-nums">{money(salaryExpected)}</strong> · Fondo de referencia: <span className="tabular-nums">{money(reserve)}</span></p>
              {arqueo && !amountValid(counted) ? <p className="mt-1 text-muted-foreground">Contá el efectivo para comprobar si alcanza.</p> : salary > 0 ? <p className="mt-1 leading-relaxed text-muted-foreground">Se registrará el retiro de {money(salary)}. Retirá físicamente ese importe al confirmar. Está separado del retiro de recaudación.</p> : <p role="alert" className="mt-1 leading-relaxed text-amber-600 dark:text-amber-400">El efectivo no alcanza para preservar el fondo. No se descontará el sueldo y quedará una alerta en el historial.</p>}
            </div>
          </div>}

          {arqueo && amountValid(counted) && <section aria-label="Cómo queda la caja" className="overflow-hidden rounded-2xl border border-gm-line">
            <Etiqueta className="px-4 pt-3.5">Cómo queda la caja</Etiqueta>
            <dl className="space-y-2 px-4 py-3 text-sm">
              <Linea label="Contaste" value={money(Number(counted))} />
              {salaryExpected > 0 && <Linea label="Sueldo" value={salary > 0 ? '− ' + money(salary) : 'No se descuenta'} />}
              <Linea label="Retiro de recaudación" value={withdrawn === null ? '—' : '− ' + money(withdrawn)} />
            </dl>
            <div className={cn('flex items-center justify-between gap-3 border-t border-gm-line px-4 py-3', handoverValid ? 'bg-emerald-400/[0.06]' : 'bg-destructive/10')}>
              <span className="text-[13px] font-semibold">{handoverValid ? 'Queda para el próximo operador' : 'Revisá cuánto dejás en caja'}</span>
              <strong className={cn('tabular-nums', handoverValid ? 'text-emerald-400' : 'text-destructive')}>{handoverValid ? money(Number(forNext)) : '—'}</strong>
            </div>
          </section>}

          <details className="group rounded-2xl border border-gm-line text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-muted-foreground rounded-2xl transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow [&::-webkit-details-marker]:hidden">Ver resumen del turno<ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden /></summary>
            <div className="border-t border-gm-line p-3"><TurnoResumenPanel turno={active} /></div>
          </details>
          <div className="space-y-1.5"><Label htmlFor="cash-notes">{arqueo && amountValid(counted) && closingDifference !== 0 ? 'Motivo de la diferencia' : 'Nota del turno (opcional)'}</Label><Textarea id="cash-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={pending} required={arqueo && amountValid(counted) && closingDifference !== 0} placeholder="Algo que deba saber el próximo turno" className="min-h-20" /><p className="text-[11px] text-muted-foreground">Se publica automáticamente en Avisos.</p></div>
          {forzando && <div className="space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4"><Label htmlFor="forced-reason">¿Por qué cerrás el turno de otra persona?</Label><Input id="forced-reason" maxLength={255} value={forcedReason} onChange={e => setForcedReason(e.target.value)} disabled={pending} required placeholder="Ej.: se retiró sin cerrar su turno" /><p className="text-[11px] text-muted-foreground">Queda en el historial junto a tu nombre.</p></div>}
          {enlaceHistorial}
        </ActionDialogBody>
          <ActionDialogFooter>
            <ActionDialogPrimaryButton type="submit" disabled={pending || !closingValid}>{pending ? 'Cerrando…' : arqueo ? 'Confirmar cierre de turno y caja' : 'Confirmar cierre de turno'}</ActionDialogPrimaryButton>
          </ActionDialogFooter>
        </form> : <><ActionDialogBody className="[&>*]:shrink-0">
          <section aria-label="Tu turno en curso" className="relative overflow-hidden rounded-[22px] bg-gm-yellow text-gm-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]">
            <div aria-hidden className="h-2" style={{ backgroundImage: 'repeating-linear-gradient(135deg, hsl(var(--gm-ink)) 0 9px, hsl(var(--gm-yellow)) 9px 18px)' }} />
            <Wallet aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 size-[130px] text-gm-ink/[0.06]" strokeWidth={1.5} />
            <div className="relative space-y-4 px-5 pb-5 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex h-7 items-center gap-2 rounded-full bg-gm-ink px-3 text-[12px] font-bold text-[#F2EDE3]"><span aria-hidden className="size-[7px] rounded-full bg-emerald-400" />En curso · desde {horaApertura(active.fechaApertura)}</span>
                <span className="text-[12px] font-bold text-gm-ink/70">{active.caja?.nombre ?? 'Turno anterior'}</span>
              </div>
              <div><p className="text-lg font-bold leading-tight">{active.nombre}</p><p className="mt-0.5 text-xs font-semibold text-gm-ink/65">Abierto el {date(active.fechaApertura)}</p></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gm-ink/70">Efectivo esperado en la caja</p>
                <p className="mt-1 font-display text-[48px] font-bold leading-[0.95] tracking-tight tabular-nums">{money(expected)}</p>
                <p className="mt-2 pr-16 text-xs font-medium text-gm-ink/70">Incluye el fondo inicial y los movimientos de todos los operadores.</p>
              </div>
            </div>
          </section>
          <TurnoResumenPanel turno={active} />
          {esAdmin && active.cashSessionId && <CashMovementForm sesionId={active.cashSessionId} expected={expected} onUpdated={() => { updated(); startTransition(() => refresh()); }} />}
          <p className="text-center text-xs text-muted-foreground">{arqueo ? 'Al terminar, vas a contar y cerrar esta caja.' : 'Compartís esta caja con otros operadores. Podés cerrar sólo tu turno; el último cuenta el efectivo.'}</p>
          {enlaceHistorial}
        </ActionDialogBody>
          <ActionDialogFooter>
            <ActionDialogPrimaryButton disabled={pending || !canClose} onClick={() => setClosing(true)}>{arqueo ? 'Cerrar mi turno y contar la caja' : 'Cerrar sólo mi turno'}</ActionDialogPrimaryButton>
          </ActionDialogFooter>
        </> : <form onSubmit={e => { e.preventDefault(); submitOpen(); }} className="flex min-h-0 flex-auto flex-col"><ActionDialogBody className="gap-5 [&>*]:shrink-0">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gm-line bg-gm-surface-2/50 p-3">
            <span className="flex min-w-0 items-center gap-3"><Iniciales nombre={nombreUsuario} className="size-8 text-[11px]" /><span className="min-w-0"><span className="block text-[11px] text-muted-foreground">Tu turno</span><strong className="block truncate text-sm font-semibold">{nombreUsuario}</strong></span></span>
            {(context.cajas?.length ?? 0) <= 1 && <Pill>{caja?.nombre ?? 'Caja principal'}</Pill>}
          </div>
          {context.legacyOpen && <p role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-4 text-sm">Hay turnos del esquema anterior abiertos. El administrador debe cerrarlos antes de empezar a usar cajas compartidas.</p>}
          {(context.cajas?.length ?? 0) > 1 ? <div className="space-y-1.5"><Label htmlFor="cash-register">¿En qué caja vas a trabajar?</Label><Select value={cajaId} disabled={pending} onValueChange={value => { setCajaId(value); setReceived(''); setAdded('0'); setOpeningReason(''); }}><SelectTrigger id="cash-register" className="h-11"><SelectValue placeholder="Elegí tu caja" /></SelectTrigger><SelectContent>{context.cajas?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre} · {c.session ? 'Abierta' : 'Disponible'}</SelectItem>)}</SelectContent></Select></div> : null}
          {caja?.session ? <div className="space-y-3 rounded-2xl border border-gm-yellow/25 bg-gm-yellow/[0.06] p-4 text-sm">
            <p className="font-semibold">{context.multipleShiftsEnabled ? 'Te vas a unir a una caja abierta' : 'Esta caja ya tiene un turno abierto'}</p>
            <div className="flex items-center gap-3"><span className="flex -space-x-2">{caja.operadores.slice(0, 3).map(o => <Iniciales key={o.turnoId} nombre={o.nombre} className="size-8 border-2 border-card text-[11px]" />)}</span><p className="text-muted-foreground">{caja.operadores.map(o => o.nombre).join(', ')} {caja.operadores.length === 1 ? 'está trabajando' : 'están trabajando'} aquí.</p></div>
            {handover && <p className="flex items-center gap-2 text-foreground"><Car className="size-4" aria-hidden />{handover.vehiculosActivos} vehículos dentro</p>}
            <p className="text-muted-foreground">{context.multipleShiftsEnabled ? 'Compartís el efectivo de esta caja.' : 'Esperá a que cierre su turno.'}</p>
          </div> : <>
            <section aria-label="Lo que recibís del turno anterior" className="overflow-hidden rounded-2xl border border-gm-line bg-gm-surface-2/50">
              <div className="flex items-start justify-between gap-3 border-b border-gm-line px-4 py-3">
                <div className="min-w-0">
                  <Etiqueta>{hasPrior ? 'Último turno · dejó la caja' : 'Primera apertura de esta caja'}</Etiqueta>
                  {hasPrior && <p className="mt-1.5 text-sm font-semibold">{handover?.operador ?? 'Responsable no informado'}</p>}
                </div>
                {hasPrior && handover?.fechaCierre && <span className="gm-mono shrink-0 pt-0.5 text-[11px] text-muted-foreground">{date(handover.fechaCierre)}</span>}
              </div>
              <div className="grid grid-cols-2 divide-x divide-gm-line">
                <div className="p-4"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5 shrink-0" aria-hidden />{hasPrior ? 'Efectivo que dejó' : 'Efectivo inicial'}</p><p className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight tabular-nums">{money(openingExpected)}</p></div>
                <div className="p-4"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Car className="size-3.5 shrink-0" aria-hidden />{handover?.vehiculosDejados != null ? 'Vehículos que dejó dentro' : 'Vehículos dentro ahora'}</p>{(() => { const v = handover?.vehiculosDejados ?? handover?.vehiculosActivos; return v == null ? <p className="mt-2 text-sm font-semibold text-muted-foreground">No informado</p> : <p className="mt-2 font-display text-[28px] font-bold leading-none tabular-nums">{v}</p>; })()}</div>
              </div>
              {handover?.vehiculosDejados != null && handover.vehiculosActivos !== handover.vehiculosDejados && <p className="border-t border-gm-line px-4 py-2 text-[11px] text-muted-foreground">Ahora hay {handover.vehiculosActivos} vehículos dentro.</p>}
            </section>
            <section aria-labelledby="received-question" className="space-y-3 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.04] p-3 sm:p-4">
              <div className="space-y-1">
                <h3 id="received-question" className="text-base font-bold">¿Cuánto efectivo recibiste?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">Contá el dinero. Marcá lo que recibiste o escribí otro importe para poder abrir la caja.</p>
              </div>
              <CashAmountField id="cash-received" label="Efectivo que recibís" value={received} onChange={setReceived} disabled={pending} placeholder="Escribí el importe recibido" shortcuts={[...(hasPrior && openingExpected > 0 ? [{ label: 'Recibí todo · ' + money(openingExpected), amount: openingExpected }] : []), { label: 'Sin efectivo recibido', amount: 0 }]} description="Confirmá el dinero que tenés en mano, antes de agregar cambio." />
              {openingDifference !== 0 && amountValid(received) && <div className="space-y-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4"><Pill tono="aviso">{openingDifference > 0 ? 'Faltan ' + money(openingDifference) : 'Hay ' + money(-openingDifference) + ' adicionales'}</Pill><div className="space-y-1.5"><Label htmlFor="opening-reason">Motivo de la diferencia al recibir</Label><Input id="opening-reason" maxLength={255} required value={openingReason} onChange={e => setOpeningReason(e.target.value)} disabled={pending} placeholder="Ej.: retiro que no quedó registrado" /></div></div>}
            </section>
            <details className="group rounded-2xl border border-dashed border-gm-line-strong text-xs">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-muted-foreground rounded-2xl transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow [&::-webkit-details-marker]:hidden"><Plus className="size-3.5 transition-transform group-open:rotate-45" aria-hidden />Agregar cambio · opcional</summary>
              <div className="border-t border-dashed border-gm-line-strong p-4"><CashAmountField id="cash-added" label="Cambio que agregás ahora" value={added} onChange={setAdded} disabled={pending} shortcuts={[{ label: 'No agrego cambio', amount: 0 }]} increments description="Solo si agregás dinero de afuera." /></div>
            </details>
          </>}
          {enlaceHistorial}
        </ActionDialogBody>
          <ActionDialogFooter>
            <ActionDialogPrimaryButton type="submit" disabled={pending || !openingValid} detail={!caja?.session && !amountValid(received) ? 'Primero confirmá cuánto efectivo recibiste' : undefined}>{pending ? 'Abriendo…' : caja?.session ? 'Abrir mi turno en esta caja' : 'Abrir caja y mi turno'}</ActionDialogPrimaryButton>
          </ActionDialogFooter>
        </form>}
      </ActionDialogContent>
    </ActionDialog>
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
  if (!['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')) return null;
  const withdrawal = type === 'RETIRO';
  const valid = amountValid(amount) && Number(amount) > 0 && (!withdrawal || Number(amount) <= expected) && !!reason.trim();
  const nextCash = expected + (withdrawal ? -Number(amount) : Number(amount));
  return <section aria-label="Movimientos de efectivo" className="overflow-hidden rounded-2xl border border-gm-line bg-gm-surface-2/40">
    <div className="space-y-3.5 p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">Movimientos de efectivo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registrá el dinero que sacás o agregás al cajón durante la jornada.</p></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gm-yellow/10 px-2 py-0.5 text-[10.5px] font-bold text-gm-yellow"><ShieldCheck className="size-3" aria-hidden />Admin</span></div>
      <div className="grid grid-cols-2 gap-2">{(['RETIRO', 'APORTE'] as const).map(option => <Button key={option} type="button" variant="outline" disabled={pending} aria-pressed={expanded && type === option} aria-expanded={expanded && type === option} className="h-11 rounded-xl border-gm-line-strong aria-pressed:border-gm-yellow/50 aria-pressed:bg-gm-yellow/10 aria-pressed:text-gm-yellow" onClick={() => { if (type !== option) { setAmount(''); setReason(''); } setType(option); setExpanded(true); }}>{option === 'RETIRO' ? <ArrowUpRight /> : <ArrowDownLeft />}{option === 'RETIRO' ? 'Retirar efectivo' : 'Agregar efectivo'}</Button>)}</div>
    </div>
    {expanded && <form className="space-y-4 border-t border-gm-line p-4" onSubmit={e => { e.preventDefault(); if (!valid || pending) return; startTransition(async () => { const result = await addCashMovementAction(sesionId, { tipo: type, importe: Number(amount), efectivoEsperado: expected, motivo: reason }); if (result.error) { toast.error(result.error); onUpdated(); return; } toast.success(withdrawal ? 'Retiro registrado' : 'Aporte registrado'); setAmount(''); setReason(''); setExpanded(false); onUpdated(); }); }}>
      <CashAmountField id={'movement-amount-' + formId} label={withdrawal ? '¿Cuánto efectivo retirás?' : '¿Cuánto efectivo agregás?'} value={amount} onChange={setAmount} disabled={pending} max={withdrawal ? Math.max(0, expected) : undefined} shortcuts={withdrawal ? [{ label: 'Retirar todo · ' + money(expected), amount: expected, disabled: expected <= 0 }] : []} increments={!withdrawal} />
      <div className="space-y-2"><Label htmlFor={'movement-reason-' + formId}>Motivo del {withdrawal ? 'retiro' : 'aporte'}</Label><Input id={'movement-reason-' + formId} placeholder={withdrawal ? 'Ej.: entrega al encargado' : 'Ej.: reposición de cambio'} maxLength={255} value={reason} onChange={e => setReason(e.target.value)} disabled={pending} required /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gm-line bg-background/40 px-3.5 py-3 text-xs"><span className="text-muted-foreground">{amountValid(amount) && nextCash >= 0 ? 'Efectivo después del movimiento' : 'Efectivo disponible'}</span><span className={cn('text-sm font-bold tabular-nums', amountValid(amount) && Number(amount) > 0 && nextCash >= 0 && (withdrawal ? 'text-amber-400' : 'text-emerald-400'))}>{money(amountValid(amount) && nextCash >= 0 ? nextCash : expected)}</span></div>
      <p className="text-xs leading-relaxed text-muted-foreground">Queda registrado con tu nombre y motivo. No modifica las ventas ni los gastos de la planilla.</p>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={() => { setExpanded(false); setAmount(''); setReason(''); }}>Cancelar</Button><Button className="rounded-xl font-bold" disabled={pending || !valid}>{pending ? 'Registrando…' : withdrawal ? 'Confirmar retiro' : 'Confirmar aporte'}</Button></div>
    </form>}
  </section>;
}

function Linea({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>;
}
