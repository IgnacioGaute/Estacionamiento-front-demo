'use client';
import { useTenant } from '@/components/tenant-provider';

import { VehicleTypePicker } from '@/components/vehicle-type-options';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
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
import { AlertTriangle, Barcode, CarFront, CheckCircle2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entryByPlateSchema, EntryByPlateSchemaType } from '@/schemas/entry-by-plate.schema';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { startScanner } from '@/services/scanner.service';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { FrequentCustomer } from '@/types/frequent-customer.type';
import { PlateCameraScanButton } from './plate-camera-scan-button';

const VEHICLE_TYPE_LABEL: Record<string, string> = { AUTO: 'Auto', CAMIONETA: 'Camioneta' };

// Chequeo liviano, solo para el aviso — el server siempre recalcula y es la fuente de verdad.
function looksLikeKnownPlateFormat(raw: string): boolean {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (
    /^[A-Z]{3}\d{3}$/.test(normalized) ||
    /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalized) ||
    /^\d{3}[A-Z]{3}$/.test(normalized) ||
    /^[A-Z]\d{3}[A-Z]{3}$/.test(normalized)
  );
}

type DuplicateError = { existingRegistrationId?: string; entryTime?: string; message: string };

export function EntryByPlateDialog({
  onGoToRegistration,
  onTicketRegistered,
  ticketEntryEnabled,
  triggerRef,
  triggerStyle,
}: {
  onGoToRegistration?: (id: string) => void;
  // Se dispara cuando la pestaña "Ticket" registra una entrada (mismo endpoint que usa el
  // escáner físico) — el padre re-hace fetch de los registros igual que con el escáner.
  onTicketRegistered?: () => void;
  ticketEntryEnabled?: boolean;
  triggerRef?: (el: HTMLElement | null) => void;
  triggerStyle?: React.CSSProperties;
}) {
  const { playaId } = useTenant();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [duplicateError, setDuplicateError] = useState<DuplicateError | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [method, setMethod] = useState<'PLATE' | 'TICKET'>('PLATE');
  const [ticketCode, setTicketCode] = useState('');
  const [ticketPending, setTicketPending] = useState(false);
  const [frequentCustomers, setFrequentCustomers] = useState<FrequentCustomer[]>([]);
  const [frequentQuery, setFrequentQuery] = useState('');
  const [selectedFrequent, setSelectedFrequent] = useState<FrequentCustomer | null>(null);

  useEffect(() => {
    if (!open) return;
    getFrequentCustomersAction({ minVisits: 2 }).then(setFrequentCustomers);
  }, [open]);

  const filteredFrequent = useMemo(() => {
    const q = frequentQuery.trim();
    if (!q) return [];
    const qNorm = sanitizePlateInput(q);
    const qLower = q.toLowerCase();
    return frequentCustomers.filter(
      (c) =>
        (qNorm && c.licensePlateNormalized.includes(qNorm)) ||
        (c.lastNameCustomer && c.lastNameCustomer.toLowerCase().includes(qLower)),
    );
  }, [frequentQuery, frequentCustomers]);

  const form = useForm<EntryByPlateSchemaType>({
    resolver: zodResolver(entryByPlateSchema),
    defaultValues: {
      licensePlate: '',
      vehicleType: 'AUTO',
      casilleroNumber: '',
      lastNameCustomer: '',
    },
  });

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
        resetAll();
        setOpen(false);
      }
    });
  };

  const onSubmit = (values: EntryByPlateSchemaType) => submit(values, false);
  const submitFrequentDirect = () => {
    if (!selectedFrequent) return;
    submit(
      {
        licensePlate: selectedFrequent.licensePlateOriginal,
        vehicleType: selectedFrequent.vehicleType,
        casilleroNumber: '',
        lastNameCustomer: selectedFrequent.lastNameCustomer ?? '',
      },
      false,
    );
  };
  const onConfirmOverride = () => {
    if (!overrideReason.trim()) {
      toast.error('Ingresá el motivo.');
      return;
    }
    submit(form.getValues(), true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAll(); setOpen(o); }}>
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

      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Registrar entrada</DialogTitle>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="frequent-entry-search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clientes frecuentes
                </label>

                {selectedFrequent ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-gm-yellow bg-gm-yellow/10 p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <CheckCircle2 className="size-5 shrink-0 text-gm-yellow" />
                        <div className="flex min-w-0 flex-col">
                          <span className="gm-mono text-[15px] font-bold tracking-[0.04em]">
                            {selectedFrequent.licensePlateOriginal}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {selectedFrequent.lastNameCustomer ?? 'Sin apellido'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFrequent(null);
                          setFrequentQuery('');
                        }}
                        aria-label="Cambiar vehículo frecuente"
                        className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border text-muted-foreground transition-colors hover:bg-gm-surface-3 hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="gm-mono inline-flex items-center rounded-full border border-gm-line-strong bg-gm-surface-2 px-2 py-0.5 text-[10px] text-foreground">
                        {VEHICLE_TYPE_LABEL[selectedFrequent.vehicleType] ?? selectedFrequent.vehicleType}
                      </span>
                      <span className="gm-mono inline-flex items-center rounded-full border border-gm-yellow/30 bg-gm-yellow/15 px-2 py-0.5 text-[10px] text-gm-yellow">
                        {selectedFrequent.visits} visitas
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="frequent-entry-search"
                      placeholder="Buscar por patente o apellido..."
                      value={frequentQuery}
                      onChange={(e) => setFrequentQuery(e.target.value)}
                      className="h-11 pl-10 pr-3 text-base"
                    />
                    </div>
                    {frequentQuery.trim() && (
                      <div className="mt-2 max-h-[180px] overflow-y-auto rounded-2xl border border-gm-line-strong bg-gm-surface-2">
                        {filteredFrequent.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No se encontraron coincidencias.
                          </div>
                        ) : (
                          filteredFrequent.map((c) => (
                            <button
                              type="button"
                              key={c.licensePlateNormalized}
                              onClick={() => {
                                setSelectedFrequent(c);
                                setFrequentQuery('');
                              }}
                              className="flex min-h-16 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gm-line-strong px-3.5 py-3 text-left last:border-b-0 hover:bg-gm-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow"
                            >
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="gm-mono truncate text-sm font-bold leading-5">{c.licensePlateOriginal}</span>
                                <span className="truncate text-[11.5px] text-muted-foreground">
                                  {c.lastNameCustomer ?? 'Sin apellido'}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className="gm-mono inline-flex items-center rounded-full border border-gm-line-strong bg-card px-2 py-0.5 text-[9.5px] text-muted-foreground">
                                  {VEHICLE_TYPE_LABEL[c.vehicleType] ?? c.vehicleType}
                                </span>
                                <span className="gm-mono inline-flex items-center rounded-full border border-gm-yellow/30 bg-gm-yellow/15 px-2 py-0.5 text-[9.5px] text-gm-yellow">
                                  {c.visits} visitas
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedFrequent ? (
                <button
                  type="button"
                  onClick={submitFrequentDirect}
                  disabled={isPending}
                  className="gm-display w-full h-[52px] rounded-2xl bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-sm font-bold text-gm-ink disabled:opacity-50"
                >
                  Registrar entrada
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    o completá los datos manualmente
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <FormField
                    control={form.control}
                    name="licensePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patente</FormLabel>
                        <FormControl>
                          <Input
                            disabled={isPending}
                            placeholder="AB123CD"
                            {...field}
                            onChange={(e) => field.onChange(sanitizePlateInput(e.target.value))}
                            className="h-16 rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 text-center gm-mono text-2xl md:text-2xl font-bold uppercase tracking-[0.12em]"
                          />
                        </FormControl>
                        {showFormatWarning && (
                          <p className="text-xs text-gm-orange">Verificá la patente — el formato no es el habitual, pero se puede guardar igual.</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <PlateCameraScanButton
                    disabled={isPending}
                    onRecognized={(plate) => form.setValue('licensePlate', plate, { shouldValidate: true })}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Vehículo</FormLabel>
                        <FormControl>
                          <VehicleTypePicker value={field.value} onChange={field.onChange} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastNameCustomer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido (opcional)</FormLabel>
                        <FormControl>
                          <Input disabled={isPending} placeholder="Escriba apellido" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={isPending}
                    className="gm-display w-full h-[52px] rounded-2xl bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-sm font-bold text-gm-ink disabled:opacity-50"
                  >
                    Registrar entrada
                  </button>
                </>
              )}
            </form>
          </Form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
