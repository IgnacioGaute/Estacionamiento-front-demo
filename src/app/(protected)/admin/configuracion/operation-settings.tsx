'use client';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, Plus, MoonStar, Lock, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmento } from '@/components/ui/segmento';
import { Cargando, Hueso } from '@/components/esqueletos';
import { SetupStepHeading, SetupStepper, Step } from '@/components/setup-stepper/setup-stepper';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { getCashConfigurationAction, saveCajaAction } from '@/actions/turnos/cajas.action';
import { Caja } from '@/types/turno.type';
import { EVENTO_PASO_TERMINADO } from '@/types/configuracion-inicial.type';

type ScheduleChange = Parameters<typeof updateTicketScheduleAction>[0];
type Usuario = { id: string; firstName: string; lastName: string; username: string };
type Sueldo = { usuarioId: string; importe: number };
type Fondo = 'SIN' | 'FIJO';
type EdicionCaja = { nombre: string; activa: boolean; fondo: Fondo; monto: string };

// Un fondo nunca configurado se propone en $15.000, como al abrir la caja por primera vez.
const FONDO_HABITUAL = 15000;
const MAXIMO = 100000000;
const soloDigitos = (valor: string) => valor.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
const conPuntos = (digitos: string) => digitos ? Number(digitos).toLocaleString('es-AR') : '';
const importeValido = (digitos: string) => /^\d+$/.test(digitos) && Number(digitos) >= 1 && Number(digitos) <= MAXIMO;
const pesos = (importe: number) => '$' + importe.toLocaleString('es-AR');
const desdeLista = (lista: Sueldo[]) => Object.fromEntries(lista.map(s => [s.usuarioId, String(s.importe)]));
// Fondo en $0 = sin fondo: no hay fondo sugerido y el sueldo solo exige que alcance el efectivo.
const fondoGuardado = (caja: Caja) => caja.fondoObjetivo ?? FONDO_HABITUAL;
const edicionInicial = (caja: Caja): EdicionCaja => ({ nombre: caja.nombre, activa: caja.activa, fondo: fondoGuardado(caja) > 0 ? 'FIJO' : 'SIN', monto: String(fondoGuardado(caja) || FONDO_HABITUAL) });
const fondoDe = (edicion: EdicionCaja) => edicion.fondo === 'FIJO' ? Number(edicion.monto || 0) : 0;
const cajaValida = (edicion: EdicionCaja) => !!edicion.nombre.trim() && (edicion.fondo === 'SIN' || importeValido(edicion.monto));
const nombreDe = (u: Usuario) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;

// Turnos de caja. La primera vez es un recorrido de 4 pasos (sólo activar es obligatorio) y cada paso
// guarda lo suyo al continuar. Con los turnos ya activos al abrir no hay recorrido: las cuatro partes
// a la vista y un solo «Guardar cambios» abajo. Cada pregunta se responde eligiendo una tarjeta, no
// con interruptores: «apagado» no decía qué pasaba y había que leer la explicación de abajo.
export function OperationSettings(props: { shiftsEnabled: boolean; multipleShiftsEnabled?: boolean; continuarTurnoMedianoche?: boolean; sueldoAutomatico?: boolean; sueldosPorUsuario?: Sueldo[]; enConfiguracionInicial?: boolean }) {
  const [salaryEnabled, setSalaryEnabled] = useState(props.sueldoAutomatico ?? false);
  // Importe por usuario, en dígitos. Vacío: esa persona no retira sueldo.
  const [salaries, setSalaries] = useState<Record<string, string>>(() => desdeLista(props.sueldosPorUsuario ?? []));
  const [savedSalary, setSavedSalary] = useState({ enabled: props.sueldoAutomatico ?? false, lista: props.sueldosPorUsuario ?? [] });
  const [shifts, setShifts] = useState(props.shiftsEnabled);
  const [savedShifts, setSavedShifts] = useState(props.shiftsEnabled);
  const [multiple, setMultiple] = useState(props.multipleShiftsEnabled ?? false);
  const [savedMultiple, setSavedMultiple] = useState(props.multipleShiftsEnabled ?? false);
  // A las 00:00 el turno sigue en la planilla nueva (por defecto) o se cierran turno y caja sin contar.
  const [medianoche, setMedianoche] = useState(props.continuarTurnoMedianoche ?? true);
  const [savedMedianoche, setSavedMedianoche] = useState(props.continuarTurnoMedianoche ?? true);
  // Cajas y usuarios llegan juntos. Las ediciones de cada caja quedan aparte, por id: agregar una caja
  // recarga la lista sin perder lo que se estaba cambiando en las otras.
  const [config, setConfig] = useState<{ cajas: Caja[]; usuarios: Usuario[] | null; hayTurnosAbiertos: boolean } | null>(null);
  const [configError, setConfigError] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [cajaEdits, setCajaEdits] = useState<Record<string, EdicionCaja>>({});
  const [nuevaCaja, setNuevaCaja] = useState('');
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
    const lista = JSON.parse(sueldosGuardados) as Sueldo[];
    setShifts(props.shiftsEnabled); setSavedShifts(props.shiftsEnabled);
    setMultiple(props.multipleShiftsEnabled ?? false); setSavedMultiple(props.multipleShiftsEnabled ?? false);
    setMedianoche(props.continuarTurnoMedianoche ?? true); setSavedMedianoche(props.continuarTurnoMedianoche ?? true);
    setSalaryEnabled(props.sueldoAutomatico ?? false);
    setSalaries(desdeLista(lista));
    setSavedSalary({ enabled: props.sueldoAutomatico ?? false, lista });
  }, [props.shiftsEnabled, props.multipleShiftsEnabled, props.continuarTurnoMedianoche, props.sueldoAutomatico, sueldosGuardados]);
  const cargar = async () => {
    setConfigLoading(true);
    const result = await getCashConfigurationAction();
    if (result.configuration) setConfig({ cajas: result.configuration.cajas ?? [], usuarios: result.configuration.usuarios ?? null, hayTurnosAbiertos: !!result.configuration.hayTurnosAbiertos });
    setConfigError(result.error ?? '');
    setConfigLoading(false);
  };
  useEffect(() => { void cargar(); }, []);

  const usuarios = config?.usuarios ?? [];
  const usuariosError = configError || (config && !config.usuarios ? 'No se pudieron cargar los usuarios.' : '');
  const selectedSalaries = usuarios.filter(u => salaries[u.id]).map(u => ({ usuarioId: u.id, importe: Number(salaries[u.id]) }));
  const originalSalaries = savedSalary.lista.filter(s => usuarios.some(u => u.id === s.usuarioId));
  const salaryChanged = salaryEnabled !== savedSalary.enabled || selectedSalaries.length !== originalSalaries.length || selectedSalaries.some(s => !originalSalaries.some(o => o.usuarioId === s.usuarioId && o.importe === s.importe));
  const salaryValid = !configLoading && !usuariosError && usuarios.every(u => !salaries[u.id] || importeValido(salaries[u.id]));

  // Las cajas que se ven dependen de lo elegido: con una persona a la vez, solo la principal.
  const cajasVisibles = (config?.cajas ?? []).filter(c => multiple || c.principal);
  const edicionDe = (caja: Caja) => cajaEdits[caja.id] ?? edicionInicial(caja);
  // Pasar a «Dejar fondo» ya es un cambio, aunque el importe escrito todavía no sea válido.
  const cajaCambiada = (caja: Caja) => { const e = edicionDe(caja); return e.nombre.trim() !== caja.nombre || e.activa !== caja.activa || e.fondo !== edicionInicial(caja).fondo || fondoDe(e) !== fondoGuardado(caja); };
  const cajasCambiadas = cajasVisibles.filter(cajaCambiada);
  const cajasValidas = cajasCambiadas.every(c => cajaValida(edicionDe(c)));
  const editarCaja = (caja: Caja, cambio: Partial<EdicionCaja>) => setCajaEdits(actual => ({ ...actual, [caja.id]: { ...(actual[caja.id] ?? edicionInicial(caja)), ...cambio } }));
  // Cambiar de modo exige no tener turnos abiertos (el backend lo vuelve a comprobar al guardar).
  const modoBloqueado = !!config?.hayTurnosAbiertos;

  const save = (change: ScheduleChange, done: () => void, message = 'Configuración guardada') => startTransition(async () => {
    const result = await updateTicketScheduleAction(change);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(message); done(); router.refresh();
  });
  // Guarda una por una las cajas cambiadas; si una falla se detiene y las que faltan siguen marcadas.
  const guardarCajas = async () => {
    for (const caja of cajasCambiadas) {
      const e = edicionDe(caja);
      const result = await saveCajaAction({ nombre: e.nombre.trim(), activa: e.activa, fondoObjetivo: fondoDe(e) }, caja.id);
      if (result.error) { toast.error(result.error); await cargar(); return false; }
      setCajaEdits(actual => { const resto = { ...actual }; delete resto[caja.id]; return resto; });
    }
    await cargar();
    return true;
  };
  const agregarCaja = () => startTransition(async () => {
    const result = await saveCajaAction({ nombre: nuevaCaja });
    if (result.error) { toast.error(result.error); return; }
    setNuevaCaja(''); await cargar(); toast.success('Caja agregada');
  });
  // Paso 1 en «Sin turnos»: si estaban activos, el botón los desactiva y se queda acá; si nunca se
  // activaron, no hay a dónde seguir.
  const turningOff = !shifts && savedShifts;
  const desactivar = (done: () => void = () => undefined) => save({ shiftsEnabled: false, multipleShiftsEnabled: false }, () => { setSavedShifts(false); setMultiple(false); setSavedMultiple(false); done(); }, 'Turnos de caja desactivados');
  // Modo y medianoche viajan solo si cambiaron: cambiar el modo exige no tener turnos abiertos y la
  // medianoche se puede cambiar en cualquier momento.
  const modoCambiado = multiple !== savedMultiple || medianoche !== savedMedianoche;
  const cambioModo = (): ScheduleChange => ({ ...(multiple !== savedMultiple ? { multipleShiftsEnabled: multiple } : {}), ...(medianoche !== savedMedianoche ? { continuarTurnoMedianoche: medianoche } : {}) });
  const next = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (step === 1) {
      if (turningOff) { event.preventDefault(); desactivar(); return; }
      if (shifts !== savedShifts) { event.preventDefault(); save({ shiftsEnabled: true }, () => { setSavedShifts(true); setStep(2); }, 'Turnos de caja activados'); }
      return;
    }
    if (step === 2 && modoCambiado) { event.preventDefault(); save(cambioModo(), () => { setSavedMultiple(multiple); setSavedMedianoche(medianoche); setStep(3); }); return; }
    if (step === 3 && cajasCambiadas.length) { event.preventDefault(); startTransition(async () => { if (await guardarCajas()) { toast.success('Cajas guardadas'); setStep(4); } }); }
  };
  const finish = () => {
    if (!salaryChanged) {
      if (props.enConfiguracionInicial) window.dispatchEvent(new Event(EVENTO_PASO_TERMINADO));
      else router.push('/admin/configuracion');
      return;
    }
    if (!salaryValid) return;
    save({ sueldoAutomatico: salaryEnabled, sueldosPorUsuario: selectedSalaries }, () => setSavedSalary({ enabled: salaryEnabled, lista: selectedSalaries }));
  };

  // Editando: todo se guarda junto. Primero la configuración (modo, medianoche y sueldo en una sola
  // operación del backend) y después las cajas cambiadas.
  const sections = editando && savedShifts;
  const hayCambios = turningOff || modoCambiado || salaryChanged || cajasCambiadas.length > 0;
  const motivoBloqueo = turningOff ? '' : multiple !== savedMultiple && modoBloqueado ? 'Para cambiar cuántas personas cobran, primero cerrá todos los turnos abiertos.'
    : salaryChanged && !salaryValid ? (usuariosError ? 'Reintentá cargar los usuarios para guardar el sueldo.' : 'Revisá los importes de sueldo.')
      : !cajasValidas ? 'Revisá el nombre y el fondo de las cajas.' : '';
  const guardarTodo = () => startTransition(async () => {
    if (turningOff) {
      const result = await updateTicketScheduleAction({ shiftsEnabled: false, multipleShiftsEnabled: false });
      if (result.error) { toast.error(result.error.message); return; }
      setSavedShifts(false); setMultiple(false); setSavedMultiple(false); setStep(1);
      toast.success('Turnos de caja desactivados'); router.refresh(); return;
    }
    const cambio: ScheduleChange = { ...cambioModo(), ...(salaryChanged ? { sueldoAutomatico: salaryEnabled, sueldosPorUsuario: selectedSalaries } : {}) };
    if (Object.keys(cambio).length) {
      const result = await updateTicketScheduleAction(cambio);
      if (result.error) { toast.error(result.error.message); return; }
      setSavedMultiple(multiple); setSavedMedianoche(medianoche);
      if (salaryChanged) setSavedSalary({ enabled: salaryEnabled, lista: selectedSalaries });
    }
    if (cajasCambiadas.length && !(await guardarCajas())) { router.refresh(); return; }
    toast.success('Cambios guardados'); router.refresh();
  });
  const descartar = () => {
    setShifts(savedShifts); setMultiple(savedMultiple); setMedianoche(savedMedianoche);
    setSalaryEnabled(savedSalary.enabled); setSalaries(desdeLista(savedSalary.lista)); setCajaEdits({});
  };

  const encabezado = (numero: number, titulo: string, texto: string, optional = false) => sections
    ? <div className="flex items-baseline gap-3.5"><span aria-hidden className="gm-mono text-[13px] text-gm-yellow">{String(numero).padStart(2, '0')}</span><div className="min-w-0"><h3 className="text-lg font-semibold">{titulo}</h3><p className="mt-1 text-sm text-muted-foreground">{texto}</p></div></div>
    : <SetupStepHeading number={numero} total={4} title={titulo} optional={optional}>{texto}</SetupStepHeading>;
  const reintentar = <Button variant="outline" type="button" onClick={() => void cargar()} disabled={configLoading}>Reintentar</Button>;

  const seccionActivar = <section className="space-y-4">
    {encabezado(1, '¿Trabajan con turnos?', 'Con turnos, cada cobro queda a nombre de quien lo hizo y el efectivo pertenece a la caja donde trabaja.')}
    <Opciones label="¿Trabajan con turnos?" value={shifts ? 'SI' : 'NO'} onChange={v => setShifts(v === 'SI')} disabled={pending} opciones={[
      { value: 'SI', titulo: 'Sí, con turnos', texto: 'Cada operador abre su turno para cobrar y lo cierra contando la caja.' },
      { value: 'NO', titulo: 'No, sin turnos', texto: 'Se cobra sin abrir turno. El historial que ya existe se conserva.' },
    ]} />
    {turningOff
      ? <p className="flex items-center gap-2 text-sm text-gm-atencion"><AlertTriangle aria-hidden className="size-4 shrink-0" />Para desactivarlos, primero cerrá todos los turnos abiertos.</p>
      : !sections && <p className="text-xs text-muted-foreground">{savedShifts ? 'Los turnos están activos. Seguí para revisar el modo, las cajas y el sueldo.' : shifts ? 'Continuá para activarlos y elegir cómo trabajan.' : 'Activalos para configurar el modo, las cajas y el sueldo.'}</p>}
  </section>;

  const seccionModo = <section className="space-y-4">
    {encabezado(2, '¿Cuántas personas cobran a la vez?', 'Elegí según cómo manejan el dinero en el mostrador.', true)}
    <Opciones label="¿Cuántas personas cobran a la vez?" value={multiple ? 'VARIAS' : 'UNA'} onChange={v => setMultiple(v === 'VARIAS')} disabled={pending || modoBloqueado} opciones={[
      { value: 'UNA', titulo: 'Una persona a la vez', texto: 'Una sola caja que pasa de mano. Cuando uno cierra, el siguiente recibe el fondo que dejó.', dibujo: <DibujoRelevo /> },
      { value: 'VARIAS', titulo: 'Varias personas a la vez', texto: 'Cada uno abre su turno y elige caja: puede sumarse a una abierta o abrir otra.', dibujo: <DibujoVarias /> },
    ]} />
    {multiple && <div className="grid gap-3 rounded-2xl bg-gm-surface p-4 text-sm sm:grid-cols-2"><Example title="Varias entradas, distintos cajones" text="Una caja por cada cajón. Cada caja tiene su fondo y su arqueo." /><Example title="Dos personas, un mismo cajón" text="Usan la misma caja. Cada uno tiene su turno; el último cuenta el efectivo de todos." /></div>}
    {modoBloqueado && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock aria-hidden className="size-4 shrink-0" />Para cambiar esto, primero cerrá todos los turnos abiertos.</p>}
    <div className="space-y-3 pt-2">
      <h4 className="flex items-center gap-2 font-semibold"><MoonStar aria-hidden className="size-[18px] shrink-0 text-gm-yellow" />¿Qué pasa a las 00:00 con un turno abierto?</h4>
      <Opciones label="¿Qué pasa a las 00:00 con un turno abierto?" value={medianoche ? 'SIGUE' : 'CIERRA'} onChange={v => setMedianoche(v === 'SIGUE')} disabled={pending} opciones={[
        { value: 'SIGUE', titulo: 'Sigue trabajando', texto: 'Pasa a la planilla del día nuevo sin cerrar la caja ni contar.' },
        { value: 'CIERRA', titulo: 'Se cierra todo', texto: 'Turno y caja se cierran sin contar el efectivo y no se retira sueldo. El próximo abre su turno contando lo que hay.' },
      ]} />
    </div>
  </section>;

  const seccionCajas = <section className="space-y-4">
    {encabezado(3, 'Cajas', 'Una caja por cada cajón de efectivo. Si dos puertas o dos personas comparten el cajón, usan la misma caja.', true)}
    {!config && configLoading ? <Cargando texto="Cargando cajas…" className="block"><div className="space-y-3 rounded-2xl border border-gm-line p-4"><Hueso className="h-3 w-32" /><Hueso className="h-11 w-full rounded-md sm:h-10" /><Hueso className="h-3 w-52" /></div></Cargando>
      : configError ? <div role="alert" className="space-y-2 text-sm"><p>{configError}</p>{reintentar}</div>
        : config && <>
          <ul aria-label="Cajas" className="divide-y divide-gm-line rounded-2xl border border-gm-line bg-gm-surface">
            {cajasVisibles.map(caja => <FilaCaja key={caja.id} caja={caja} edicion={edicionDe(caja)} onChange={cambio => editarCaja(caja, cambio)} disabled={pending} />)}
          </ul>
          {multiple
            ? <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); agregarCaja(); }}>
              <div className="min-w-0 flex-[1_1_15rem] space-y-1.5"><Label htmlFor="new-caja" className="font-normal text-muted-foreground">Agregar otra caja</Label><Input id="new-caja" placeholder="Ej.: Entrada lateral" maxLength={80} value={nuevaCaja} onChange={e => setNuevaCaja(e.target.value)} disabled={pending} required /></div>
              <Button variant="outline" className="h-11 sm:h-10" disabled={pending || !nuevaCaja.trim()}><Plus className="size-4" /> Agregar caja</Button>
            </form>
            : <p className="text-sm text-muted-foreground">Con una persona a la vez se usa solo la caja principal. Elegí «Varias personas a la vez» para sumar cajas.</p>}
          {!sections && <div className="rounded-xl border border-gm-yellow/25 bg-gm-yellow/[0.04] p-3 text-sm"><p className="font-semibold">Después de guardar</p><p className="mt-1 text-muted-foreground">En Entradas y salidas, con «Abrí tu turno para cobrar», el primero cuenta el fondo. Quien se suma a una caja abierta no vuelve a cargar ese dinero. El último que sale cuenta y cierra la caja.</p></div>}
        </>}
  </section>;

  const seccionSueldo = <section className="space-y-4">
    {encabezado(4, '¿Se retira sueldo de la caja?', 'Se descuenta al terminar la jornada, una sola vez, a quien tenga importe cargado.', true)}
    <Opciones label="¿Se retira sueldo de la caja?" value={salaryEnabled ? 'SI' : 'NO'} onChange={v => setSalaryEnabled(v === 'SI')} disabled={pending} opciones={[
      { value: 'NO', titulo: 'No se retira', texto: 'El sueldo se paga por fuera de la caja.' },
      { value: 'SI', titulo: 'Sí, al terminar la jornada', texto: 'Cada uno retira su importe por jornada de la caja donde trabajó.' },
    ]} />
    {salaryEnabled && (!config && configLoading
      ? <Cargando texto="Cargando usuarios…" className="block"><div className="divide-y divide-gm-line rounded-2xl border border-gm-line">{[0, 1].map(i => <div key={i} className="flex items-center justify-between gap-3 p-4"><div className="space-y-1.5"><Hueso className="h-3.5 w-40" /><Hueso className="h-2.5 w-28" /></div><Hueso className="h-11 w-40 rounded-md sm:h-10" /></div>)}</div></Cargando>
      : usuariosError ? <div role="alert" className="space-y-2 text-sm"><p>{usuariosError}</p>{reintentar}</div>
        : <div className="space-y-2">
          {usuarios.length > 0
            ? <ul aria-label="Sueldo por usuario" className="divide-y divide-gm-line rounded-2xl border border-gm-line bg-gm-surface">{usuarios.map(u => {
              const nombre = nombreDe(u);
              const importe = salaries[u.id] ?? '';
              const invalido = !!importe && !importeValido(importe);
              return <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-[1_1_12rem]">
                  <Label htmlFor={'sueldo-' + u.id} className="font-semibold">{nombre}</Label>
                  <p id={'sueldo-estado-' + u.id} className={cn('mt-0.5 truncate text-xs', invalido ? 'text-destructive' : 'text-muted-foreground')}>{u.username ? `Usuario: ${u.username} · ` : ''}{invalido ? 'Ingresá $1 o más' : importe ? `Retira ${pesos(Number(importe))} por jornada` : 'No retira sueldo'}</p>
                </div>
                <div className="w-full sm:w-56"><CampoPesos id={'sueldo-' + u.id} aria-label={'Sueldo por jornada: ' + nombre} aria-describedby={'sueldo-estado-' + u.id} placeholder="Sin sueldo" value={importe} invalid={invalido} disabled={pending} onChange={valor => setSalaries(actual => ({ ...actual, [u.id]: valor }))} /></div>
              </li>;
            })}</ul>
            : <p className="text-sm text-muted-foreground">No hay usuarios habilitados para esta playa.</p>}
          <p className="text-xs text-muted-foreground">Importe por jornada; vacío, esa persona no retira. A las 00:00 continúa en la nueva planilla sin retirar sueldo. Si al cerrar no alcanza con lo que queda en la caja, no se descuenta y queda una alerta. Los cambios rigen para los turnos que se abran después de guardar.</p>
        </div>)}
  </section>;

  if (sections) {
    const cajasActivas = (config?.cajas ?? []).filter(c => c.activa && (savedMultiple || c.principal)).length;
    const conSueldo = savedSalary.enabled ? savedSalary.lista.length : 0;
    const resumen: [string, string][] = [
      ['Turnos', 'Activos'],
      ['Cobran', savedMultiple ? 'Varias personas a la vez' : 'Una persona a la vez'],
      ['A las 00:00', savedMedianoche ? 'Sigue trabajando' : 'Se cierra todo'],
      ...(config ? [['Cajas', cajasActivas === 1 ? '1 caja' : `${cajasActivas} cajas`] as [string, string]] : []),
      ['Sueldo', conSueldo ? (conSueldo === 1 ? '1 persona' : `${conSueldo} personas`) : 'Sin retiro'],
    ];
    return <div className="space-y-8">
      <dl aria-label="Así trabaja tu playa" className="flex flex-wrap gap-2">
        {resumen.map(([etiqueta, valor]) => <div key={etiqueta} className="flex items-center gap-2 rounded-full border border-gm-line bg-gm-surface-2 px-3 py-1.5 text-[13px]"><dt className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{etiqueta}</dt><dd className="font-semibold">{valor}</dd></div>)}
      </dl>
      {seccionActivar}
      {shifts
        ? <>
          <div className="border-t border-gm-line pt-8">{seccionModo}</div>
          <div className="border-t border-gm-line pt-8">{seccionCajas}</div>
          <div className="border-t border-gm-line pt-8">{seccionSueldo}</div>
        </>
        : <p className="rounded-2xl border border-dashed border-gm-line-strong p-4 text-sm text-muted-foreground">Con turnos vas a poder elegir cuántas personas cobran a la vez, qué pasa a las 00:00, las cajas y el sueldo.</p>}
      <div className={cn('flex flex-wrap items-center gap-3 rounded-[22px] border border-gm-line bg-gm-surface/95 p-4 backdrop-blur', hayCambios && 'sticky bottom-4 z-20 shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.8)]')}>
        <p role="status" className={cn('mr-auto flex items-center gap-2 text-sm', motivoBloqueo ? 'text-destructive' : hayCambios ? 'text-gm-atencion' : 'text-muted-foreground')}>
          <span aria-hidden className={cn('size-2 shrink-0 rounded-full', hayCambios ? 'bg-gm-atencion' : 'bg-gm-ok')} />
          {motivoBloqueo || (hayCambios ? 'Tenés cambios sin guardar' : 'Todo guardado')}
        </p>
        {/* En el celular los botones van debajo, a todo el ancho; el principal, a la derecha. */}
        <div className="flex w-full gap-2 sm:w-auto">
          {hayCambios && <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={descartar} disabled={pending}>Descartar</Button>}
          {hayCambios || !props.enConfiguracionInicial
            ? <Button type="button" className="h-11 flex-1 px-6 sm:flex-none" onClick={guardarTodo} disabled={pending || !hayCambios || !!motivoBloqueo}>{pending ? 'Guardando…' : turningOff ? 'Desactivar turnos' : 'Guardar cambios'}</Button>
            : <Button type="button" className="h-11 flex-1 px-6 sm:flex-none" onClick={() => window.dispatchEvent(new Event(EVENTO_PASO_TERMINADO))}>Listo</Button>}
        </div>
      </div>
    </div>;
  }

  const modoCorto = (varias: boolean) => varias ? 'Varias personas' : 'Una persona';
  return <SetupStepper
    titles={['Activar', 'Modo', 'Cajas', 'Sueldo']}
    step={step}
    onStepChange={target => { if (savedShifts || target === 1) setStep(target); }}
    onComplete={finish}
    completeLabel={pending ? 'Guardando…' : salaryChanged ? 'Guardar' : 'Listo'}
    nextLabel={step === 1 && turningOff ? 'Desactivar turnos' : pending ? 'Guardando…' : 'Continuar'}
    disabled={pending}
    nextDisabled={(step === 1 && !shifts && !savedShifts) || (step === 2 && multiple !== savedMultiple && modoBloqueado) || (step === 3 && !cajasValidas) || (step === 4 && !salaryValid)}
    locked={number => !savedShifts && number > 1}
    // Con los turnos activos, un paso recorrido ya tiene un valor elegido (aunque sea «una persona»
    // o «sin retiro»): no queda pendiente. Los que todavía no se vieron, sí.
    done={number => savedShifts && (number === 1 || vistos.includes(number))}
    stateLabel={(number, status) => status === 'active' ? undefined
      : number === 1 ? (savedShifts ? 'Activos' : 'Apagados')
        : !savedShifts ? 'Requiere turnos'
          : status === 'upcoming' ? undefined
            : number === 2 ? modoCorto(savedMultiple)
              : number === 3 ? (savedMultiple ? 'Varias cajas' : 'Caja principal')
                : savedSalary.enabled && savedSalary.lista.length ? 'Por usuario' : 'Sin retiro'}
    nextButtonProps={{ onClick: next }}
  >
    <Step key="activar">{seccionActivar}</Step>
    <Step key="modo">{seccionModo}</Step>
    <Step key="cajas">{seccionCajas}</Step>
    <Step key="sueldo">{seccionSueldo}</Step>
  </SetupStepper>;
}

// Una pregunta con sus respuestas como tarjetas: cada una dice qué pasa si se la elige.
function Opciones<T extends string>({ label, value, onChange, opciones, disabled }: { label: string; value: T; onChange: (value: T) => void; opciones: { value: T; titulo: string; texto: string; dibujo?: ReactNode }[]; disabled?: boolean }) {
  return <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2">
    {opciones.map(opcion => {
      const elegida = opcion.value === value;
      return <button key={opcion.value} type="button" role="radio" aria-checked={elegida} disabled={disabled} onClick={() => onChange(opcion.value)}
        className={cn('flex min-h-11 items-start gap-3.5 rounded-2xl border-[1.5px] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed',
          elegida ? 'border-gm-yellow bg-gm-yellow/[0.07]' : 'border-gm-line bg-gm-surface enabled:hover:border-gm-line-strong disabled:opacity-60')}>
        <span aria-hidden className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', elegida ? 'border-gm-yellow' : 'border-gm-line-strong')}>{elegida && <span className="size-2.5 rounded-full bg-gm-yellow" />}</span>
        <span className="min-w-0 flex-1">
          {opcion.dibujo}
          <span className="block font-semibold text-foreground">{opcion.titulo}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{opcion.texto}</span>
        </span>
      </button>;
    })}
  </div>;
}

// Importe en pesos con separador de miles; guarda solo los dígitos.
function CampoPesos({ value, onChange, invalid, ...input }: { id?: string; value: string; onChange: (digitos: string) => void; invalid?: boolean; placeholder?: string; disabled?: boolean; 'aria-label': string; 'aria-describedby'?: string }) {
  return <div className={cn('flex h-11 w-full min-w-0 items-center rounded-md border bg-background pl-3 focus-within:ring-2 focus-within:ring-gm-yellow sm:h-10', invalid ? 'border-destructive' : 'border-input')}>
    <span aria-hidden className="gm-mono text-muted-foreground">$</span>
    <input {...input} inputMode="numeric" autoComplete="off" aria-invalid={invalid || undefined} value={conPuntos(value)} onChange={e => onChange(soloDigitos(e.target.value))}
      className="gm-mono h-full min-w-0 flex-1 bg-transparent pl-1.5 pr-3 text-[15px] outline-none placeholder:font-sans placeholder:text-muted-foreground disabled:opacity-60" />
  </div>;
}

// Una caja: nombre, el fondo que se deja para el próximo turno y, si no es la principal, desactivarla.
function FilaCaja({ caja, edicion, onChange, disabled }: { caja: Caja; edicion: EdicionCaja; onChange: (cambio: Partial<EdicionCaja>) => void; disabled: boolean }) {
  const fijo = edicion.fondo === 'FIJO';
  const montoInvalido = fijo && !importeValido(edicion.monto);
  const nombre = edicion.nombre.trim() || caja.nombre;
  return <li className="flex flex-wrap items-end gap-x-5 gap-y-3 p-4">
    <div className={cn('min-w-0 flex-[1_1_13rem] space-y-1.5', !edicion.activa && 'opacity-60')}>
      <Label htmlFor={'caja-' + caja.id} className="flex items-center gap-2 font-normal text-muted-foreground">
        Nombre
        {caja.principal && <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gm-yellow">Principal</span>}
        {!edicion.activa && <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Desactivada</span>}
      </Label>
      <Input id={'caja-' + caja.id} value={edicion.nombre} maxLength={80} onChange={e => onChange({ nombre: e.target.value })} disabled={disabled} required aria-invalid={!edicion.nombre.trim() || undefined} />
    </div>
    <div className={cn('min-w-0 flex-[1_1_19rem] space-y-1.5', !edicion.activa && 'opacity-60')}>
      <p className="text-sm text-muted-foreground">Fondo que queda en la caja</p>
      <div className="flex items-center gap-2">
        <Segmento size="sm" aria-label={'Fondo de ' + nombre} value={edicion.fondo} disabled={disabled} className="shrink-0"
          items={[{ value: 'SIN', label: 'Sin fondo' }, { value: 'FIJO', label: 'Dejar fondo' }]}
          onChange={valor => onChange(valor === 'FIJO' ? { fondo: 'FIJO', monto: edicion.monto || String(FONDO_HABITUAL) } : { fondo: 'SIN' })} />
        {fijo && <CampoPesos aria-label={'Importe del fondo de ' + nombre} value={edicion.monto} invalid={montoInvalido} disabled={disabled} onChange={monto => onChange({ monto })} />}
      </div>
    </div>
    {!caja.principal && <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => onChange({ activa: !edicion.activa })} disabled={disabled}>{edicion.activa ? 'Desactivar' : 'Activar'}</Button>}
    <p className={cn('basis-full text-sm', montoInvalido ? 'text-destructive' : 'text-muted-foreground')}>
      {montoInvalido ? 'Ingresá un fondo de $1 o más, o elegí «Sin fondo».'
        : fijo ? `Al cerrar se sugiere dejar ${pesos(Number(edicion.monto))} para quien abre después, y el sueldo se retira solo si ese fondo queda en la caja.`
          : 'No se reserva efectivo: quien cierra deja lo que necesite el próximo turno.'}
    </p>
  </li>;
}

function DibujoRelevo() {
  return <svg aria-hidden width="88" height="32" viewBox="0 0 96 36" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5 stroke-gm-texto-2"><circle cx="14" cy="11" r="5" /><path d="M5 30c1-6 5-9 9-9s8 3 9 9" /><path d="M34 18h22M50 12l6 6-6 6" className="stroke-gm-yellow" /><circle cx="78" cy="11" r="5" /><path d="M69 30c1-6 5-9 9-9s8 3 9 9" /></svg>;
}
function DibujoVarias() {
  return <svg aria-hidden width="88" height="32" viewBox="0 0 96 36" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5 stroke-gm-texto-2"><circle cx="20" cy="11" r="5" /><path d="M11 30c1-6 5-9 9-9s8 3 9 9" /><circle cx="48" cy="11" r="5" /><path d="M39 30c1-6 5-9 9-9s8 3 9 9" /><circle cx="76" cy="11" r="5" className="stroke-gm-yellow" /><path d="M67 30c1-6 5-9 9-9s8 3 9 9" className="stroke-gm-yellow" /></svg>;
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
