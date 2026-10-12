'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';
import { VehicleTypeButtons } from '@/components/vehicle-type-options';
import { useEffect, useState, useTransition } from 'react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowUpRight, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ticketRegistrationForDaySchema, TicketRegistrationForDaySchemaType } from '@/schemas/ticket-registration-for-day.schema';
import { createTicketRegistrationForDayAction } from '@/actions/tickets/create-ticket-registration-for-day.action';
import { updateTicketRegistrationForDayStatusAction } from '@/actions/tickets/update-ticket-registration-for-day-status.action';
import { cancelarCobroMercadoPagoAction, crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { cancelarCobroAliasAction, disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroAlias, DisponibilidadAlias } from '@/types/verificacion-alias.type';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { PlateCameraScanButton } from '../components/plate-camera-scan-button';
import { MedioCobro, PaymentMethodChoices } from '../components/payment-method-choices';
import { CobroQrMercadoPago, PagoQrRecibido } from '../components/cobro-qr-mercadopago';
import { CobroAliasPanel, PagoRecibido } from '../components/cobro-alias';

const NOMBRE_MEDIO: Record<MedioCobro, string> = {
  CASH: 'en efectivo',
  TRANSFER: 'por transferencia',
  QR: 'con QR',
  ALIAS: 'al alias',
};

// Con QR o alias el pago se confirma después de registrar la estadía: no hay medio que guardar.
const esEnLinea = (medio: MedioCobro) => medio === 'QR' || medio === 'ALIAS';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

type TicketTimeType = 'DIA' | 'SEMANA' | 'SEMANA_Y_DIA' | 'MES' | 'MES_Y_DIA';
type Unidad = 'DIA' | 'SEMANA' | 'MES';

const DEFAULT_VALUES: TicketRegistrationForDaySchemaType = {
  firstNameCustomer: '',
  lastNameCustomer: '',
  vehiclePlateCustomer: '',
  paid: false,
  retired: false,
  paymentMetodo: 'CASH',
  ticketTimeType: 'SEMANA',
  vehicleType: 'AUTO',
  weeks: 1,
  days: undefined,
  months: undefined,
};

const UNIDADES: { id: Unidad; label: string; singular: string; plural: string }[] = [
  { id: 'DIA', label: 'Días', singular: 'día', plural: 'días' },
  { id: 'SEMANA', label: 'Semanas', singular: 'sem.', plural: 'sem.' },
  { id: 'MES', label: 'Meses', singular: 'mes', plural: 'meses' },
];

// Lo que el backend guarda es un tipo de estadía (SEMANA, MES_Y_DIA…) con sus cantidades. En
// pantalla se elige una unidad, cuántas, y si se suman días sueltos: acá se traduce.
function tipoDe(unidad: Unidad, conDias: boolean): TicketTimeType {
  if (unidad === 'DIA') return 'DIA';
  if (unidad === 'SEMANA') return conDias ? 'SEMANA_Y_DIA' : 'SEMANA';
  return conDias ? 'MES_Y_DIA' : 'MES';
}

function Stepper({ label, value, unidad, onChange, disabled }: {
  label: string; value: number; unidad: string; onChange: (value: number) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <button type="button" aria-label={`${label}: uno menos`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}
        className="grid size-11 place-items-center rounded-xl border-[1.5px] border-gm-line-strong bg-card text-foreground transition-colors hover:border-gm-yellow/50 disabled:opacity-40">
        <Minus className="size-[18px]" aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-[78px] text-center">
        <span className="gm-mono text-[22px] font-bold">{value}</span>
        <span className="text-[13px] font-semibold text-muted-foreground"> {unidad}</span>
      </span>
      <button type="button" aria-label={`${label}: uno más`} disabled={disabled || value >= 99} onClick={() => onChange(value + 1)}
        className="grid size-11 place-items-center rounded-xl border-[1.5px] border-gm-line-strong bg-card text-foreground transition-colors hover:border-gm-yellow/50 disabled:opacity-40">
        <Plus className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}

export function CreateTicketRegistrationDialog({ setIsDialogOpen, isAdmin = false, showTrigger = true, openSignal }: {
  setIsDialogOpen: (open: boolean) => void;
  isAdmin?: boolean;
  // Sin botón propio: lo abren los accesos del inicio cambiando `openSignal`.
  showTrigger?: boolean;
  openSignal?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [unidad, setUnidad] = useState<Unidad>('SEMANA');
  const [cantidad, setCantidad] = useState(1);
  const [conDias, setConDias] = useState(false);
  const [diasExtra, setDiasExtra] = useState(1);
  const [vehicleValid, setVehicleValid] = useState(false);
  const [vehicleName, setVehicleName] = useState<string | null>(null);
  const [verNombre, setVerNombre] = useState(false);
  const [medio, setMedio] = useState<MedioCobro>('CASH');
  const [alias, setAlias] = useState<DisponibilidadAlias | null>(null);
  // Con QR o alias la estadía se registra primero y después se cobra en la misma ventana: el
  // cobro necesita su id. Mientras tanto queda sin pagar, como «Paga al retirar».
  const [registrada, setRegistrada] = useState<{ id: string; patente: string } | null>(null);
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);
  const [pagado, setPagado] = useState<{ medio: 'QR'; cobro: CobroMercadoPago } | { medio: 'ALIAS'; cobro: CobroAlias } | null>(null);

  const form = useForm<TicketRegistrationForDaySchemaType>({
    resolver: zodResolver(ticketRegistrationForDaySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const isPaid = form.watch('paid');
  const patente = form.watch('vehiclePlateCustomer') ?? '';

  // Mantiene el formulario en el formato que espera el backend: solo las cantidades del tipo
  // elegido; las demás en undefined para que un valor viejo no rompa el cálculo del vencimiento.
  useEffect(() => {
    const tipo = tipoDe(unidad, conDias);
    form.setValue('ticketTimeType', tipo);
    form.setValue('weeks', unidad === 'SEMANA' ? cantidad : undefined);
    form.setValue('months', unidad === 'MES' ? cantidad : undefined);
    form.setValue('days', unidad === 'DIA' ? cantidad : conDias ? diasExtra : undefined);
  }, [unidad, cantidad, conDias, diasExtra, form]);

  const abrir = () => { setIsOpen(true); setIsDialogOpen(true); };
  useEffect(() => {
    if (!openSignal) return;
    setIsOpen(true);
    setIsDialogOpen(true);
  }, [openSignal, setIsDialogOpen]);

  // «Al alias» se ofrece solo si la empresa lo tiene habilitado y activado.
  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    void disponibilidadAliasAction().then((r) => { if (vigente) setAlias(r.datos ?? null); });
    return () => { vigente = false; };
  }, [isOpen]);

  const resetForm = () => {
    form.reset(DEFAULT_VALUES);
    setUnidad('SEMANA');
    setCantidad(1);
    setConDias(false);
    setDiasExtra(1);
    setVerNombre(false);
    setMedio('CASH');
    setRegistrada(null);
    setCobroQr(null);
    setCobroAlias(null);
    setPagado(null);
  };

  const cerrar = () => { setIsOpen(false); setIsDialogOpen(false); resetForm(); };

  // Termina con la estadía registrada: el comprobante de entrada y cerrar.
  const terminar = (mensaje: string) => {
    if (!registrada) return;
    toast.success(mensaje);
    setReceiptId(registrada.id);
    cerrar();
  };

  // Cobra la estadía ya registrada. Efectivo y transferencia se asientan en el momento; QR y
  // alias esperan a que MercadoPago confirme, y entonces el abono queda pagado (no retirado).
  const cobrar = async (id: string, elegido: MedioCobro) => {
    if (elegido === 'QR') {
      const r = await crearCobroMercadoPagoAction(id, 'ABONO', { alIngresar: true });
      if (r.error || !r.cobro) toast.error(r.error ?? 'No se pudo generar el QR.');
      else setCobroQr(r.cobro);
    } else if (elegido === 'ALIAS') {
      const r = await iniciarCobroAliasAction(id, 'ABONO', { alIngresar: true });
      if (r.error || !r.datos) toast.error(r.error ?? 'No se pudo esperar la transferencia.');
      else if (r.datos.estado === 'CONFIRMADO') setPagado({ medio: 'ALIAS', cobro: r.datos });
      else setCobroAlias(r.datos);
    } else {
      const r = await updateTicketRegistrationForDayStatusAction(id, { paid: true, paymentMetodo: elegido });
      if ('error' in r && r.error) toast.error(typeof r.error === 'string' ? r.error : 'No se pudo registrar el pago.');
      else { toast.success('Estadía registrada y cobrada'); setReceiptId(id); cerrar(); }
    }
  };

  const terminadoAlias = (cobro: CobroAlias) => {
    setCobroAlias(null);
    if (cobro.estado === 'CONFIRMADO') setPagado({ medio: 'ALIAS', cobro });
    else if (cobro.estado === 'PAGADO_OTRO_MEDIO') terminar('Estadía registrada y cobrada');
  };

  // Cerrar sin terminar de cobrar: lo que se esperaba se cancela (que no quede un QR pagable) y la
  // estadía queda para pagar al retirar.
  const cerrarSinCobrar = async () => {
    if (cobroQr?.estado === 'PENDIENTE') await cancelarCobroMercadoPagoAction(cobroQr.id);
    if (cobroAlias && ['ESPERANDO', 'REVISION'].includes(cobroAlias.estado)) await cancelarCobroAliasAction(cobroAlias.id);
    terminar('Estadía registrada: paga al retirar');
  };

  // Hasta cuándo puede quedarse, con la misma cuenta que usa la lista de estadías largas.
  const hasta = (() => {
    let fecha = dayjs().tz(TZ);
    if (unidad === 'MES') fecha = fecha.add(cantidad, 'month');
    if (unidad === 'SEMANA') fecha = fecha.add(cantidad * 7, 'day');
    if (unidad === 'DIA') fecha = fecha.add(cantidad, 'day');
    if (unidad !== 'DIA' && conDias) fecha = fecha.add(diasExtra, 'day');
    return `${DIAS_SEMANA[fecha.day()]} ${fecha.format('DD/MM')} · ${fecha.format('HH:mm')}`;
  })();
  const u = UNIDADES.find((x) => x.id === unidad)!;

  const onSubmit = (values: TicketRegistrationForDaySchemaType) => {
    // Si todavía no pagó, no tiene sentido guardar un método — recién se sabe al cobrar,
    // ya sea acá (si eligen «Cobra ahora») o después al registrar la salida. Con QR o alias se
    // registra sin pagar y el pago se confirma enseguida, en esta misma ventana.
    const enLinea = !!values.paid && esEnLinea(medio);
    const payload = {
      ...values,
      paid: values.paid && !enLinea,
      paymentMetodo: values.paid && !enLinea ? (medio as 'CASH' | 'TRANSFER') : undefined,
    };
    startTransition(async () => {
      const result = await createTicketRegistrationForDayAction(payload);
      if (result && 'error' in result && result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Error al registrar la estadía');
        return;
      }
      if (enLinea && result.registrationId) {
        setRegistrada({ id: result.registrationId, patente: values.vehiclePlateCustomer ?? '' });
        await cobrar(result.registrationId, medio);
        return;
      }
      toast.success('Estadía registrada exitosamente');
      if (result.registrationId) setReceiptId(result.registrationId);
      cerrar();
    });
  };

  const etiqueta = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';
  const campo = 'h-12 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gm-yellow disabled:opacity-60';

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={abrir}
          className="group flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-gm-yellow/20 bg-gm-yellow/5 px-4 py-3 text-left transition-colors hover:border-gm-yellow/50 hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gm-yellow/10 text-gm-yellow transition-colors group-hover:bg-gm-yellow/20">
            <CalendarPlus className="size-5" />
          </span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">Estadía por día, semana o mes</span><span className="mt-1 block text-xs text-muted-foreground">Registrá una estadía larga</span></span>
          <ChevronRight className="size-4 shrink-0 text-gm-yellow transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      <ParkingReceiptDelivery registrationId={receiptId} kind="ENTRY" onDismiss={() => setReceiptId(null)} />
      <ActionDialog open={isOpen} onOpenChange={(open) => {
        if (open) { abrir(); return; }
        if (isPending) return;
        if (pagado) terminar('Estadía registrada y cobrada');
        else if (registrada) void cerrarSinCobrar();
        else cerrar();
      }}>
        <ActionDialogContent className="sm:max-w-[560px]">
          <ActionDialogHeader
            title={pagado ? 'Estadía cobrada' : registrada ? 'Cobrar estadía' : 'Estadía larga'}
            description={registrada ? `${registrada.patente} · ya registrada` : 'Por día, semana o mes, con fecha de salida'}
          />
          {registrada ? (
            <>
              <ActionDialogBody className="gap-3.5">
                {pagado ? (
                  pagado.medio === 'QR'
                    ? <PagoQrRecibido cobro={pagado.cobro} onCerrar={() => terminar('Estadía registrada y cobrada')} />
                    : <PagoRecibido cobro={pagado.cobro} onCerrar={() => terminar('Estadía registrada y cobrada')} />
                ) : cobroQr ? (
                  <CobroQrMercadoPago cobro={cobroQr} onAcreditado={(c) => { setCobroQr(null); setPagado({ medio: 'QR', cobro: c }); }} onCancelar={() => setCobroQr(null)} />
                ) : cobroAlias ? (
                  <CobroAliasPanel key={cobroAlias.id} cobro={cobroAlias} onTerminado={terminadoAlias} onCancelado={() => setCobroAlias(null)} />
                ) : (
                  // Se canceló el QR o la espera (o no se pudo empezar): la estadía ya está registrada,
                  // así que se cobra de otra forma o queda para pagar al retirar.
                  <fieldset className="min-w-0 space-y-2.5">
                    <legend className="sr-only">¿Cómo paga?</legend>
                    <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden />
                      La estadía ya quedó registrada, sin cobrar.
                    </p>
                    <PaymentMethodChoices value={medio} onChange={setMedio} disabled={isPending} aliasDisponible={!!alias?.disponible} />
                  </fieldset>
                )}
              </ActionDialogBody>
              <ActionDialogFooter>
                {!pagado && !cobroQr && !cobroAlias && (
                  <>
                    <ActionDialogSecondaryButton tone="ghost" disabled={isPending} onClick={() => terminar('Estadía registrada: paga al retirar')}>
                      Paga al retirar
                    </ActionDialogSecondaryButton>
                    <ActionDialogPrimaryButton disabled={isPending} onClick={() => startTransition(() => cobrar(registrada.id, medio))} detail={`${registrada.patente} · ${NOMBRE_MEDIO[medio]}`}>
                      {isPending ? 'Procesando…' : medio === 'QR' ? 'Mostrar el QR' : medio === 'ALIAS' ? 'Esperar la transferencia' : 'Cobrar'}
                    </ActionDialogPrimaryButton>
                  </>
                )}
              </ActionDialogFooter>
            </>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-auto flex-col">
              <ActionDialogBody className="gap-3.5">
                {isAdmin && (
                  <Link href="/admin/tarifas?tab=pases" className="flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-xl border border-gm-yellow/25 bg-gm-yellow/[0.07] px-3.5 text-[13px] font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
                    <span>Administrar precios de día, semana y mes</span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  </Link>
                )}

                <fieldset className="flex shrink-0 flex-col gap-2.5 rounded-[18px] border border-border bg-gm-surface-2 p-3.5 short:p-3">
                  <legend className="sr-only">Duración</legend>
                  <div role="group" aria-label="Unidad" className="grid grid-cols-3 gap-1 rounded-[14px] bg-background p-1">
                    {UNIDADES.map((opcion) => (
                      <button key={opcion.id} type="button" aria-pressed={unidad === opcion.id} disabled={isPending}
                        onClick={() => { setUnidad(opcion.id); setCantidad(1); if (opcion.id === 'DIA') setConDias(false); }}
                        className={cn('gm-display h-10 rounded-[10px] text-[14px] tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                          unidad === opcion.id ? 'bg-gm-yellow text-gm-ink' : 'text-muted-foreground hover:text-foreground')}>
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                  <Stepper label="Cantidad" value={cantidad} unidad={cantidad === 1 ? u.singular : u.plural} onChange={setCantidad} disabled={isPending} />
                  {unidad !== 'DIA' && (conDias ? (
                    <div className="space-y-1">
                      <Stepper label="Días sueltos" value={diasExtra} unidad={diasExtra === 1 ? 'día' : 'días'} onChange={setDiasExtra} disabled={isPending} />
                      <button type="button" onClick={() => setConDias(false)} className="min-h-9 text-[13px] font-semibold text-muted-foreground hover:text-foreground">Quitar días sueltos</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConDias(true)} disabled={isPending} className="flex min-h-9 items-center gap-2 self-start text-[13px] font-semibold text-gm-yellow">
                      <Plus className="size-4" aria-hidden />Sumar días sueltos
                    </button>
                  ))}
                  <div className="flex items-center gap-3 border-t border-dashed border-gm-line-strong pt-2.5">
                    <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className={cn(etiqueta, 'block')}>Puede quedarse hasta</span>
                      <span className="block text-[15px] font-bold">{hasta}</span>
                    </span>
                  </div>
                </fieldset>

                <FormField control={form.control} name="vehiclePlateCustomer" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className={etiqueta}>Patente</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <input {...field} disabled={isPending} autoComplete="off" spellCheck={false} maxLength={20} placeholder="Ej.: AB123CD"
                          onChange={(e) => field.onChange(sanitizePlateInput(e.target.value))}
                          className="gm-mono h-14 min-w-0 flex-1 rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 px-4 text-[22px] font-bold uppercase tracking-[0.1em] text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-gm-yellow disabled:opacity-60 short:h-12" />
                      </FormControl>
                      <PlateCameraScanButton variant="square" disabled={isPending} onRecognized={(plate) => form.setValue('vehiclePlateCustomer', plate, { shouldValidate: true })} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className={etiqueta}>Tipo de vehículo</FormLabel>
                    <FormControl>
                      <VehicleTypeButtons value={field.value} onChange={field.onChange} disabled={isPending} onValidityChange={setVehicleValid} onSelectedNameChange={setVehicleName} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {!verNombre ? (
                  <button type="button" onClick={() => setVerNombre(true)} aria-expanded={false}
                    className="flex min-h-12 shrink-0 items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-gm-line-strong px-3.5 text-left transition-colors hover:border-gm-yellow/50">
                    <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-gm-surface-3 text-gm-yellow"><Plus className="size-4" aria-hidden /></span>
                    <span className="flex-1 text-sm font-semibold">Agregar nombre y apellido <span className="font-normal text-muted-foreground">· opcional</span></span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                  </button>
                ) : (
                  <div className="grid shrink-0 grid-cols-2 gap-3">
                    <FormField control={form.control} name="firstNameCustomer" render={({ field }) => (
                      <FormItem className="space-y-1.5"><FormLabel className="text-[13px] font-semibold">Nombre</FormLabel><FormControl><input disabled={isPending} placeholder="Nombre" {...field} className={campo} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastNameCustomer" render={({ field }) => (
                      <FormItem className="space-y-1.5"><FormLabel className="text-[13px] font-semibold">Apellido</FormLabel><FormControl><input disabled={isPending} placeholder="Apellido" {...field} className={campo} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                )}

                <div className="flex shrink-0 flex-col gap-2">
                  <span className={etiqueta}>Pago</span>
                  <div role="group" aria-label="Cuándo paga" className="grid grid-cols-2 gap-1 rounded-[14px] border border-border bg-background p-1">
                    {([{ pagado: true, label: 'Cobra ahora' }, { pagado: false, label: 'Paga al retirar' }] as const).map((opcion) => (
                      <button key={opcion.label} type="button" aria-pressed={!!isPaid === opcion.pagado} disabled={isPending}
                        onClick={() => form.setValue('paid', opcion.pagado)}
                        className={cn('h-10 rounded-[10px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                          !!isPaid === opcion.pagado ? 'bg-foreground text-card' : 'font-semibold text-muted-foreground hover:text-foreground')}>
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                  {isPaid && (
                    <div role="group" aria-label="Medio de pago">
                      <PaymentMethodChoices value={medio} onChange={setMedio} disabled={isPending} aliasDisponible={!!alias?.disponible} />
                      {medio === 'TRANSFER' && <p className="mt-2 text-xs text-muted-foreground">Confirmá solo si ya viste la transferencia acreditada en la cuenta.</p>}
                    </div>
                  )}
                </div>
              </ActionDialogBody>

              <ActionDialogFooter>
                <ActionDialogSecondaryButton tone="ghost" className="hidden sm:inline-flex" onClick={cerrar}>Cancelar</ActionDialogSecondaryButton>
                <ActionDialogPrimaryButton
                  type="submit"
                  disabled={isPending || !patente.trim() || !vehicleValid}
                  detail={[patente.trim() || 'Falta la patente', vehicleName, isPaid ? NOMBRE_MEDIO[medio] : 'paga al retirar'].filter(Boolean).join(' · ')}
                >
                  {isPending
                    ? 'Registrando…'
                    : isPaid && medio === 'QR'
                      ? 'Registrar y mostrar el QR'
                      : isPaid && medio === 'ALIAS'
                        ? 'Registrar y esperar la transferencia'
                        : 'Registrar estadía'}
                </ActionDialogPrimaryButton>
              </ActionDialogFooter>
            </form>
          </Form>
          )}
        </ActionDialogContent>
      </ActionDialog>
    </>
  );
}
