'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, Wallet, Users, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cargando, Hueso } from '@/components/esqueletos';
import { SetupSections, SetupStepHeading, SetupStepper, Step } from '@/components/setup-stepper/setup-stepper';
import { toast } from '@/lib/toast';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { getCashConfigurationAction, saveCajaAction } from '@/actions/turnos/cajas.action';
import { Caja } from '@/types/turno.type';
import { EVENTO_PASO_TERMINADO } from '@/types/configuracion-inicial.type';

type ScheduleChange = Parameters<typeof updateTicketScheduleAction>[0];

// Turnos de caja en 4 pasos. Sólo activar es obligatorio: modo, cajas y sueldo se pueden dejar como
// están. Cada paso guarda lo suyo al continuar, así un cambio no queda esperando al final. Con los
// turnos ya activos al abrir no hay recorrido: las cuatro partes a la vista, cada una con su guardar.
export function OperationSettings(props: { shiftsEnabled: boolean; multipleShiftsEnabled?: boolean; sueldoAutomatico?: boolean; sueldosPorUsuario?: { usuarioId: string; importe: number }[]; enConfiguracionInicial?: boolean }) {
  const [salaryEnabled, setSalaryEnabled] = useState(props.sueldoAutomatico ?? false);
  const [salaries, setSalaries] = useState<Record<string, string>>(() => Object.fromEntries((props.sueldosPorUsuario ?? []).map(s => [s.usuarioId, String(s.importe)])));
  const [salaryUsers, setSalaryUsers] = useState<{ id: string; firstName: string; lastName: string; username: string }[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(true);
  const [salaryError, setSalaryError] = useState('');
  const [shifts, setShifts] = useState(props.shiftsEnabled);
  const [savedShifts, setSavedShifts] = useState(props.shiftsEnabled);
  const [multiple, setMultiple] = useState(props.multipleShiftsEnabled ?? false);
  const [savedMultiple, setSavedMultiple] = useState(props.multipleShiftsEnabled ?? false);
  const [step, setStep] = useState(1);
  const [editando] = useState(props.shiftsEnabled);
  // Pasos ya recorridos. Si los turnos estaban activos al abrir, modo, cajas y sueldo ya tienen un
  // valor elegido y cuentan como listos; si se activan ahora, cada uno queda listo recién al pasarlo.
  const [vistos, setVistos] = useState<number[]>(() => props.shiftsEnabled ? [1, 2, 3, 4] : []);
  useEffect(() => { setVistos(previos => previos.includes(step) ? previos : [...previos, step]); }, [step]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // Lo guardado vuelve a mandar solo cuando cambia de verdad: un refresco de la página trae la misma lista
  // de sueldos como otro arreglo, y eso no puede borrar lo que se está tocando (por ejemplo, activar turnos).
  const sueldosGuardados = JSON.stringify(props.sueldosPorUsuario ?? []);
  useEffect(() => {
    setShifts(props.shiftsEnabled); setSavedShifts(props.shiftsEnabled);
    setMultiple(props.multipleShiftsEnabled ?? false); setSavedMultiple(props.multipleShiftsEnabled ?? false);
    setSalaryEnabled(props.sueldoAutomatico ?? false);
    setSalaries(Object.fromEntries((JSON.parse(sueldosGuardados) as { usuarioId: string; importe: number }[]).map(s => [s.usuarioId, String(s.importe)])));
  }, [props.shiftsEnabled, props.multipleShiftsEnabled, props.sueldoAutomatico, sueldosGuardados]);
  const loadSalaryUsers = async () => {
    setSalaryLoading(true);
    const result = await getCashConfigurationAction();
    setSalaryUsers(result.configuration?.usuarios ?? []);
    setSalaryError(result.error ?? (result.configuration?.usuarios ? '' : 'No se pudieron cargar los usuarios.'));
    setSalaryLoading(false);
  };
  useEffect(() => { void loadSalaryUsers(); }, []);
  const selectedSalaries = salaryUsers.filter(u => salaries[u.id] !== undefined).map(u => ({ usuarioId: u.id, importe: Number(salaries[u.id]) }));
  const originalSalaries = (props.sueldosPorUsuario ?? []).filter(s => salaryUsers.some(u => u.id === s.usuarioId));
  const salaryChanged = salaryEnabled !== (props.sueldoAutomatico ?? false) || selectedSalaries.length !== originalSalaries.length || selectedSalaries.some(s => !originalSalaries.some(o => o.usuarioId === s.usuarioId && o.importe === s.importe));
  const salaryValid = !salaryLoading && !salaryError && selectedSalaries.every(s => Number.isInteger(s.importe) && s.importe >= 1 && s.importe <= 100000000);
  const save = (change: ScheduleChange, done: () => void, message = 'Configuración guardada') => startTransition(async () => {
    const result = await updateTicketScheduleAction(change);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(message); done(); router.refresh();
  });
  // Paso 1 apagado: si estaban activos, el botón los desactiva y se queda acá; si nunca se
  // activaron, no hay a dónde seguir.
  const turningOff = !shifts && savedShifts;
  const next = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (step === 1) {
      if (turningOff) { event.preventDefault(); save({ shiftsEnabled: false, multipleShiftsEnabled: false }, () => { setSavedShifts(false); setMultiple(false); setSavedMultiple(false); }, 'Turnos de caja desactivados'); return; }
      if (shifts !== savedShifts) { event.preventDefault(); save({ shiftsEnabled: true }, () => { setSavedShifts(true); setStep(2); }, 'Turnos de caja activados'); }
      return;
    }
    if (step === 2 && multiple !== savedMultiple) { event.preventDefault(); save({ multipleShiftsEnabled: multiple }, () => { setSavedMultiple(multiple); setStep(3); }); }
  };
  const finish = () => {
    if (!salaryChanged) {
      if (props.enConfiguracionInicial) window.dispatchEvent(new Event(EVENTO_PASO_TERMINADO));
      else router.push('/admin/configuracion');
      return;
    }
    if (!salaryValid) return;
    save({ sueldoAutomatico: salaryEnabled, sueldosPorUsuario: selectedSalaries }, () => undefined);
  };
  const sections = editando && savedShifts;
  const guardarAca = (texto: string, onClick: () => void, deshabilitado = false) => <div className="flex justify-end"><Button type="button" onClick={onClick} disabled={pending || deshabilitado}>{pending ? 'Guardando…' : texto}</Button></div>;
  const steps = [
    <Step key="activar">
      <section className="space-y-4">
        {/* Una pregunta, como «¿Cómo trabajan con la caja?»: «Turnos de caja» repetía el título de
            la página justo encima, y «Activar…» repetía el interruptor de abajo. */}
        <SetupStepHeading number={1} total={4} title="¿Trabajan con turnos?">Cada operador abre su turno para identificar sus cobros. El efectivo pertenece a la caja donde trabaja.</SetupStepHeading>
        <div className="flex items-start gap-3 rounded-2xl border border-gm-line bg-gm-surface-2 p-4"><Wallet className="mt-0.5 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="shifts-enabled" className="font-semibold">Activar turnos de caja</label><p className="mt-1 text-sm text-muted-foreground">{shifts ? 'Si lo apagás, se puede cobrar sin turno. El historial se conserva.' : 'Apagado: se puede cobrar sin turno. El historial se conserva.'}</p></div><Switch id="shifts-enabled" checked={shifts} onCheckedChange={setShifts} disabled={pending} /></div>
        <p className="text-xs text-muted-foreground">{turningOff ? 'Para desactivarlos, primero cerrá todos los turnos abiertos.' : savedShifts ? (sections ? 'Los turnos están activos.' : 'Los turnos están activos. Seguí para revisar el modo, las cajas y el sueldo.') : shifts ? 'Continuá para activarlos y elegir cómo trabajan.' : 'Activalos para configurar el modo, las cajas y el sueldo.'}</p>
        {sections && turningOff && guardarAca('Desactivar turnos', () => save({ shiftsEnabled: false, multipleShiftsEnabled: false }, () => { setSavedShifts(false); setMultiple(false); setSavedMultiple(false); setStep(1); }, 'Turnos de caja desactivados'))}
      </section>
    </Step>,
    <Step key="modo">
      <section className="space-y-4">
        <SetupStepHeading number={2} total={4} title="¿Cómo trabajan con la caja?" optional>Elegí el modo según cómo manejan el dinero.</SetupStepHeading>
        <div className="rounded-2xl border border-gm-line bg-gm-surface-2 p-4">
          <div className="flex items-start gap-3"><Users className="mt-0.5 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="multiple-shifts" className="font-semibold">Permitir turnos múltiples</label><p className="mt-1 text-sm text-muted-foreground">Para estacionamientos con más de una entrada o varios operadores trabajando al mismo tiempo, incluso en una misma caja.</p></div><Switch id="multiple-shifts" checked={multiple} onCheckedChange={setMultiple} disabled={pending} /></div>
          <p className="mt-3 text-xs text-muted-foreground">{multiple ? 'Cada usuario elige su caja. Puede unirse a una caja abierta o abrir otra.' : 'Modo simple: una sola caja y un operador a la vez. El siguiente recibe el fondo que dejó el anterior.'}</p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-gm-yellow/25 bg-gm-yellow/5 p-4 text-sm md:grid-cols-3"><Example title="Una caja, relevos" text="Dejá turnos múltiples apagado. Cuando uno cierra, el siguiente recibe el último saldo de esa caja." /><Example title="Varias entradas, distintos cajones" text="Activá turnos múltiples y agregá una caja por cada cajón. Cada caja tiene su fondo y arqueo." /><Example title="Dos personas, un mismo cajón" text="Activá turnos múltiples y usen la misma caja. Cada uno tiene su turno; el último cuenta el efectivo de todos." /></div>
        <p className="text-xs text-muted-foreground">Para cambiar de modo, primero cerrá todos los turnos abiertos.</p>
        {sections && multiple !== savedMultiple && guardarAca('Guardar modo', () => save({ multipleShiftsEnabled: multiple }, () => setSavedMultiple(multiple)))}
      </section>
    </Step>,
    <Step key="cajas">
      <section className="space-y-4">
        <SetupStepHeading number={3} total={4} title="Cajas físicas" optional>Una caja por cada cajón de efectivo. Si dos puertas o dos personas comparten el mismo cajón, usan la misma caja.</SetupStepHeading>
        {savedShifts && <CajasSettings multiple={savedMultiple} />}
      </section>
    </Step>,
    <Step key="sueldo">
      <section className="space-y-4">
        <SetupStepHeading number={4} total={4} title="Sueldo por usuario" optional>Elegí quién retira sueldo y cuánto cobra por jornada. Los demás quedan sin retiro.</SetupStepHeading>
        <div className="space-y-3 rounded-2xl border border-gm-line bg-gm-surface-2 p-4">
          <div className="flex items-center justify-between gap-3"><Label htmlFor="salary-enabled">Retirar sueldo de la caja automáticamente</Label><Switch id="salary-enabled" checked={salaryEnabled} onCheckedChange={setSalaryEnabled} disabled={pending} /></div>
          {/* Filas separadas por una línea y no tarjetas dentro de la tarjeta. Debajo del nombre va el
              usuario: dos cuentas con el mismo nombre se veían iguales. */}
          {salaryLoading ? <Cargando texto="Cargando usuarios…" className="block divide-y divide-border">{[0, 1].map(i => <div key={i} className="space-y-2 py-3"><div className="flex items-center justify-between gap-3"><div className="space-y-1.5"><Hueso className="h-3.5 w-48" /><Hueso className="h-2.5 w-28" /></div><Hueso className="h-6 w-11 rounded-full" /></div><Hueso className="h-11 w-full rounded-md sm:h-10" /></div>)}</Cargando> : salaryError ? <div role="alert"><p>{salaryError}</p><Button variant="outline" onClick={() => void loadSalaryUsers()}>Reintentar</Button></div> : salaryEnabled && <div className="divide-y divide-gm-line border-t border-gm-line">{salaryUsers.map(u => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
            const enabled = salaries[u.id] !== undefined;
            return <div key={u.id} className="space-y-2 py-3">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><Label htmlFor={'salary-user-' + u.id}>Retira sueldo: {name}</Label>{u.username && <p className="mt-0.5 truncate text-xs text-muted-foreground">Usuario: {u.username}</p>}</div><Switch id={'salary-user-' + u.id} checked={enabled} disabled={pending} onCheckedChange={checked => setSalaries(current => { const next = { ...current }; if (checked) next[u.id] = ''; else delete next[u.id]; return next; })} /></div>
              {enabled ? <div className="space-y-2"><Label htmlFor={'salary-amount-' + u.id}>Importe por jornada: {name}</Label><Input id={'salary-amount-' + u.id} type="number" min={1} max={100000000} step={1} required value={salaries[u.id]} onChange={e => setSalaries(current => ({ ...current, [u.id]: e.target.value }))} disabled={pending} /></div> : <p className="text-xs text-muted-foreground">Sin retiro de sueldo.</p>}
            </div>;
          })}{salaryUsers.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios habilitados para esta playa.</p>}</div>}
        </div>
        <p className="text-xs text-muted-foreground">Se aplica al finalizar la jornada, una sola vez. A las 00:00 continúa en la nueva planilla sin retirar sueldo. Si al cerrar no alcanza con lo que queda en la caja, no se descuenta y queda una alerta. Los cambios de sueldo rigen para los turnos que se abran después de guardar.</p>
        {sections && salaryChanged && guardarAca('Guardar sueldo', () => save({ sueldoAutomatico: salaryEnabled, sueldosPorUsuario: selectedSalaries }, () => undefined), !salaryValid)}
      </section>
    </Step>,
  ];
  if (sections) return <SetupSections
    titles={['Activar', 'Modo', 'Cajas', 'Sueldo']}
    states={['Activos', savedMultiple ? 'Múltiples' : 'Simple', savedMultiple ? 'Varias cajas' : 'Caja principal', props.sueldoAutomatico && props.sueldosPorUsuario?.length ? 'Por usuario' : 'Sin retiro']}
    footer={props.enConfiguracionInicial && <div className="flex justify-end"><Button type="button" disabled={pending || salaryChanged} onClick={() => window.dispatchEvent(new Event(EVENTO_PASO_TERMINADO))}>Listo</Button></div>}
  >{steps}</SetupSections>;
  return <SetupStepper
    titles={['Activar', 'Modo', 'Cajas', 'Sueldo']}
    step={step}
    onStepChange={target => { if (savedShifts || target === 1) setStep(target); }}
    onComplete={finish}
    completeLabel={pending ? 'Guardando…' : salaryChanged ? 'Guardar' : 'Listo'}
    nextLabel={step === 1 && turningOff ? 'Desactivar turnos' : pending ? 'Guardando…' : 'Continuar'}
    disabled={pending}
    nextDisabled={(step === 1 && !shifts && !savedShifts) || (step === 4 && !salaryValid)}
    locked={number => !savedShifts && number > 1}
    // Con los turnos activos, un paso recorrido ya tiene un valor elegido (aunque sea «simple» o
    // «sin retiro»): no queda pendiente. Los que todavía no se vieron, sí.
    done={number => savedShifts && (number === 1 || vistos.includes(number))}
    stateLabel={(number, status) => status === 'active' ? undefined
      : number === 1 ? (savedShifts ? 'Activos' : 'Apagados')
        : !savedShifts ? 'Requiere turnos'
          : status === 'upcoming' ? undefined
          : number === 2 ? (savedMultiple ? 'Múltiples' : 'Simple')
            : number === 3 ? (savedMultiple ? 'Varias cajas' : 'Caja principal')
              : props.sueldoAutomatico && props.sueldosPorUsuario?.length ? 'Por usuario' : 'Sin retiro'}
    nextButtonProps={{ onClick: next }}
  >
{steps}</SetupStepper>;
}

// Tickets por código de barras: una opción aparte de los turnos, con su propio guardado.
export function BarcodeTicketsSetting({ enabled }: { enabled: boolean }) {
  const [tickets, setTickets] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { setTickets(enabled); }, [enabled]);
  return <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={event => {
    event.preventDefault(); startTransition(async () => {
      const result = await updateTicketScheduleAction({ barcodeTicketsEnabled: tickets });
      if (result.error) { toast.error(result.error.message); return; }
      toast.success('Configuración guardada'); router.refresh();
    });
  }}>
    <div className="flex items-start gap-3 p-5 sm:p-6"><Barcode className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="tickets-enabled" className="font-semibold">Tickets por código de barras</label><p className="mt-1 text-sm text-muted-foreground">Habilita el lector y las tarjetas físicas. Apagado, trabajás con patentes y tickets por día, semana o mes.</p><p className="mt-2 text-xs text-muted-foreground">Registrá las salidas de las tarjetas en uso antes de apagarlo.</p></div><Switch id="tickets-enabled" checked={tickets} onCheckedChange={setTickets} disabled={pending} /></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/30 p-4"><p className="text-xs text-muted-foreground">{tickets !== enabled ? 'Tenés cambios sin guardar.' : 'La configuración está guardada.'}</p><Button disabled={pending || tickets === enabled}>{pending ? 'Guardando…' : 'Guardar'}</Button></div>
  </form>;
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
  return <section aria-label="Cajas físicas" className="space-y-4">
    {loading ? <Cargando texto="Cargando cajas…" className="block space-y-3"><div className="space-y-3 rounded-xl border border-border p-3.5"><Hueso className="h-3 w-52" /><Hueso className="h-11 w-full rounded-md sm:h-10" /><Hueso className="h-3 w-40" /><div className="flex gap-3"><Hueso className="h-11 flex-1 rounded-md sm:h-10" /><Hueso className="h-11 w-28 rounded-md sm:h-10" /></div></div></Cargando> : error ? <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" type="button" onClick={() => { setLoading(true); void load(); }}>Reintentar</Button></div> : <>
      <div className="space-y-3">{cajas.filter(c => multiple || c.principal).map(caja => <CajaRow key={caja.id} caja={caja} onUpdated={load} />)}</div>
      {multiple ? <form className="flex flex-wrap items-end gap-3 border-t border-border pt-4" onSubmit={event => { event.preventDefault(); startTransition(async () => { const result = await saveCajaAction({ nombre: name }); if (result.error) { toast.error(result.error); return; } setName(''); await load(); toast.success('Caja agregada'); }); }}>
        <div className="min-w-0 w-full flex-none space-y-1.5 sm:w-auto sm:flex-1"><Label htmlFor="new-caja">Agregar otra caja</Label><Input id="new-caja" placeholder="Ej.: Entrada lateral" maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={pending} required /></div><Button disabled={pending || !name.trim()}><Plus className="size-4" /> Agregar caja</Button>
      </form> : <p className="text-xs text-muted-foreground">Se selecciona la caja principal automáticamente. Activá turnos múltiples para usar más cajas.</p>}
      <div className="rounded-xl border border-gm-yellow/25 bg-gm-yellow/[0.04] p-3 text-sm"><p className="font-semibold">Después de guardar</p><p className="mt-1 text-muted-foreground">En Entradas y salidas, con «Abrí tu turno para cobrar», el primero cuenta el fondo. Quien se suma a una caja abierta no vuelve a cargar ese dinero. El último que sale cuenta y cierra la caja.</p></div>
    </>}
  </section>;
}
function CajaRow({ caja, onUpdated }: { caja: Caja; onUpdated: () => Promise<void> }) {
  const [name, setName] = useState(caja.nombre);
  const [reserve, setReserve] = useState(String(caja.fondoObjetivo ?? 15000));
  const [pending, startTransition] = useTransition();
  useEffect(() => { setName(caja.nombre); setReserve(String(caja.fondoObjetivo ?? 15000)); }, [caja.nombre, caja.fondoObjetivo]);
  const save = (activa = caja.activa) => startTransition(async () => { const result = await saveCajaAction({ nombre: name, activa, fondoObjetivo: Number(reserve) }, caja.id); if (result.error) { toast.error(result.error); return; } await onUpdated(); toast.success('Caja actualizada'); });
  return <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3" onSubmit={e => { e.preventDefault(); save(); }}>
    <div className="min-w-0 w-full flex-none space-y-1.5 sm:w-auto sm:flex-1"><Label htmlFor={'caja-' + caja.id}>{caja.principal ? 'Caja principal · disponible en modo simple' : 'Nombre de la caja'}</Label><Input id={'caja-' + caja.id} value={name} maxLength={80} onChange={e => setName(e.target.value)} disabled={pending} required /></div>
    <div className="space-y-1.5"><Label htmlFor={'reserve-' + caja.id}>Fondo objetivo protegido</Label><Input id={'reserve-' + caja.id} type="number" min={0} max={100000000} step={1} required value={reserve} onChange={e => setReserve(e.target.value)} disabled={pending} /></div>
    <Button size="sm" variant="outline" disabled={pending || !name.trim() || (name === caja.nombre && Number(reserve) === (caja.fondoObjetivo ?? 15000))}>Guardar caja</Button>
    {!caja.principal && <Button type="button" variant="ghost" size="sm" onClick={() => save(!caja.activa)} disabled={pending}>{caja.activa ? 'Desactivar' : 'Activar'}</Button>}
    {!caja.activa && <span className="text-xs text-muted-foreground">Desactivada</span>}
  </form>;
}
