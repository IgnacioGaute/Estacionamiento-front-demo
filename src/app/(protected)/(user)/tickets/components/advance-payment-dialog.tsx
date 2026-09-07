'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { advancePaymentSchema, AdvancePaymentSchemaType } from '@/schemas/ticket-price-bracket.schema';
import { addAdvancePaymentAction } from '@/actions/tickets/add-advance-payment.action';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { formatMinutesLabel } from '@/utils/ticket-price-bracket.utils';
import { sanitizePlateInput } from '@/utils/plate.utils';

export function AdvancePaymentDialog({
  registrationId,
  codeBar,
  vehicleType,
  existingRegistration,
  priceBrackets,
  open,
  onOpenChange,
  onSuccess,
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
  const [paidNow, setPaidNow] = useState(false);
  const [metodo, setMetodo] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [selectedBracketId, setSelectedBracketId] = useState<string>('NONE');
  // Franja avisada anteriormente pero que ya no existe entre las configuradas (el admin la
  // borró o renombró) — se muestra como texto de referencia en vez de perderse.
  const [unmatchedExistingLabel, setUnmatchedExistingLabel] = useState<string | null>(null);

  // Solo tiene sentido "avisar" una franja con techo — una "sin límite" nunca se puede superar.
  const expectedOptions = useMemo(
    () =>
      priceBrackets
        .filter((b) => b.vehicleType === vehicleType && b.uptoMinutes !== null)
        .sort((a, b) => (a.uptoMinutes ?? 0) - (b.uptoMinutes ?? 0)),
    [priceBrackets, vehicleType],
  );
  const selectedBracket = expectedOptions.find((b) => b.id === selectedBracketId);

  // El precio de la franja es solo una sugerencia de arranque — se escribe en el campo real
  // del form para que se guarde tal cual aunque el operador no lo toque, en vez de quedar
  // como un valor de pantalla nada más (así se guardaba $0 si no se retipeaba a mano).
  const applyBracketAsSuggestedAmount = (bracket?: TicketPriceBracket) => {
    if (bracket && !form.getValues('advancePaidAmount')) {
      form.setValue('advancePaidAmount', bracket.price, { shouldValidate: true });
    }
  };

  const form = useForm<AdvancePaymentSchemaType>({
    resolver: zodResolver(advancePaymentSchema),
    defaultValues: {
      advancePaidAmount: undefined,
      firstNameCustomer: '',
      lastNameCustomer: '',
      vehiclePlateCustomer: '',
    },
  });

  const resetAll = () => {
    form.reset();
    setPaidNow(false);
    setMetodo('CASH');
    setSelectedBracketId('NONE');
    setUnmatchedExistingLabel(null);
  };

  // El diálogo es una única instancia persistente (solo cambia `open`), así que hay que
  // reseedear a mano cada vez que se abre para un ticket distinto — si ya tenía una estadía
  // planificada guardada, mostrarla precargada y editable en vez de un formulario vacío.
  useEffect(() => {
    if (!open) return;
    if (!existingRegistration) {
      resetAll();
      return;
    }
    const hasAdvance = !!existingRegistration.advancePaidAmount;
    setPaidNow(hasAdvance);
    form.reset({
      advancePaidAmount: existingRegistration.advancePaidAmount ?? undefined,
      firstNameCustomer: existingRegistration.firstNameCustomer ?? '',
      lastNameCustomer: existingRegistration.lastNameCustomer ?? '',
      vehiclePlateCustomer: existingRegistration.vehiclePlateCustomer ?? '',
    });
    if (existingRegistration.expectedBracketLabel) {
      const match = expectedOptions.find((b) => b.label === existingRegistration.expectedBracketLabel);
      if (match) {
        setSelectedBracketId(match.id);
        setUnmatchedExistingLabel(null);
      } else {
        setSelectedBracketId('NONE');
        setUnmatchedExistingLabel(existingRegistration.expectedBracketLabel);
      }
    } else {
      setSelectedBracketId('NONE');
      setUnmatchedExistingLabel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingRegistration?.id]);

  const onSubmit = (values: AdvancePaymentSchemaType) => {
    if (!registrationId) return;
    startTransition(async () => {
      const data = await addAdvancePaymentAction(registrationId, {
        ...values,
        advancePaidAmount: paidNow ? values.advancePaidAmount : undefined,
        metodo: paidNow ? metodo : undefined,
        expectedBracketLabel: selectedBracket?.label,
        expectedUptoMinutes: selectedBracket?.uptoMinutes ?? undefined,
      });
      if (!data || data.error) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'Error desconocido');
      } else {
        toast.success('Estadía planificada registrada exitosamente');
        resetAll();
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAll(); onOpenChange(o); }}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>
            {existingRegistration?.expectedBracketLabel || existingRegistration?.advancePaidAmount
              ? 'Editar estadía planificada'
              : 'Estadía planificada'}
            {codeBar
              ? ` · Ticket ${codeBar}`
              : existingRegistration?.licensePlateOriginal
              ? ` · ${existingRegistration.licensePlateOriginal}`
              : ''}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>¿Cuánto tiempo avisó que se queda? (opcional)</FormLabel>
              {unmatchedExistingLabel && (
                <p className="text-xs text-gm-orange">
                  Duración guardada anteriormente: &quot;{unmatchedExistingLabel}&quot; (esa franja ya no está disponible). Elegí una nueva si querés actualizarla.
                </p>
              )}
              <FormControl>
                <Select
                  disabled={isPending}
                  value={selectedBracketId}
                  onValueChange={(val) => {
                    setSelectedBracketId(val);
                    if (paidNow) applyBracketAsSuggestedAmount(expectedOptions.find((b) => b.id === val));
                  }}
                >
                  <SelectTrigger className="bg-gm-surface-3 border-gm-line-strong focus:ring-gm-yellow/30">
                    <SelectValue placeholder="Seleccioná una duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No especificar</SelectItem>
                    {expectedOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label} ({formatMinutesLabel(b.uptoMinutes)}) · ${b.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Si al volver se pasó de este tiempo, vas a ver un aviso al escanear la salida.
              </p>
            </FormItem>

            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>¿Pagó algo ahora?</FormLabel>
                <Switch
                  checked={paidNow}
                  onCheckedChange={(v) => {
                    setPaidNow(v);
                    if (v) applyBracketAsSuggestedAmount(selectedBracket);
                  }}
                  disabled={isPending}
                />
              </div>
            </FormItem>

            {paidNow && (
              <>
                <FormField
                  control={form.control}
                  name="advancePaidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto cobrado ahora</FormLabel>
                      <FormControl>
                        <Input type="number" disabled={isPending} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Medio de pago</FormLabel>
                  <div className="grid grid-cols-2 gap-2.5 mt-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setMetodo('CASH')}
                      className={cn(
                        'gm-display flex h-11 items-center justify-center rounded-xl border text-[12px] font-semibold transition-colors',
                        metodo === 'CASH'
                          ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                          : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                      )}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setMetodo('TRANSFER')}
                      className={cn(
                        'gm-display flex h-11 items-center justify-center rounded-xl border text-[12px] font-semibold transition-colors',
                        metodo === 'TRANSFER'
                          ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                          : 'border-gm-line-strong bg-gm-surface-2 text-foreground',
                      )}
                    >
                      Transferencia
                    </button>
                  </div>
                </FormItem>
              </>
            )}

            <FormField
              control={form.control}
              name="lastNameCustomer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido del cliente (opcional)</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} placeholder="Escriba apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehiclePlateCustomer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patente (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      placeholder="Escriba patente"
                      {...field}
                      onChange={(e) => field.onChange(sanitizePlateInput(e.target.value))}
                      className="gm-mono uppercase"
                    />
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
              Guardar
            </button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
