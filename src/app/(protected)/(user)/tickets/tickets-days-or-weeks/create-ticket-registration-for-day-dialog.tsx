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
import { ArrowUpRight, Banknote, CalendarDays, CalendarPlus, ChevronDown, ChevronRight, Landmark, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ticketRegistrationForDaySchema, TicketRegistrationForDaySchemaType } from '@/schemas/ticket-registration-for-day.schema';
import { createTicketRegistrationForDayAction } from '@/actions/tickets/create-ticket-registration-for-day.action';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { PlateCameraScanButton } from '../components/plate-camera-scan-button';

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

  const form = useForm<TicketRegistrationForDaySchemaType>({
    resolver: zodResolver(ticketRegistrationForDaySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const isPaid = form.watch('paid');
  const metodo = form.watch('paymentMetodo');
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

  const resetForm = () => {
    form.reset(DEFAULT_VALUES);
    setUnidad('SEMANA');
    setCantidad(1);
    setConDias(false);
    setDiasExtra(1);
    setVerNombre(false);
  };

  const cerrar = () => { setIsOpen(false); setIsDialogOpen(false); resetForm(); };

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
    // ya sea acá (si eligen «Cobra ahora») o después al registrar la salida.
    const payload = { ...values, paymentMetodo: values.paid ? values.paymentMetodo : undefined };
    startTransition(async () => {
      const result = await createTicketRegistrationForDayAction(payload);
      if (result && 'error' in result && result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Error al registrar la estadía');
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
      <ActionDialog open={isOpen} onOpenChange={(open) => { if (!open) cerrar(); else abrir(); }}>
        <ActionDialogContent className="sm:max-w-[560px]">
          <ActionDialogHeader title="Estadía larga" description="Por día, semana o mes, con fecha de salida" />
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
                    <div role="group" aria-label="Medio de pago" className="grid grid-cols-2 gap-2">
                      {([{ id: 'CASH', label: 'Efectivo', Icon: Banknote }, { id: 'TRANSFER', label: 'Transferencia', Icon: Landmark }] as const).map(({ id, label, Icon }) => (
                        <button key={id} type="button" aria-pressed={metodo === id} disabled={isPending}
                          onClick={() => form.setValue('paymentMetodo', id)}
                          className={cn('flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                            metodo === id ? 'border-gm-yellow bg-gm-yellow/[0.12] font-bold' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                          <Icon className={cn('size-[18px]', metodo === id ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ActionDialogBody>

              <ActionDialogFooter>
                <ActionDialogSecondaryButton tone="ghost" className="hidden sm:inline-flex" onClick={cerrar}>Cancelar</ActionDialogSecondaryButton>
                <ActionDialogPrimaryButton
                  type="submit"
                  disabled={isPending || !patente.trim() || !vehicleValid || (isPaid && !metodo)}
                  detail={[patente.trim() || 'Falta la patente', vehicleName, isPaid ? (metodo === 'TRANSFER' ? 'por transferencia' : 'en efectivo') : 'paga al retirar'].filter(Boolean).join(' · ')}
                >
                  {isPending ? 'Registrando…' : 'Registrar estadía'}
                </ActionDialogPrimaryButton>
              </ActionDialogFooter>
            </form>
          </Form>
        </ActionDialogContent>
      </ActionDialog>
    </>
  );
}
