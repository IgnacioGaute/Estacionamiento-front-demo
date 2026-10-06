'use client';
import { useTenant } from '@/components/tenant-provider';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';

import { VehicleTypeButtons } from '@/components/vehicle-type-options';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { AlertTriangle, Barcode, CarFront, CheckCircle2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entryByPlateSchema, EntryByPlateSchemaType } from '@/schemas/entry-by-plate.schema';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { startScanner } from '@/services/scanner.service';
import { looksLikeKnownPlateFormat, sanitizePlateInput } from '@/utils/plate.utils';
import { FrequentCustomer } from '@/types/frequent-customer.type';
import { PlateCameraScanButton } from './plate-camera-scan-button';

const VEHICLE_TYPE_LABEL: Record<string, string> = { AUTO: 'Auto', CAMIONETA: 'Camioneta' };

type DuplicateError = { existingRegistrationId?: string; entryTime?: string; message: string };

export function EntryByPlateDialog({
  onGoToRegistration,
  onTicketRegistered,
  ticketEntryEnabled,
  triggerRef,
  triggerStyle,
  scanRequest,
  onOpenChange,
}: {
  onGoToRegistration?: (id: string) => void;
  // Se dispara cuando la pestaña "Ticket" registra una entrada (mismo endpoint que usa el
  // escáner físico) — el padre re-hace fetch de los registros igual que con el escáner.
  onTicketRegistered?: () => void;
  ticketEntryEnabled?: boolean;
  triggerRef?: (el: HTMLElement | null) => void;
  triggerStyle?: React.CSSProperties;
  scanRequest?: { plate: string; sequence: number } | null;
  onOpenChange?: (open: boolean) => void;
}) {
  const { playaId } = useTenant();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [duplicateError, setDuplicateError] = useState<DuplicateError | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [method, setMethod] = useState<'PLATE' | 'TICKET'>('PLATE');
  const [ticketCode, setTicketCode] = useState('');
  const [ticketPending, setTicketPending] = useState(false);
  const [frequentCustomers, setFrequentCustomers] = useState<FrequentCustomer[]>([]);
  const [frequentQuery, setFrequentQuery] = useState('');
  const [selectedFrequent, setSelectedFrequent] = useState<FrequentCustomer | null>(null);
  const [frequentLoading, setFrequentLoading] = useState(false);
  const [frequentError, setFrequentError] = useState('');
  const [vehicleValid, setVehicleValid] = useState(false);

  const form = useForm<EntryByPlateSchemaType>({
    resolver: zodResolver(entryByPlateSchema),
    defaultValues: {
      licensePlate: '',
      vehicleType: 'AUTO',
      casilleroNumber: '',
      lastNameCustomer: '',
      phoneCustomer: '',
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

  useEffect(() => {
    if (!scanRequest) return;
    form.reset({ licensePlate: scanRequest.plate, vehicleType: 'AUTO', casilleroNumber: '', lastNameCustomer: '', phoneCustomer: '' });
    setDuplicateError(null);
    setOverrideReason('');
    setMethod('PLATE');
    setSelectedFrequent(null);
    setFrequentQuery(scanRequest.plate);
    setOpen(true);
  }, [scanRequest, form]);

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
    setMethod('PLATE');
    setTicketCode('');
    setFrequentQuery('');
    setSelectedFrequent(null);
    setFrequentCustomers([]);
    setFrequentError('');
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

  const submit = (values: EntryByPlateSchemaType, override?: boolean) => {
    startTransition(async () => {
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

  return (
    <><Dialog open={open} onOpenChange={(o) => { if (!o) resetAll(); setOpen(o); }}>
      <DialogTrigger asChild>
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
      </DialogTrigger>

      <DialogContent ref={dialogRef} onOpenAutoFocus={event => { if (scanRequest && frequentQuery === scanRequest.plate) { event.preventDefault(); dialogRef.current?.focus(); } }} className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90dvh] rounded-2xl sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Registrar entrada</DialogTitle>
          <DialogDescription className="text-center text-xs">Buscá o escaneá la patente y revisá los datos antes de confirmar.</DialogDescription>
        </DialogHeader>

        {duplicateError ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3 text-sm text-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-gm-orange mt-0.5" />
              {duplicateError.message}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  if (duplicateError.existingRegistrationId) {
                    onGoToRegistration?.(duplicateError.existingRegistrationId);
                  }
                  resetAll();
                  setOpen(false);
                }}
              >
                Ir a ese ticket
              </Button>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">O confirmá que es otro vehículo, indicando el motivo:</p>
                <Input
                  placeholder="Motivo (ej: la salida anterior no se escaneó)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  disabled={isPending}
                />
                <Button type="button" variant="outline" className="w-full" onClick={onConfirmOverride} disabled={isPending}>
                  Es otro vehículo — crear igual
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setDuplicateError(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketEntryEnabled && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethod('PLATE')}
                  className={cn(
                    'gm-display flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-semibold transition-colors',
                    method === 'PLATE'
                      ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                      : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                  )}
                >
                  <CarFront className="size-4" />
                  Patente
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('TICKET')}
                  className={cn(
                    'gm-display flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-semibold transition-colors',
                    method === 'TICKET'
                      ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                      : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                  )}
                >
                  <Barcode className="size-4" />
                  Ticket
                </button>
              </div>
            )}

            {method === 'TICKET' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium leading-none">Número de ticket</label>
                  <Input
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
                    className="gm-mono mt-2 h-16 text-center text-2xl md:text-2xl font-bold tracking-[0.12em]"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Escaneá la tarjeta o escribí el número manualmente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={submitTicket}
                  disabled={ticketPending || !ticketCode}
                  className="gm-display w-full h-[52px] rounded-2xl bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-sm font-bold text-gm-ink disabled:opacity-50"
                >
                  Registrar entrada
                </button>
              </div>
            ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-3">
                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Patente o cliente frecuente</FormLabel>
                      <span className="text-[10px] text-muted-foreground">Buscá o escaneá</span>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        value={frequentQuery}
                        disabled={isPending}
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={50}
                        placeholder="Patente, apellido o teléfono"
                        onChange={(event) => changeQuery(event.target.value)}
                        className="gm-mono h-16 rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 px-4 text-center text-xl font-bold uppercase tracking-[0.06em] placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal md:text-2xl focus-visible:border-gm-yellow"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <PlateCameraScanButton disabled={isPending} onRecognized={changeQuery} />
                <div aria-live="polite">
                  {selectedFrequent ? (
                    <div className="flex items-start gap-3 rounded-xl border border-gm-yellow/25 bg-gm-yellow/5 p-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gm-yellow" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">Cliente frecuente identificado</p>
                        <p className="mt-1 text-xs text-muted-foreground">{selectedFrequent.lastNameCustomer || selectedFrequent.licensePlateOriginal} · {selectedFrequent.visits} {selectedFrequent.visits === 1 ? 'visita' : 'visitas'}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Cargamos sus datos. Podés revisarlos abajo.</p>
                      </div>
                    </div>
                  ) : frequentLoading ? <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Search className="size-3.5" />Buscando frecuentes…</p>
                    : frequentError ? <p className="text-xs text-gm-orange">{frequentError}</p>
                    : frequentCustomers.length ? (
                    <div className="overflow-hidden rounded-xl border border-gm-line-strong bg-gm-surface-2">
                      <p className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clientes que coinciden</p>
                      <div className="max-h-44 overflow-y-auto">
                        {frequentCustomers.map(customer => (
                          <button key={customer.licensePlateNormalized} type="button" disabled={isPending} onClick={() => chooseFrequent(customer)}
                            className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow">
                            <span className="min-w-0"><span className="gm-mono block font-semibold">{customer.licensePlateOriginal}</span><span className="block truncate text-xs text-muted-foreground">{customer.lastNameCustomer || 'Sin apellido'}</span></span>
                            <span className="shrink-0 text-right"><span className="block text-[11px]">{VEHICLE_TYPE_LABEL[customer.vehicleType] || customer.vehicleType}</span><span className="text-[10px] text-muted-foreground">{customer.visits} visitas</span></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-[11px] leading-relaxed text-muted-foreground">{frequentQuery.trim().length >= 2 ? 'Sin coincidencias en frecuentes. Completá los datos para registrar la entrada.' : 'Al escribir aparecen sus visitas y datos guardados.'}</p>}
                </div>
                {showFormatWarning && <p className="text-xs text-gm-orange">Revisá la patente: el formato no es el habitual. Si buscaste un cliente, elegilo de la lista.</p>}
              </div>

              <FormField control={form.control} name="vehicleType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de vehículo</FormLabel><FormControl>
                  <VehicleTypeButtons value={field.value} onChange={field.onChange} disabled={isPending} onValidityChange={setVehicleValid} />
                </FormControl><FormMessage /></FormItem>
              )} />

              <div className="space-y-4 rounded-2xl border border-border bg-gm-surface-2/40 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datos del cliente · opcionales</p>
                <FormField control={form.control} name="lastNameCustomer" render={({ field }) => (
                  <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input disabled={isPending} autoComplete="family-name" placeholder="Apellido del cliente" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneCustomer" render={({ field }) => (
                  <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input type="tel" autoComplete="tel" placeholder="+54 9 11 1234 5678" disabled={isPending} {...field} /></FormControl>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">Incluí el código de país. Con su teléfono lo encontrás desde la primera visita.</p><FormMessage /></FormItem>
                )} />
              </div>
              <div className="sticky -bottom-6 z-10 border-t border-border bg-card pb-6 pt-3">
              <button type="submit" disabled={isPending || !vehicleValid || !plateValue.trim()} className="gm-display h-[52px] w-full rounded-2xl bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-sm font-bold text-gm-ink transition-opacity disabled:opacity-50">
                {isPending ? 'Registrando entrada…' : 'Registrar entrada'}
              </button>
              </div>
            </form>
          </Form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    <ParkingReceiptDelivery registrationId={receiptId} kind="ENTRY" onDismiss={() => setReceiptId(null)} />
    </>
  );
}
