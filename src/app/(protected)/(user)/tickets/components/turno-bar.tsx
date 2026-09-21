'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { CashContext } from '@/types/turno.type';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const date = (s: string) => new Date(s).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });

export function TurnoBar({ onUpdated }: { onUpdated?: () => void } = {}) {
  const { data: session } = useSession();
  const [context, setContext] = useState<CashContext | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const nombreUsuario = [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ').trim() || session?.user?.username || '';
  const [nombre, setNombre] = useState<string | null>(null);
  const [hours, setHours] = useState('24');
  const [initial, setInitial] = useState('0');
  const [modo, setModo] = useState<'justo' | 'otro'>('otro');
  const [counted, setCounted] = useState('');
  const [withdrew, setWithdrew] = useState(false);
  const [withdrawnInput, setWithdrawnInput] = useState('0');
  const [notes, setNotes] = useState('');
  const [forcedReason, setForcedReason] = useState('');

  const refresh = async () => {
    const result = await getCashContextAction();
    if (result.error || !result.context) { setContext(null); setError(result.error ?? 'No se pudo cargar la caja.'); return; }
    setError(''); setContext(result.context);
    setInitial(String(result.context.pending?.efectivoParaSiguiente ?? 0));
  };
  useEffect(() => { startTransition(() => refresh()); }, []);

  const limpiar = () => { setModo('otro'); setCounted(''); setWithdrew(false); setWithdrawnInput(''); setNotes(''); setForcedReason(''); };

  const active = context?.active;
  const esperado = context?.efectivoDisponible ?? 0;
  const esResponsable = !!active?.usuarioApertura && active.usuarioApertura.email === session?.user?.email;
  // Un admin puede cerrar el turno de otro cuando el operador se fue sin cerrar: si no, la caja
  // queda trabada para todos, porque tampoco se puede abrir el siguiente.
  const esAdmin = session?.user?.role === 'ADMIN';
  const forzando = !!active && !esResponsable && esAdmin;
  const canClose = !!active && (esResponsable || esAdmin);
  const bloqueado = pending || !canClose;

  const contado = modo === 'justo' ? esperado : Number(counted || 0);
  const hayMonto = modo === 'justo' || (modo === 'otro' && counted !== '' && Number.isFinite(contado) && contado >= 0);
  // El operador declara lo que SACÓ, no lo que deja: por defecto no saca nada y todo el efectivo
  // contado pasa al turno siguiente, que es como se trabaja la mayoría de las veces.
  const withdrawn = withdrew ? Number(withdrawnInput || 0) : 0;
  const retained = contado - withdrawn;
  const difference = esperado - contado;
  const necesitaNota = hayMonto && difference !== 0;

  const submitOpen = () => startTransition(async () => {
    const result = await openTurnoAction({ fondoInicial: Number(initial), nombre: (nombre ?? nombreUsuario).trim(), duracionPrevistaHoras: Number(hours), turnoAnteriorId: context?.pending?.id });
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : result.error.message);
    else { toast.success('Turno abierto.'); limpiar(); setOpen(false); onUpdated?.(); }
    await refresh();
  });

  const submitClose = () => {
    if (!active || !hayMonto) return;
    startTransition(async () => {
      const result = await closeTurnoAction(active.id, {
        efectivoContado: contado,
        efectivoParaSiguiente: retained,
        efectivoEsperado: esperado,
        observaciones: notes,
        motivoCierreForzado: forzando ? forcedReason : undefined,
      });
      if (result.error) toast.error(typeof result.error === 'string' ? result.error : result.error.message);
      else { toast.success('Turno cerrado. Quedan ' + money(retained) + ' para el siguiente turno.'); setOpen(false); onUpdated?.(); }
      limpiar();
      await refresh();
    });
  };

  return <>
    <Button variant="outline" size="sm" onClick={() => { limpiar(); setNombre(null); setClosing(false); setOpen(true); startTransition(() => refresh()); }}>
      <Wallet className="size-4" /> {active ? 'Turno actual' : 'Abrir turno'}
    </Button>

    <Dialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); if (!value) setClosing(false); } }}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto rounded-2xl p-0">
        <DialogHeader>
          <DialogTitle>{active ? closing ? 'Cerrar turno' : 'Turno actual' : 'Abrir turno'}</DialogTitle>
        </DialogHeader>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {!context ? <p className="text-sm text-muted-foreground">{error ? 'Cerrá esta ventana y volvé a intentar.' : 'Cargando caja…'}</p> : <>
          {active && !closing ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-gm-surface-2 p-4 space-y-2">
                <span className="text-xs font-semibold text-emerald-500">● En curso</span>
                <p className="text-xl font-semibold">{active.nombre || 'Turno'}</p>
                <p className="text-sm">{active.usuarioApertura ? `${active.usuarioApertura.firstName} ${active.usuarioApertura.lastName}` : 'Responsable no disponible'}</p>
                <p className="text-sm text-muted-foreground">Abierto el {date(active.fechaApertura)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Debería haber en efectivo</p>
                <p className="gm-tnum mt-1 text-3xl font-bold">{money(esperado)}</p>
              </div>
              {canClose ? <Button className="h-12 w-full" disabled={pending} onClick={() => { limpiar(); setClosing(true); }}>Cerrar este turno</Button>
                : <Aviso>El responsable o un administrador puede cerrar este turno.</Aviso>}
              <EnlaceHistorial visible={esAdmin} onCerrar={() => setOpen(false)} />
            </div>
          ) : active ? (
            <form onSubmit={e => { e.preventDefault(); submitClose(); }} className="space-y-5">
              <p className="text-sm text-muted-foreground">{active.nombre || 'Turno'} · {date(active.fechaApertura)}</p>

              <div className="space-y-2.5">
                <Label>1. Contá los billetes de la caja</Label>
                <p className="text-sm text-muted-foreground">Debería haber <strong className="text-foreground">{money(esperado)}</strong>.</p>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <Label htmlFor="cash-matches" className="cursor-pointer">El efectivo contado coincide</Label>
                  <Switch id="cash-matches" checked={modo === 'justo'} disabled={bloqueado}
                    onCheckedChange={value => { setModo(value ? 'justo' : 'otro'); setCounted(''); }} />
                </div>
                {modo === 'otro' && (
                  <div className="space-y-1.5">
                  <Label htmlFor="cash-counted">¿Cuánto contaste?</Label>
                  <Input id="cash-counted" className="gm-tnum h-12 text-lg" type="number" inputMode="numeric" min="0" step="1"
                    required value={counted} onChange={e => setCounted(e.target.value)} disabled={bloqueado}
                    placeholder="Ingresá el monto" />
                  </div>
                )}
                {hayMonto && <Resultado diferencia={difference} />}
              </div>

              <div className="space-y-2.5">
                <Label>2. ¿Vas a sacar efectivo?</Label>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <Label htmlFor="cash-withdraw" className="cursor-pointer">Retirar efectivo</Label>
                  <Switch id="cash-withdraw" checked={withdrew} disabled={bloqueado}
                    onCheckedChange={value => { setWithdrew(value); setWithdrawnInput(''); }} />
                </div>
                {withdrew && (
                  <div className="space-y-1.5">
                  <Label htmlFor="cash-withdrawn">¿Cuánto vas a retirar?</Label>
                  <Input id="cash-withdrawn" className="gm-tnum h-12 text-lg" type="number" inputMode="numeric" min="0" step="1"
                    required value={withdrawnInput} onChange={e => setWithdrawnInput(e.target.value)} disabled={bloqueado}
                    max={hayMonto ? contado : undefined} placeholder="Ingresá el monto" />
                  </div>
                )}
                {hayMonto && (
                  <p className={`text-sm ${retained < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {retained < 0
                      ? 'No podés retirar más de lo que contaste.'
                      : <>Quedan <span className="gm-tnum font-semibold text-foreground">{money(retained)}</span> para el turno siguiente.</>}
                  </p>
                )}
              </div>

              {necesitaNota && (
                <div className="space-y-1.5">
                  <Label htmlFor="cash-notes">Motivo de la diferencia</Label>
                  <Input id="cash-notes" className="h-11" value={notes} onChange={e => setNotes(e.target.value)}
                    disabled={bloqueado} required placeholder="Vuelto mal entregado" />
                </div>
              )}

              {forzando && (
                <div className="space-y-1.5">
                  <Label htmlFor="forced-reason">¿Por qué cerrás el turno de otra persona?</Label>
                  <Input id="forced-reason" className="h-11" maxLength={255} required value={forcedReason}
                    onChange={e => setForcedReason(e.target.value)} disabled={pending} placeholder="Se retiró sin cerrar la caja" />
                </div>
              )}

              <Button type="submit" className="h-12 w-full"
                disabled={bloqueado || !hayMonto || retained < 0 || (withdrew && (withdrawnInput === '' || !Number.isFinite(withdrawn) || withdrawn < 0)) || (necesitaNota && !notes.trim()) || (forzando && !forcedReason.trim())}>
                {pending ? 'Cerrando…' : 'Confirmar cierre'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={() => setClosing(false)}>Volver al turno</Button>
            </form>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submitOpen(); }} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="shift-name" className="text-sm normal-case tracking-normal">Nombre del turno</Label>
                <Input id="shift-name" className="h-12 rounded-xl text-base" maxLength={80} required value={nombre ?? nombreUsuario} onChange={e => setNombre(e.target.value)} disabled={pending} />
              </div>
              {context.pending && <div className="rounded-xl border border-border bg-secondary/60 p-4">
                <p className="text-sm text-muted-foreground">Recibís del turno anterior</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{money(context.pending.efectivoParaSiguiente ?? 0)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Contá ese efectivo antes de empezar.</p>
              </div>}
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">Duración prevista · {hours || '—'} h</summary>
              <div className="mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shift-hours" className="text-sm normal-case tracking-normal">Horas del turno</Label>
                  <Input id="shift-hours" className="gm-tnum h-11" type="number" inputMode="numeric" min="1" max="168" required
                    value={hours} onChange={e => setHours(e.target.value)} disabled={pending} />
                  <p className="text-xs text-muted-foreground">Es orientativa. El turno se cierra cuando lo confirmás, aunque cambie el día.</p>
                </div>
              </div>
              </details>
              <div className="space-y-1.5">
                <Label htmlFor="cash-initial" className="text-sm normal-case tracking-normal">¿Con cuánto efectivo empezás?</Label>
                <Input id="cash-initial" className="gm-tnum h-12 text-lg" type="number" inputMode="numeric"
                  min={context.pending?.efectivoParaSiguiente ?? 0} step="1" required value={initial}
                  onChange={e => setInitial(e.target.value)} disabled={pending} />
                <p className="text-xs text-muted-foreground">Sumá lo recibido y el cambio que agregues.</p>
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl" disabled={pending || !(nombre ?? nombreUsuario).trim()}>{pending ? 'Abriendo…' : 'Abrir mi turno'}</Button>
              <EnlaceHistorial visible={esAdmin} onCerrar={() => setOpen(false)} />
            </form>
          )}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}

// El historial es la pantalla del encargado y vive en Administración. Acá sólo queda el atajo,
// y sólo para quien puede entrar: al operador el enlace le daría un rebote a /tickets.
function EnlaceHistorial({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const router = useRouter();
  if (!visible) return null;

  const irAlHistorial = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Con Ctrl/Cmd/Shift el navegador abre en otra pestaña y el diálogo no se toca.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onCerrar();
    // Navegar en el mismo tick que el cierre hace que React desmonte el árbol mientras Radix
    // todavía está sacando el nodo del portal, y los dos intentan removerlo: NotFoundError en
    // removeChild. Se espera a que termine la animación de salida antes de cambiar de ruta.
    setTimeout(() => router.push('/admin/caja'), 200);
  };

  return (
    <Link href="/admin/caja" onClick={irAlHistorial}
      className="flex items-center justify-center gap-1.5 pt-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      Ver historial de turnos
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

// Una línea con una regla de color a la izquierda, no una caja rellena: el resultado del arqueo
// informa, no tiene que gritar.
function Resultado({ diferencia }: { diferencia: number }) {
  if (diferencia === 0) {
    return <p className="border-l-2 border-emerald-600 pl-3 text-sm text-emerald-500">La caja coincide con lo esperado.</p>;
  }
  return (
    <div className="border-l-2 border-destructive pl-3">
      <p className="gm-tnum text-sm font-semibold text-destructive">
        {diferencia > 0 ? `Faltan ${money(diferencia)}` : `Sobran ${money(-diferencia)}`}
      </p>
    </div>
  );
}

function Aviso({ tono, children }: { tono?: 'atencion'; children: React.ReactNode }) {
  return (
    <p className={`border-l-2 pl-3 text-sm ${tono === 'atencion' ? 'border-gm-yellow text-gm-yellow' : 'border-border text-muted-foreground'}`}>
      {children}
    </p>
  );
}
