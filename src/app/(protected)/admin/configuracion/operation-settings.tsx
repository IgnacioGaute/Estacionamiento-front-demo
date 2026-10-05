'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, Wallet, Users, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataLoading } from '@/components/ui/data-loading';
import { toast } from '@/lib/toast';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { getCashConfigurationAction, saveCajaAction } from '@/actions/turnos/cajas.action';
import { Caja } from '@/types/turno.type';

export function OperationSettings(props: { shiftsEnabled: boolean; barcodeTicketsEnabled: boolean; multipleShiftsEnabled?: boolean }) {
  const [shifts, setShifts] = useState(props.shiftsEnabled);
  const [multiple, setMultiple] = useState(props.multipleShiftsEnabled ?? false);
  const [tickets, setTickets] = useState(props.barcodeTicketsEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { setShifts(props.shiftsEnabled); setMultiple(props.multipleShiftsEnabled ?? false); setTickets(props.barcodeTicketsEnabled); }, [props.shiftsEnabled, props.multipleShiftsEnabled, props.barcodeTicketsEnabled]);
  const changed = shifts !== props.shiftsEnabled || multiple !== (props.multipleShiftsEnabled ?? false) || tickets !== props.barcodeTicketsEnabled;
  return <div className="space-y-5">
    <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={event => {
      event.preventDefault(); startTransition(async () => {
        const result = await updateTicketScheduleAction({ shiftsEnabled: shifts, multipleShiftsEnabled: shifts && multiple, barcodeTicketsEnabled: tickets });
        if (result.error) { toast.error(result.error.message); return; }
        toast.success('Configuración guardada'); router.refresh();
      });
    }}>
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-3"><Wallet className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="shifts-enabled" className="font-semibold">Activar turnos de caja</label><p className="mt-1 text-sm text-muted-foreground">Cada operador abre su turno para identificar sus cobros. El efectivo pertenece a la caja donde trabaja.</p><p className="mt-2 text-xs text-muted-foreground">Apagado, podés cobrar sin turno. El historial se conserva.</p></div><Switch id="shifts-enabled" checked={shifts} onCheckedChange={value => { setShifts(value); if (!value) setMultiple(false); }} disabled={pending} /></div>
        <div className={'rounded-xl border border-border bg-secondary/20 p-4 ' + (!shifts ? 'opacity-60' : '')}>
          <div className="flex items-start gap-3"><Users className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="multiple-shifts" className="font-semibold">Permitir turnos múltiples</label><p className="mt-1 text-sm text-muted-foreground">Para estacionamientos con más de una entrada o varios operadores trabajando al mismo tiempo, incluso en una misma caja.</p></div><Switch id="multiple-shifts" checked={multiple} onCheckedChange={setMultiple} disabled={pending || !shifts} /></div>
          <p className="mt-3 text-xs text-muted-foreground">{!shifts ? 'Primero activá Turnos de caja.' : multiple ? 'Cada usuario elige su caja. Puede unirse a una caja abierta o abrir otra.' : 'Modo simple: una sola caja y un operador a la vez. El siguiente recibe el fondo que dejó el anterior.'}</p>
        </div>
        {shifts && <div className="space-y-3 rounded-xl border border-gm-yellow/25 bg-gm-yellow/5 p-4 text-sm">
          <h3 className="font-semibold">Elegí el modo según cómo manejan el dinero</h3>
          <div className="grid gap-3 md:grid-cols-3"><Example title="Una caja, relevos" text="Dejá turnos múltiples apagado. Cuando uno cierra, el siguiente recibe el último saldo de esa caja." /><Example title="Varias entradas, distintos cajones" text="Activá turnos múltiples y agregá una caja por cada cajón. Cada caja tiene su fondo y arqueo." /><Example title="Dos personas, un mismo cajón" text="Activá turnos múltiples y usen la misma caja. Cada uno tiene su turno; el último cuenta el efectivo de todos." /></div>
          <p className="border-t border-gm-yellow/20 pt-3 text-xs text-muted-foreground">Para cambiar de modo o desactivar turnos, primero cerrá todos los turnos abiertos.</p>
        </div>}
        <div className="flex items-start gap-3 border-t border-border pt-6"><Barcode className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="tickets-enabled" className="font-semibold">Tickets por código de barras</label><p className="mt-1 text-sm text-muted-foreground">Habilita el lector y las tarjetas físicas. Apagado, trabajás con patentes y tickets por día, semana o mes.</p><p className="mt-2 text-xs text-muted-foreground">Registrá las salidas de las tarjetas en uso antes de apagarlo.</p></div><Switch id="tickets-enabled" checked={tickets} onCheckedChange={setTickets} disabled={pending} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/30 p-4"><p className="text-xs text-muted-foreground">{changed ? 'Tenés cambios sin guardar.' : 'La configuración está guardada.'}</p><Button disabled={pending || !changed}>{pending ? 'Guardando…' : 'Guardar configuración'}</Button></div>
    </form>
    {shifts && <CajasSettings multiple={multiple} />}
  </div>;
}
function Example({ title, text }: { title: string; text: string }) {
  return <div className="min-w-0"><p className="font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>;
}
function CajasSettings({ multiple }: { multiple: boolean }) {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();
  const load = async () => { const result = await getCashConfigurationAction(); setCajas(result.configuration?.cajas ?? []); setError(result.error ?? ''); setLoading(false); };
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div><h2 className="text-lg font-semibold">Cajas físicas</h2><p className="mt-1 text-sm text-muted-foreground">Una caja por cada cajón de efectivo. Si dos puertas o dos personas comparten el mismo cajón, usan la misma caja.</p></div>
    {loading ? <DataLoading label="Cargando cajas…" /> : error ? <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" type="button" onClick={() => { setLoading(true); void load(); }}>Reintentar</Button></div> : <>
      <div className="space-y-3">{cajas.filter(c => multiple || c.principal).map(caja => <CajaRow key={caja.id} caja={caja} onUpdated={load} />)}</div>
      {multiple ? <form className="flex flex-wrap items-end gap-3 border-t border-border pt-4" onSubmit={event => { event.preventDefault(); startTransition(async () => { const result = await saveCajaAction({ nombre: name }); if (result.error) { toast.error(result.error); return; } setName(''); await load(); toast.success('Caja agregada'); }); }}>
        <div className="min-w-0 w-full flex-none space-y-1.5 sm:w-auto sm:flex-1"><Label htmlFor="new-caja">Agregar otra caja</Label><Input id="new-caja" placeholder="Ej.: Entrada lateral" maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={pending} required /></div><Button disabled={pending || !name.trim()}><Plus className="size-4" /> Agregar caja</Button>
      </form> : <p className="text-xs text-muted-foreground">Se selecciona la caja principal automáticamente. Activá turnos múltiples para usar más cajas.</p>}
      <div className="border-l-2 border-gm-yellow pl-3 text-sm"><p className="font-semibold">Después de guardar</p><p className="mt-1 text-muted-foreground">En Tickets → Abrir mi turno, el primero cuenta el fondo. Quien se suma a una caja abierta no vuelve a cargar ese dinero. El último que sale cuenta y cierra la caja.</p></div>
    </>}
  </section>;
}
function CajaRow({ caja, onUpdated }: { caja: Caja; onUpdated: () => Promise<void> }) {
  const [name, setName] = useState(caja.nombre);
  const [pending, startTransition] = useTransition();
  useEffect(() => setName(caja.nombre), [caja.nombre]);
  const save = (activa = caja.activa) => startTransition(async () => { const result = await saveCajaAction({ nombre: name, activa }, caja.id); if (result.error) { toast.error(result.error); return; } await onUpdated(); toast.success('Caja actualizada'); });
  return <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3" onSubmit={e => { e.preventDefault(); save(); }}>
    <div className="min-w-0 w-full flex-none space-y-1.5 sm:w-auto sm:flex-1"><Label htmlFor={'caja-' + caja.id}>{caja.principal ? 'Caja principal · disponible en modo simple' : 'Nombre de la caja'}</Label><Input id={'caja-' + caja.id} value={name} maxLength={80} onChange={e => setName(e.target.value)} disabled={pending} required /></div>
    <Button size="sm" variant="outline" disabled={pending || !name.trim() || name === caja.nombre}>Guardar nombre</Button>
    {!caja.principal && <Button type="button" variant="ghost" size="sm" onClick={() => save(!caja.activa)} disabled={pending}>{caja.activa ? 'Desactivar' : 'Activar'}</Button>}
    {!caja.activa && <span className="text-xs text-muted-foreground">Desactivada</span>}
  </form>;
}
