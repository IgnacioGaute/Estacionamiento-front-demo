'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Clock3, CreditCard, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { advancePaymentSchema, AdvancePaymentSchemaType } from '@/schemas/ticket-price-bracket.schema';
import { addAdvancePaymentAction } from '@/actions/tickets/add-advance-payment.action';
import { previewPlannedStayAction } from '@/actions/tickets/preview-price.action';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { formatMinutesLabel } from '@/utils/ticket-price-bracket.utils';

const money = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
type DurationChoice = { id: string; label: string; minutes: number };

export function AdvancePaymentDialog({
  registrationId, codeBar, vehicleType, existingRegistration, priceBrackets, open, onOpenChange, onSuccess,
}: {
  registrationId: string | null;
  codeBar?: string;
  vehicleType?: string;
  existingRegistration: TicketRegistration | null;
  priceBrackets: TicketPriceBracket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<'LATER' | 'FULL'>('LATER');
  const [metodo, setMetodo] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [preview, setPreview] = useState<{ price: number; ticketDayType: 'DAY' | 'NIGHT' | 'MIXED' } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unmatchedExistingLabel, setUnmatchedExistingLabel] = useState<string | null>(null);

  const choices = useMemo<DurationChoice[]>(() => {
    const brackets = (existingRegistration?.pricingSnapshot?.brackets ?? priceBrackets)
      .filter((row) => row.vehicleType === vehicleType && row.uptoMinutes !== null)
      .sort((a, b) => a.uptoMinutes! - b.uptoMinutes!);
    const byDuration = new Map<number, DurationChoice>();
    for (const row of brackets) {
      const minutes = row.uptoMinutes!;
      const duplicate = brackets.some((other) => other.id !== row.id && other.uptoMinutes === minutes);
      if (!byDuration.has(minutes)) byDuration.set(minutes, { id: row.id, minutes, label: duplicate ? formatMinutesLabel(minutes) : row.label });
    }
    if (!byDuration.size) {
      const charging = existingRegistration?.pricingSnapshot?.schedule.pricingOptions?.charging;
      if (charging?.enabled) {
        for (const minutes of [...new Set([charging.unitMinutes, charging.unitMinutes * 2, 1440])].filter((value) => value > 0).sort((a, b) => a - b)) {
          byDuration.set(minutes, { id: `unit-${minutes}`, minutes, label: formatMinutesLabel(minutes) });
        }
      }
    }
    return [...byDuration.values()];
  }, [existingRegistration?.pricingSnapshot, priceBrackets, vehicleType]);

  const selectedChoice = choices.find((choice) => choice.minutes === selectedMinutes);
  const collected = existingRegistration?.advancePaidAmount ?? 0;
  const dueNow = preview ? Math.max(0, preview.price - collected) : null;
  const exceedsTariff = preview !== null && collected > preview.price;
  const form = useForm<AdvancePaymentSchemaType>({
    resolver: zodResolver(advancePaymentSchema),
    defaultValues: { lastNameCustomer: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ lastNameCustomer: existingRegistration?.lastNameCustomer ?? '' });
    const savedMinutes = existingRegistration?.expectedUptoMinutes;
    const match = choices.find((choice) => choice.minutes === savedMinutes);
    setSelectedMinutes(match?.minutes ?? null);
    setUnmatchedExistingLabel(savedMinutes && !match ? existingRegistration?.expectedBracketLabel ?? formatMinutesLabel(savedMinutes) : null);
    setPaymentChoice('LATER');
    setMetodo('CASH');
    // Se precarga una sola vez por apertura; cambiar de opción no debe reiniciar la elección.
  }, [open, existingRegistration?.id]);

  useEffect(() => {
    if (!open || !registrationId || selectedMinutes === null) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    previewPlannedStayAction(registrationId, selectedMinutes).then((result) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (result.error || result.price === undefined || !result.ticketDayType) setPreviewError(result.error ?? 'No se pudo calcular esta tarifa.');
      else setPreview({ price: result.price, ticketDayType: result.ticketDayType });
    });
    return () => { cancelled = true; };
  }, [open, registrationId, selectedMinutes]);

  const onSubmit = (values: AdvancePaymentSchemaType) => {
    if (!registrationId) return;
    if (paymentChoice === 'FULL' && (!selectedChoice || !preview || exceedsTariff)) return;
    startTransition(async () => {
      const data = await addAdvancePaymentAction(registrationId, {
        lastNameCustomer: values.lastNameCustomer,
        expectedBracketLabel: selectedChoice?.label ?? null,
        expectedUptoMinutes: selectedChoice?.minutes ?? null,
        chargeFullPlannedStay: paymentChoice === 'FULL',
        metodo: paymentChoice === 'FULL' && dueNow !== null && dueNow > 0 ? metodo : undefined,
      });
      if (!data || data.error) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'No se pudo guardar la estadía.');
        return;
      }
      toast.success(paymentChoice === 'FULL' ? 'Tarifa cobrada y estadía planificada guardada.' : 'Estadía planificada guardada.');
      onOpenChange(false);
      onSuccess?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,850px)] w-[calc(100vw-24px)] max-w-[680px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-gm-line-strong px-6 py-5 text-left sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gm-yellow">Estadía planificada{codeBar ? ` · Ticket ${codeBar}` : ''}</p>
          <DialogTitle className="gm-display text-2xl">Elegí una duración y cómo cobrarla</DialogTitle>
          <p className="text-sm text-muted-foreground">El importe se calcula con las tarifas de este ticket. Al salir se ajustará según el tiempo real.</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-gm-yellow" /> Duración prevista</div>
                {unmatchedExistingLabel && <p className="mb-3 rounded-lg border border-gm-yellow/30 bg-gm-yellow/10 p-3 text-sm">Duración anterior: {unmatchedExistingLabel}. Elegí una nueva para actualizarla.</p>}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Duración prevista">
                  <button type="button" disabled={isPending} aria-pressed={selectedMinutes === null} onClick={() => { setSelectedMinutes(null); setPaymentChoice('LATER'); }} className={cn('min-h-20 rounded-xl border p-3 text-left transition-colors', selectedMinutes === null ? 'border-gm-yellow bg-gm-yellow/10' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50')}>
                    <span className="block font-semibold">Sin definir</span><span className="text-xs text-muted-foreground">Se cobra al salir</span>
                  </button>
                  {choices.map((choice) => <button key={choice.id} type="button" disabled={isPending} aria-pressed={selectedMinutes === choice.minutes} onClick={() => setSelectedMinutes(choice.minutes)} className={cn('min-h-20 rounded-xl border p-3 text-left transition-colors', selectedMinutes === choice.minutes ? 'border-gm-yellow bg-gm-yellow/10 shadow-[inset_0_0_0_1px_rgba(250,204,21,.3)]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50')}>
                    <span className="block font-semibold">{choice.label}</span><span className="text-xs text-muted-foreground">{formatMinutesLabel(choice.minutes)}</span>
                  </button>)}
                </div>
                {choices.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No hay duraciones configuradas para este vehículo.</p>}
                <p className="mt-3 text-xs text-muted-foreground">Si supera lo previsto, el operador verá un aviso al registrar la salida.</p>
              </section>

              {selectedChoice && <section className="rounded-2xl border border-gm-line-strong bg-gm-surface-2 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarifa de {selectedChoice.label}</p><p className="mt-1 text-sm text-muted-foreground">{preview?.ticketDayType === 'NIGHT' ? 'Horario nocturno' : preview?.ticketDayType === 'DAY' ? 'Horario diurno' : preview?.ticketDayType === 'MIXED' ? 'Día y noche' : 'Según el horario del ticket'}</p></div>
                  <p className="text-2xl font-bold tabular-nums text-gm-yellow">{previewLoading ? 'Calculando…' : preview ? money(preview.price) : '—'}</p>
                </div>
                {previewError && <p className="mt-3 text-sm text-red-400" role="alert">{previewError}</p>}
                {collected > 0 && <p className="mt-3 border-t border-gm-line-strong pt-3 text-sm text-muted-foreground">Ya cobrado: {money(collected)}{dueNow !== null ? ` · Falta para esta tarifa: ${money(dueNow)}` : ''}</p>}
              </section>}

              <section>
                <p className="mb-3 text-sm font-semibold">Cobro</p>
                <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Cuándo cobrar">
                  <button type="button" disabled={isPending} aria-pressed={paymentChoice === 'LATER'} onClick={() => setPaymentChoice('LATER')} className={cn('flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-colors', paymentChoice === 'LATER' ? 'border-gm-yellow bg-gm-yellow/10' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50')}>
                    <Clock3 className="h-5 w-5 shrink-0 text-gm-yellow" /><span><strong className="block text-sm">{collected > 0 ? 'Sin nuevo cobro' : 'Cobrar al salir'}</strong><small className="text-muted-foreground">Guardar sólo la duración</small></span>
                  </button>
                  <button type="button" disabled={isPending || !selectedChoice || !preview || exceedsTariff} aria-pressed={paymentChoice === 'FULL'} onClick={() => setPaymentChoice('FULL')} className={cn('flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45', paymentChoice === 'FULL' ? 'border-gm-yellow bg-gm-yellow/10' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50')}>
                    <Wallet className="h-5 w-5 shrink-0 text-gm-yellow" /><span><strong className="block text-sm">Cobrar tarifa completa</strong><small className="text-muted-foreground">{preview ? `${money(dueNow ?? 0)} ahora` : 'Elegí una duración'}</small></span>
                  </button>
                </div>
                {exceedsTariff && <p className="mt-2 text-sm text-gm-yellow">Lo ya cobrado supera esta tarifa. Podés guardar la duración; la devolución se gestiona aparte.</p>}
                {paymentChoice === 'FULL' && dueNow !== null && dueNow > 0 && <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold">Medio de pago · {money(dueNow)}</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Medio de pago">
                    {(['CASH', 'TRANSFER'] as const).map((method) => <button key={method} type="button" disabled={isPending} aria-pressed={metodo === method} onClick={() => setMetodo(method)} className={cn('flex h-12 items-center justify-center gap-2 rounded-xl border font-semibold transition-colors', metodo === method ? 'border-gm-yellow bg-gm-yellow/10 text-gm-yellow' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50')}><CreditCard className="h-4 w-4" />{method === 'CASH' ? 'Efectivo' : 'Transferencia'}</button>)}
                  </div>
                </div>}
              </section>

              <FormField control={form.control} name="lastNameCustomer" render={({ field }) => <FormItem><FormLabel>Apellido del cliente <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel><FormControl><Input disabled={isPending} placeholder="Apellido" {...field} className="h-12 rounded-xl bg-gm-surface-2" /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div className="border-t border-gm-line-strong bg-gm-surface-2 px-6 py-4 sm:px-8">
              <button type="submit" disabled={isPending || (paymentChoice === 'FULL' && (!preview || exceedsTariff))} className="gm-display h-12 w-full rounded-xl bg-gm-yellow font-bold text-gm-ink transition-opacity disabled:opacity-50">{isPending ? 'Guardando…' : paymentChoice === 'FULL' && dueNow !== null && dueNow > 0 ? `Cobrar ${money(dueNow)} y guardar` : 'Guardar estadía'}</button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
