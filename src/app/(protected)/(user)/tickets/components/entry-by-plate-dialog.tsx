'use client';

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
import { toast } from 'sonner';
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
    const data = await startScanner({ barCode: ticketCode.trim() });
    setTicketPending(false);
    if (!data || 'error' in data) {
      toast.error((data as { error?: string })?.error ?? 'Error desconocido');
      return;
    }
    if (data.type === 'RECEIPT') {
      toast.error('Ese código corresponde a un recibo, no a un ticket. Usá el escáner para procesarlo.');
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
          className="group relative w-full sm:flex-[1.6] sm:w-auto sm:min-w-[340px] inline-flex h-[72px] sm:h-[84px] items-center gap-4 rounded-[24px] border-none px-6 sm:px-7 text-left bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-gm-ink shadow-[0_10px_30px_-10px_hsl(var(--gm-yellow)/0.5)] transition-all duration-300 hover:shadow-[0_16px_40px_-10px_hsl(var(--gm-yellow)/0.45)] hover:-translate-y-px"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gm-ink/10">
            <CarFront className="size-6" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="gm-display text-[17px] font-bold tracking-[0.02em]">Registrar entrada</span>
            <span className="text-[12px] font-medium normal-case tracking-normal text-gm-ink/70">
              {ticketEntryEnabled ? 'Por patente o por ticket' : 'Por patente'}
            </span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
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
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        className="grid size-7 shrink-0 place-items-center rounded-[10px] border border-border text-muted-foreground transition-colors hover:bg-gm-surface-3 hover:text-foreground"
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
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por patente o apellido..."
                      value={frequentQuery}
                      onChange={(e) => setFrequentQuery(e.target.value)}
                      className="h-11 pl-10"
                    />
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
                              className="flex w-full items-center justify-between gap-2.5 border-b border-gm-line-strong px-3.5 py-2.5 text-left last:border-b-0 hover:bg-gm-surface-3"
                            >
                              <div className="flex min-w-0 flex-col">
                                <span className="gm-mono text-[13.5px] font-bold">{c.licensePlateOriginal}</span>
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
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => field.onChange('AUTO')}
                              className={cn(
                                'gm-display flex h-11 items-center justify-center rounded-xl border text-[12px] font-semibold transition-colors',
                                field.value === 'AUTO'
                                  ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                                  : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                              )}
                            >
                              Auto
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => field.onChange('CAMIONETA')}
                              className={cn(
                                'gm-display flex h-11 items-center justify-center rounded-xl border text-[12px] font-semibold transition-colors',
                                field.value === 'CAMIONETA'
                                  ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                                  : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                              )}
                            >
                              Camioneta
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="casilleroNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Casillero (opcional)</FormLabel>
                        <FormControl>
                          <Input disabled={isPending} placeholder="Escriba número de casillero" {...field} />
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
