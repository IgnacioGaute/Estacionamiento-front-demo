'use client';
import { useTenant } from '@/components/tenant-provider';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';

import { VehicleTypeButtons } from '@/components/vehicle-type-options';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
  ActionDialogTrigger,
} from '@/components/ui/action-dialog';
import { PlateChip } from '@/components/plate-chip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { AlertTriangle, Barcode, CarFront, ChevronDown, ChevronRight, CircleX, Plus, Search, Sparkles, UserCheck } from 'lucide-react';
import { detectarVehiculo, type DeteccionVehiculo } from '@/utils/detectar-vehiculo';
import type { VehiculoDetectado } from '@/services/plate-recognition.service';
import { cn } from '@/lib/utils';
import { entryByPlateSchema, EntryByPlateSchemaType } from '@/schemas/entry-by-plate.schema';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { startScanner } from '@/services/scanner.service';
import { looksLikeKnownPlateFormat, sanitizePlateInput } from '@/utils/plate.utils';
import { ModeloVehiculoInput } from './modelo-vehiculo-input';
import { FrequentCustomer } from '@/types/frequent-customer.type';
import { PlateCameraScanButton } from './plate-camera-scan-button';

const VEHICLE_TYPE_LABEL: Record<string, string> = { AUTO: 'Auto', CAMIONETA: 'Camioneta' };
// Para nombrar lo que dijo cada motor sin pedir otra vez los tipos: «PICKUP» → «Pickup».
const nombreTipo = (code: string) => VEHICLE_TYPE_LABEL[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');

type EstadoTipo = { estado: 'buscando' } | { estado: 'listo'; resultado: VehiculoDetectado; aplicado: boolean; modeloAplicado: boolean };

type DuplicateError = { existingRegistrationId?: string; entryTime?: string; message: string };

export function EntryByPlateDialog({
  onGoToRegistration,
  onTicketRegistered,
  ticketEntryEnabled,
  triggerRef,
  triggerStyle,
  scanRequest,
  onOpenChange,
  showTrigger = true,
  openSignal,
}: {
  // Sin botón propio: lo abren otros accesos (la barra de abajo del inicio) cambiando `openSignal`.
  showTrigger?: boolean;
  openSignal?: number;
  onGoToRegistration?: (id: string) => void;
  // Se dispara cuando la pestaña "Ticket" registra una entrada (mismo endpoint que usa el
  // escáner físico) — el padre re-hace fetch de los registros igual que con el escáner.
  onTicketRegistered?: () => void;
  ticketEntryEnabled?: boolean;
  triggerRef?: (el: HTMLElement | null) => void;
  triggerStyle?: React.CSSProperties;
  // `parecidasRevisadas`: el escaneo ya ofreció las patentes parecidas y el operador dijo que es otro.
  // `vehiculo`: la detección del tipo y el modelo que el escáner ya empezó con la foto.
  scanRequest?: { plate: string; sequence: number; parecidasRevisadas?: boolean; vehiculo?: DeteccionVehiculo } | null;
  onOpenChange?: (open: boolean) => void;
}) {
  const { playaId, cobroHabilitado } = useTenant();
  // En la playa gratuita los datos que importan son apellido, DNI y modelo (no hay comprobantes:
  // el WhatsApp no sirve); con cobro, apellido y WhatsApp. Siempre opcionales.
  const gratuita = !cobroHabilitado;
  const session = useSession();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [duplicateError, setDuplicateError] = useState<DuplicateError | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  // Patentes parecidas que ya están adentro: el auto puede ser uno de ellos mal leído.
  const [parecidas, setParecidas] = useState<TicketRegistration[] | null>(null);
  const [method, setMethod] = useState<'PLATE' | 'TICKET'>('PLATE');
  const [ticketCode, setTicketCode] = useState('');
  const [ticketPending, setTicketPending] = useState(false);
  const [frequentCustomers, setFrequentCustomers] = useState<FrequentCustomer[]>([]);
  const [frequentQuery, setFrequentQuery] = useState('');
  const [selectedFrequent, setSelectedFrequent] = useState<FrequentCustomer | null>(null);
  const [frequentLoading, setFrequentLoading] = useState(false);
  const [frequentError, setFrequentError] = useState('');
  const [vehicleValid, setVehicleValid] = useState(false);
  const [vehicleName, setVehicleName] = useState<string | null>(null);
  // Los datos del cliente son opcionales: quedan plegados salvo que el operador los abra o ya
  // traigan algo (un frecuente con datos), así el formulario entra en la pantalla sin desplazar.
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [tipoDetectado, setTipoDetectado] = useState<EstadoTipo | null>(null);
  // Cada escaneo invalida la respuesta pendiente del anterior.
  const pedidoTipo = useRef(0);
  const frecuenteRef = useRef<FrequentCustomer | null>(null);
  useEffect(() => { frecuenteRef.current = selectedFrequent; }, [selectedFrequent]);

  const form = useForm<EntryByPlateSchemaType>({
    resolver: zodResolver(entryByPlateSchema),
    defaultValues: {
      licensePlate: '',
      vehicleType: 'AUTO',
      casilleroNumber: '',
      lastNameCustomer: '',
      phoneCustomer: '',
      documentoCustomer: '',
      modeloVehiculo: '',
    },
  });

  const chooseFrequent = (customer: FrequentCustomer, automatic = false) => {
    setSelectedFrequent(customer);
    setFrequentQuery(customer.licensePlateOriginal);
    form.setValue('licensePlate', customer.licensePlateOriginal, { shouldValidate: true });
    if (!automatic || !form.getValues('lastNameCustomer')) form.setValue('lastNameCustomer', customer.lastNameCustomer ?? '');
    if (!automatic || !form.getValues('phoneCustomer')) form.setValue('phoneCustomer', customer.phoneCustomer ?? '');
    if (!automatic || !form.getFieldState('vehicleType').isDirty) form.setValue('vehicleType', customer.vehicleType);
    setFrequentCustomers([]);
  };

  // Con la foto del escaneo, Gemini sugiere el tipo y el modelo (la patente ya la leyó el motor de
  // patentes). Llega la foto (escaneo desde este diálogo) o la detección que el escáner de abajo ya
  // empezó. El tipo se elige solo si el operador no lo tocó ni lo trajo un frecuente mientras
  // tanto, y el modelo solo si estaba vacío; si no se puede detectar, queda todo como estaba.
  const detectarTipo = (fuente?: File | DeteccionVehiculo) => {
    const pedido = ++pedidoTipo.current;
    if (!fuente) {
      setTipoDetectado(null);
      return;
    }
    const tipoAlPedir = form.getValues('vehicleType');
    setTipoDetectado({ estado: 'buscando' });
    (fuente instanceof File ? detectarVehiculo(fuente) : fuente)
      .then((resultado) => {
        if (pedido !== pedidoTipo.current) return;
        if (!resultado || (!resultado.vehicleType && !resultado.modelo)) {
          setTipoDetectado(null);
          return;
        }
        const intacto = !frecuenteRef.current && !form.getFieldState('vehicleType').isDirty && form.getValues('vehicleType') === tipoAlPedir;
        const aplicado = !!resultado.vehicleType && intacto;
        if (aplicado) form.setValue('vehicleType', resultado.vehicleType!, { shouldValidate: true });
        // El modelo solo completa el campo vacío: lo escrito por el operador no se pisa.
        const modeloAplicado = !!resultado.modelo && !form.getValues('modeloVehiculo')?.trim();
        if (modeloAplicado) form.setValue('modeloVehiculo', resultado.modelo!, { shouldValidate: true });
        setTipoDetectado({ estado: 'listo', resultado, aplicado, modeloAplicado });
      });
  };
  const detectarTipoRef = useRef(detectarTipo);
  useEffect(() => { detectarTipoRef.current = detectarTipo; });

  useEffect(() => {
    if (!scanRequest) return;
    form.reset({ licensePlate: scanRequest.plate, vehicleType: 'AUTO', casilleroNumber: '', lastNameCustomer: '', phoneCustomer: '', documentoCustomer: '', modeloVehiculo: '' });
    detectarTipoRef.current(scanRequest.vehiculo);
    setDuplicateError(null);
    setOverrideReason('');
    setParecidas(null);
    setMethod('PLATE');
    setSelectedFrequent(null);
    setFrequentQuery(scanRequest.plate);
    setDatosAbiertos(false);
    setOpen(true);
  }, [scanRequest, form]);

  useEffect(() => {
    if (!openSignal) return;
    setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    const query = frequentQuery.trim();
    if (!open || method !== 'PLATE' || query.length < 2 || selectedFrequent) {
      setFrequentLoading(false);
      return;
    }
    let current = true;
    setFrequentLoading(true);
    setFrequentError('');
    const timer = setTimeout(async () => {
      try {
        const search = looksLikeKnownPlateFormat(query) ? sanitizePlateInput(query) : query;
        const data = await getFrequentCustomersAction({ minVisits: 2, search, limit: 6 });
        if (!current) return;
        const exact = data.find(c => c.licensePlateNormalized === sanitizePlateInput(query));
        if (exact) {
          setSelectedFrequent(exact);
          form.setValue('licensePlate', exact.licensePlateOriginal, { shouldValidate: true });
          if (!form.getValues('lastNameCustomer')) form.setValue('lastNameCustomer', exact.lastNameCustomer ?? '');
          if (!form.getValues('phoneCustomer')) form.setValue('phoneCustomer', exact.phoneCustomer ?? '');
          if (!form.getFieldState('vehicleType').isDirty) form.setValue('vehicleType', exact.vehicleType);
          setFrequentCustomers([]);
        } else setFrequentCustomers(data);
      } catch {
        if (current) { setFrequentCustomers([]); setFrequentError('No se pudieron buscar frecuentes. Podés completar la entrada.'); }
      } finally {
        if (current) setFrequentLoading(false);
      }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [open, method, frequentQuery, selectedFrequent, form]);

  const changeQuery = (query: string) => {
    if (selectedFrequent) {
      if (form.getValues('lastNameCustomer') === (selectedFrequent.lastNameCustomer ?? '')) form.setValue('lastNameCustomer', '');
      if (form.getValues('phoneCustomer') === (selectedFrequent.phoneCustomer ?? '')) form.setValue('phoneCustomer', '');
    }
    setSelectedFrequent(null);
    setFrequentCustomers([]);
    setFrequentError('');
    setFrequentQuery(query);
    form.setValue('licensePlate', sanitizePlateInput(query), { shouldDirty: true, shouldValidate: true });
  };

  const plateValue = form.watch('licensePlate') ?? '';
  const showFormatWarning = plateValue.trim().length >= 5 && !looksLikeKnownPlateFormat(plateValue);

  const resetAll = () => {
    form.reset();
    setDuplicateError(null);
    setOverrideReason('');
    setParecidas(null);
    setMethod('PLATE');
    setTicketCode('');
    setFrequentQuery('');
    setSelectedFrequent(null);
    setFrequentCustomers([]);
    setFrequentError('');
    setDatosAbiertos(false);
    pedidoTipo.current++;
    setTipoDetectado(null);
  };

  const submitTicket = async () => {
    if (!ticketCode.trim()) return;
    setTicketPending(true);
    const data = await startScanner({ barCode: ticketCode.trim() }, session.data?.token, playaId);
    setTicketPending(false);
    if (!data || 'error' in data) {
      toast.error((data as { error?: string })?.error ?? 'Error desconocido');
      return;
    }
    if (data.type === 'RECEIPT') {
      toast.error('Ese código corresponde a un recibo, no a un ticket. Usá el escáner para procesarlo.');
      return;
    }
    if (data.requiresClose && data.registrationId) {
      setOpen(false);
      resetAll();
      onGoToRegistration?.(data.registrationId);
      return;
    }
    // Un ticket alterna entrada/salida según si ya tenía un registro abierto — no siempre es
    // una entrada nueva, así que el aviso es neutral en vez de asumirlo.
    toast.success('🎫 Ticket procesado exitosamente');
    if (data.warning) toast.warning(data.warning, { duration: 8000 });
    resetAll();
    setOpen(false);
    onTicketRegistered?.();
    if (data.registrationId) setReceiptId(data.registrationId);
  };

  const submit = (values: EntryByPlateSchemaType, override?: boolean, parecidasRevisadas = false) => {
    startTransition(async () => {
      // Antes de una entrada nueva, si adentro hay una patente a un carácter de distancia se
      // pregunta: registrarla igual dejaría la otra abierta para siempre. Si la consulta falla no
      // se traba la entrada.
      const patente = values.licensePlate ?? '';
      const yaRevisadas = parecidasRevisadas || (!!scanRequest?.parecidasRevisadas && sanitizePlateInput(patente) === scanRequest.plate);
      if (!override && !yaRevisadas && patente) {
        const estado = await getPlateStatusAction(patente);
        if (estado.data?.similares?.length) {
          setParecidas(estado.data.similares);
          return;
        }
      }
      const data = await createRegistrationByPlateAction({
        ...values,
        noPlate: false,
        duplicateOverride: override,
        duplicateOverrideReason: override ? overrideReason : undefined,
      });
      if (!data || data.error) {
        const err = data?.error as any;
        if (err?.code === 'DUPLICATE_ACTIVE_PLATE') {
          setDuplicateError(err);
          return;
        }
        const errorMessage = typeof err === 'string' ? err : err?.message;
        toast.error(errorMessage ?? 'Error desconocido');
      } else {
        toast.success('Entrada registrada exitosamente');
        if (data.registrationId) setReceiptId(data.registrationId);
        onTicketRegistered?.();
        resetAll();
        setOpen(false);
      }
    });
  };

  const onSubmit = (values: EntryByPlateSchemaType) => {
    if (!values.licensePlate?.trim()) { form.setError('licensePlate', { message: 'Ingresá o escaneá una patente.' }); return; }
    if (vehicleValid) submit(values, false);
  };
  const onConfirmOverride = () => {
    if (!overrideReason.trim()) {
      toast.error('Ingresá el motivo.');
      return;
    }
    submit(form.getValues(), true);
  };

  const lastNameValue = form.watch('lastNameCustomer') ?? '';
  const phoneValue = form.watch('phoneCustomer') ?? '';
  const documentoValue = form.watch('documentoCustomer') ?? '';
  const modeloValue = form.watch('modeloVehiculo') ?? '';
  const tipoElegido = form.watch('vehicleType');
  const mostrarDatos = datosAbiertos || !!lastNameValue || !!phoneValue || !!documentoValue || !!modeloValue;
  const cerrar = () => { resetAll(); setOpen(false); };
  // Hasta tres coincidencias: con más, el diálogo tendría que desplazarse. Se afina escribiendo.
  const coincidencias = frequentCustomers.slice(0, 3);
  const entroDuplicada = duplicateError?.entryTime?.slice(0, 5);
  const etiqueta = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';
  const campo = 'h-12 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gm-yellow disabled:opacity-60 short:h-11';

  const selectorMetodo = ticketEntryEnabled && (
    <div role="group" aria-label="Cómo registrar la entrada" className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-gm-surface-2 p-1">
      {(['PLATE', 'TICKET'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={method === value}
          onClick={() => setMethod(value)}
          className={cn(
            'gm-display flex h-10 items-center justify-center gap-2 rounded-lg text-[12.5px] font-semibold tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
            method === value ? 'bg-gm-yellow text-gm-ink' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {value === 'PLATE' ? <CarFront className="size-4" aria-hidden /> : <Barcode className="size-4" aria-hidden />}
          {value === 'PLATE' ? 'Patente' : 'Ticket'}
        </button>
      ))}
    </div>
  );

  return (
    <><ActionDialog open={open} onOpenChange={(o) => { if (!o) resetAll(); setOpen(o); }}>
      {showTrigger && <ActionDialogTrigger asChild>
        <button
          ref={triggerRef}
          style={triggerStyle}
          onClick={() => setOpen(true)}
          className="group flex min-h-[88px] w-full min-w-0 items-center gap-3 rounded-xl bg-gm-yellow px-4 py-4 text-left text-gm-ink transition-colors hover:bg-gm-yellow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gm-ink/10">
            <CarFront className="size-6" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">Registrar entrada</span>
            <span className="text-[12px] font-medium normal-case tracking-normal text-gm-ink/70">
              {ticketEntryEnabled ? 'Por patente o por ticket' : 'Por patente'}
            </span>
          </span>
        </button>
      </ActionDialogTrigger>}

      <ActionDialogContent
        ref={dialogRef}
        className="sm:max-w-[580px]"
        onOpenAutoFocus={(event) => {
          // Desde el escaneo rápido la patente ya está: no se abre el teclado encima.
          if (scanRequest && frequentQuery === scanRequest.plate) {
            event.preventDefault();
            dialogRef.current?.focus();
          } else if (method === 'PLATE') {
            event.preventDefault();
            form.setFocus('licensePlate');
          }
        }}
      >
        <ActionDialogHeader
          title="Registrar entrada"
          description={duplicateError || parecidas ? 'Revisá antes de seguir' : method === 'TICKET' ? 'Escaneá la tarjeta o escribí su número' : 'Buscá o escaneá la patente'}
        />

        {duplicateError ? (
          <>
            <ActionDialogBody>
              <div role="alert" className="space-y-3.5 rounded-[18px] border-[1.5px] border-gm-orange/55 bg-gm-orange/10 p-4 short:space-y-3 short:p-3.5">
                <p className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-orange/20 text-[#F0714A]">
                    <AlertTriangle className="size-5" aria-hidden />
                  </span>
                  <span className="gm-display text-[19px] leading-tight tracking-[0.02em] text-[#F0714A]">Esta patente ya está adentro</span>
                </p>
                <div className="flex items-center gap-3.5 rounded-[14px] bg-card p-3">
                  <PlateChip plate={plateValue || '—'} />
                  <p className="min-w-0 text-[15px] font-semibold">{entroDuplicada ? `Entró a las ${entroDuplicada}` : duplicateError.message}</p>
                </div>
                <p className="text-[13.5px] leading-relaxed text-[#D9D1C3]">
                  Lo más común: no se registró la salida anterior. Si el auto se está yendo, abrí esa estadía y cobrala.
                </p>
              </div>

              <div className="space-y-2.5">
                <p className={cn(etiqueta, 'flex items-center gap-2.5')}>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  Si es otro vehículo
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </p>
                <label htmlFor="entrada-motivo-duplicada" className="block text-[13px] font-semibold">Motivo para registrarla igual</label>
                <input
                  id="entrada-motivo-duplicada"
                  placeholder="Contá por qué hay dos con la misma patente"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  disabled={isPending}
                  className={campo}
                />
                <p className="text-xs text-muted-foreground">Queda registrado con tu usuario.</p>
                <ActionDialogSecondaryButton className="sm:w-full" onClick={onConfirmOverride} disabled={isPending || !overrideReason.trim()}>
                  {isPending ? 'Registrando…' : 'Registrar la entrada igual'}
                </ActionDialogSecondaryButton>
              </div>
            </ActionDialogBody>
            <ActionDialogFooter>
              <ActionDialogSecondaryButton tone="ghost" className="order-last sm:order-none" onClick={() => setDuplicateError(null)}>
                Corregir la patente
              </ActionDialogSecondaryButton>
              {duplicateError.existingRegistrationId && (
                <ActionDialogPrimaryButton
                  detail="Para cobrarla y registrar su salida"
                  onClick={() => {
                    onGoToRegistration?.(duplicateError.existingRegistrationId!);
                    cerrar();
                  }}
                >
                  Ir a esa estadía
                </ActionDialogPrimaryButton>
              )}
            </ActionDialogFooter>
          </>
        ) : parecidas ? (
          <>
            <ActionDialogBody>
              <div role="alert" className="space-y-3 rounded-[18px] border-[1.5px] border-gm-yellow/50 bg-gm-yellow/[0.07] p-4 short:space-y-2.5 short:p-3.5">
                <p className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-yellow/15 text-gm-yellow">
                    <AlertTriangle className="size-5" aria-hidden />
                  </span>
                  <span className="gm-display text-[19px] leading-tight tracking-[0.02em] text-gm-yellow">
                    {parecidas.length === 1 ? 'Hay una patente parecida adentro' : 'Hay patentes parecidas adentro'}
                  </span>
                </p>
                <p className="text-[13.5px] leading-relaxed text-[#D9D1C3]">
                  Puede ser el mismo auto con un carácter mal leído. Si se está yendo, cobrá esa estadía en lugar de registrar una entrada nueva.
                </p>
              </div>
              <ul className="space-y-2">
                {parecidas.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => { onGoToRegistration?.(r.id); cerrar(); }}
                      className="flex min-h-14 w-full items-center gap-3.5 rounded-[14px] border border-border bg-card p-3 text-left transition-colors hover:border-gm-yellow/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
                    >
                      <PlateChip plate={r.licensePlateOriginal || '—'} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">Entró a las {r.entryTime?.slice(0, 5)}</span>
                        <span className="block text-xs text-muted-foreground">Es este: cobrar su salida</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </ActionDialogBody>
            <ActionDialogFooter>
              <ActionDialogSecondaryButton tone="ghost" className="order-last sm:order-none" onClick={() => setParecidas(null)}>
                Corregir la patente
              </ActionDialogSecondaryButton>
              <ActionDialogPrimaryButton
                detail={`Es otro auto: ${plateValue}`}
                disabled={isPending}
                onClick={() => { setParecidas(null); submit(form.getValues(), false, true); }}
              >
                {isPending ? 'Registrando…' : 'Registrar la entrada'}
              </ActionDialogPrimaryButton>
            </ActionDialogFooter>
          </>
        ) : method === 'TICKET' ? (
          <>
            <ActionDialogBody>
              {selectorMetodo}
              <div className="space-y-2">
                <label htmlFor="entrada-ticket" className={etiqueta}>Número de ticket</label>
                <input
                  id="entrada-ticket"
                  autoFocus
                  inputMode="numeric"
                  placeholder="0000"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitTicket();
                    }
                  }}
                  disabled={ticketPending}
                  className="gm-mono h-16 w-full rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 text-center text-2xl font-bold tracking-[0.12em] text-foreground outline-none transition-colors focus:border-gm-yellow disabled:opacity-60"
                />
                <p className="text-xs text-muted-foreground">Escaneá la tarjeta o escribí el número.</p>
              </div>
            </ActionDialogBody>
            <ActionDialogFooter>
              <ActionDialogSecondaryButton tone="ghost" className="hidden sm:inline-flex" onClick={cerrar}>Cancelar</ActionDialogSecondaryButton>
              <ActionDialogPrimaryButton onClick={submitTicket} disabled={ticketPending || !ticketCode} detail={ticketCode ? `Ticket ${ticketCode}` : 'Escribí o escaneá el número'}>
                {ticketPending ? 'Registrando…' : 'Registrar entrada'}
              </ActionDialogPrimaryButton>
            </ActionDialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-auto flex-col">
              <ActionDialogBody>
                {selectorMetodo}
                <div className="space-y-2">
                  <FormField control={form.control} name="licensePlate" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={etiqueta}>Patente, apellido o teléfono</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                          <FormControl>
                            <input
                              {...field}
                              value={frequentQuery}
                              disabled={isPending}
                              autoComplete="off"
                              spellCheck={false}
                              maxLength={50}
                              placeholder="Ej.: AB123CD"
                              onChange={(event) => changeQuery(event.target.value)}
                              className="gm-mono h-[60px] w-full rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 pl-4 pr-12 text-[24px] font-bold uppercase tracking-[0.1em] text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-gm-yellow focus:shadow-[0_0_0_4px_hsl(var(--gm-yellow)/0.14)] disabled:opacity-60 short:h-[52px] short:text-[21px]"
                            />
                          </FormControl>
                          {frequentQuery && (
                            <button
                              type="button"
                              aria-label="Borrar y buscar otra"
                              disabled={isPending}
                              onClick={() => { changeQuery(''); form.setFocus('licensePlate'); }}
                              className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <CircleX className="size-[18px]" aria-hidden />
                            </button>
                          )}
                        </div>
                        <PlateCameraScanButton variant="square" disabled={isPending} onRecognized={(plate, foto) => { changeQuery(plate); detectarTipo(foto); }} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div aria-live="polite" className="space-y-1.5">
                    {selectedFrequent ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/35 bg-emerald-400/[0.08] px-3.5 py-2.5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-400">
                          <UserCheck className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">Cliente frecuente identificado</span>
                          <span className="block truncate text-[12.5px] text-muted-foreground">
                            {selectedFrequent.lastNameCustomer || selectedFrequent.licensePlateOriginal} · {selectedFrequent.visits} {selectedFrequent.visits === 1 ? 'visita' : 'visitas'} · cargamos sus datos
                          </span>
                        </span>
                      </div>
                    ) : frequentLoading ? (
                      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Search className="size-3.5" aria-hidden />Buscando clientes frecuentes…</p>
                    ) : frequentError ? (
                      <p className="text-xs text-gm-orange">{frequentError}</p>
                    ) : coincidencias.length ? (
                      <>
                        <p className={cn(etiqueta, 'flex items-baseline justify-between')}>
                          <span>Clientes frecuentes</span>
                          <span className="text-xs font-normal normal-case tracking-normal">{frequentCustomers.length === 1 ? '1 coincide' : `${frequentCustomers.length} coinciden`}</span>
                        </p>
                        <div className="overflow-hidden rounded-2xl border border-border bg-gm-surface-2">
                          {coincidencias.map((customer) => (
                            <button
                              key={customer.licensePlateNormalized}
                              type="button"
                              disabled={isPending}
                              onClick={() => chooseFrequent(customer)}
                              className="flex min-h-14 w-full items-center gap-3 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow short:min-h-12 short:py-1.5"
                            >
                              <PlateChip plate={customer.licensePlateOriginal} size="sm" highlight={frequentQuery} />
                              <span className="min-w-0 flex-1">
                                <span className={cn('block truncate text-[15px] font-semibold', !customer.lastNameCustomer && 'font-normal italic text-muted-foreground')}>
                                  {customer.lastNameCustomer || 'Sin apellido'}
                                </span>
                                <span className="block text-[12.5px] text-muted-foreground">
                                  {VEHICLE_TYPE_LABEL[customer.vehicleType] || customer.vehicleType} · {customer.visits} visitas
                                </span>
                              </span>
                              <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
                            </button>
                          ))}
                        </div>
                        {frequentCustomers.length > coincidencias.length && (
                          <p className="text-xs text-muted-foreground">Seguí escribiendo para ver los otros {frequentCustomers.length - coincidencias.length}.</p>
                        )}
                      </>
                    ) : frequentQuery.trim().length >= 2 ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">Sin coincidencias en frecuentes. Completá los datos y registrá la entrada.</p>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground short:hidden">Al escribir aparecen los clientes frecuentes con sus datos.</p>
                    )}
                    {showFormatWarning && <p className="text-xs text-gm-orange">Revisá la patente: el formato no es el habitual. Si buscaste un cliente, elegilo de la lista.</p>}
                  </div>
                </div>

                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className={etiqueta}>Tipo de vehículo</FormLabel>
                    <FormControl>
                      <VehicleTypeButtons value={field.value} onChange={field.onChange} disabled={isPending} onValidityChange={setVehicleValid} onSelectedNameChange={setVehicleName} detectando={tipoDetectado?.estado === 'buscando'} />
                    </FormControl>
                    <FormMessage />
                    {tipoDetectado?.estado === 'listo' && (
                      <div role="status" className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gm-yellow" aria-hidden />
                        <span className="min-w-0">
                          {tipoDetectado.aplicado
                            ? <><span className="font-semibold text-foreground">Tipo detectado: {vehicleName ?? nombreTipo(tipoDetectado.resultado.vehicleType!)}</span> · revisalo antes de confirmar.</>
                            : tipoDetectado.resultado.vehicleType
                              ? <>La foto parece {nombreTipo(tipoDetectado.resultado.vehicleType)}; quedó el tipo que elegiste.</>
                              : 'No se pudo detectar el tipo con la foto: elegilo a mano.'}
                          {tipoDetectado.modeloAplicado && (
                            <span className="block"><span className="font-semibold text-foreground">Modelo: {tipoDetectado.resultado.modelo}</span> · lo podés corregir abajo.</span>
                          )}
                        </span>
                      </div>
                    )}
                  </FormItem>
                )} />

                {!mostrarDatos && (
                  <button
                    type="button"
                    aria-expanded={false}
                    aria-controls="entrada-datos-cliente"
                    onClick={() => setDatosAbiertos(true)}
                    className="flex min-h-[54px] w-full shrink-0 items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-gm-line-strong px-3.5 text-left transition-colors hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow short:min-h-12"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-gm-surface-3 text-gm-yellow"><Plus className="size-[18px]" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold">{gratuita ? 'Agregar apellido, DNI o modelo' : 'Agregar apellido, WhatsApp o modelo'}</span>
                      <span className="block truncate text-xs text-muted-foreground">Opcional · lo encontrás más rápido la próxima vez</span>
                    </span>
                    <ChevronDown className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                )}
                {/* Montados aunque estén plegados: el formulario conserva lo que trajo un frecuente. */}
                <div id="entrada-datos-cliente" hidden={!mostrarDatos} className="shrink-0 space-y-3 rounded-2xl border border-border bg-gm-surface-2/40 p-3.5 short:p-3">
                  <p className={cn(etiqueta, 'flex items-baseline justify-between')}>
                    <span>Datos del cliente</span>
                    <span className="text-xs font-normal normal-case tracking-normal">Opcionales</span>
                  </p>
                  <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    <FormField control={form.control} name="lastNameCustomer" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-semibold">Apellido</FormLabel>
                        <FormControl><input disabled={isPending} autoComplete="family-name" placeholder="Apellido" {...field} className={campo} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {gratuita ? (
                      <FormField control={form.control} name="documentoCustomer" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[13px] font-semibold">DNI</FormLabel>
                          <FormControl><input inputMode="numeric" autoComplete="off" placeholder="30123456" disabled={isPending} {...field} className={cn(campo, 'gm-mono')} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ) : (
                      <FormField control={form.control} name="phoneCustomer" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[13px] font-semibold">WhatsApp</FormLabel>
                          <FormControl><input type="tel" autoComplete="tel" placeholder="+54 9 11 1234 5678" disabled={isPending} {...field} className={cn(campo, 'gm-mono')} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    {/* El modelo, en las dos modalidades, con los comunes del tipo elegido como sugerencia: se puede escribir otro. */}
                    <FormField control={form.control} name="modeloVehiculo" render={({ field }) => (
                      <FormItem className="space-y-1.5 min-[360px]:col-span-2">
                        <FormLabel className="text-[13px] font-semibold">Modelo del vehículo</FormLabel>
                        <FormControl><ModeloVehiculoInput tipoVehiculo={tipoElegido} disabled={isPending} {...field} className={campo} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground short:hidden">
                    {gratuita ? 'Apellido y DNI identifican a quién entró; el modelo ayuda a reconocer el vehículo.' : 'WhatsApp con código de país: con su teléfono lo encontrás desde la primera visita.'}
                  </p>
                </div>
              </ActionDialogBody>

              <ActionDialogFooter>
                <ActionDialogSecondaryButton tone="ghost" className="hidden sm:inline-flex" onClick={cerrar}>Cancelar</ActionDialogSecondaryButton>
                <ActionDialogPrimaryButton
                  type="submit"
                  disabled={isPending || !vehicleValid || !plateValue.trim()}
                  detail={plateValue.trim() ? [plateValue, vehicleName].filter(Boolean).join(' · ') : 'Escribí o escaneá la patente'}
                >
                  {isPending ? 'Registrando entrada…' : 'Registrar entrada'}
                </ActionDialogPrimaryButton>
              </ActionDialogFooter>
            </form>
          </Form>
        )}
      </ActionDialogContent>
    </ActionDialog>
    <ParkingReceiptDelivery registrationId={receiptId} kind="ENTRY" onDismiss={() => setReceiptId(null)} />
    </>
  );
}
