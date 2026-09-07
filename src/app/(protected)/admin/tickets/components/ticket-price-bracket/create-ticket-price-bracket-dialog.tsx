'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ticketPriceBracketSchema, TicketPriceBracketSchemaType } from '@/schemas/ticket-price-bracket.schema';
import { createTicketPriceBracketAction } from '@/actions/tickets/create-ticket-price-bracket.action';
import { amountUnitToMinutes, DurationUnit, formatMinutesLabel, formatRecurringUnitLabel } from '@/utils/ticket-price-bracket.utils';

export function CreateTicketPriceBracketDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [noLimit, setNoLimit] = useState(false);
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<DurationUnit>('MIN');
  const [recurring, setRecurring] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState<number>(1);
  const [recurringUnit, setRecurringUnit] = useState<DurationUnit>('DAY');

  const form = useForm<TicketPriceBracketSchemaType>({
    resolver: zodResolver(ticketPriceBracketSchema),
    defaultValues: {
      label: '',
      vehicleType: 'AUTO',
      ticketDayType: undefined,
      uptoMinutes: undefined,
      price: undefined,
    },
  });

  const onSubmit = (values: TicketPriceBracketSchemaType) => {
    startTransition(async () => {
      const data = await createTicketPriceBracketAction({
        ...values,
        uptoMinutes: noLimit ? undefined : amountUnitToMinutes(amount, unit),
        recurringUnitMinutes: noLimit && recurring ? amountUnitToMinutes(recurringAmount, recurringUnit) : undefined,
      });
      if (!data || data.error) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'Error desconocido');
      } else {
        toast.success('Franja de precio creada exitosamente');
        form.reset();
        setNoLimit(false);
        setAmount(1);
        setUnit('MIN');
        setRecurring(false);
        setRecurringAmount(1);
        setRecurringUnit('DAY');
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-tour="tickets-price-create" onClick={() => setOpen(true)}>
          Crear Franja de Precio
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Crear Franja de Precio</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la franja</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} placeholder='Ej: "Hasta 1 hora", "3 días"' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Vehículo</FormLabel>
                  <FormControl>
                    <Select disabled={isPending} onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">Auto</SelectItem>
                        <SelectItem value="CAMIONETA">Camioneta</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketDayType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isPending}
                      onValueChange={(value) => field.onChange(value === 'ANY' ? undefined : value)}
                      defaultValue="ANY"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un horario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Cualquiera (día o noche)</SelectItem>
                        <SelectItem value="DAY">Día</SelectItem>
                        <SelectItem value="NIGHT">Noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Última franja (sin límite de tiempo)</FormLabel>
                <Switch checked={noLimit} onCheckedChange={setNoLimit} disabled={isPending} />
              </div>
            </FormItem>

            {!noLimit && (
              <div className="flex gap-2">
                <FormItem className="flex-1">
                  <FormLabel>Hasta</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      disabled={isPending}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
                <FormItem className="w-32">
                  <FormLabel>Unidad</FormLabel>
                  <FormControl>
                    <Select disabled={isPending} value={unit} onValueChange={(v) => setUnit(v as DurationUnit)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIN">Minutos</SelectItem>
                        <SelectItem value="HOUR">Horas</SelectItem>
                        <SelectItem value="DAY">Días</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              </div>
            )}

            {!noLimit && (
              <p className="-mt-2 text-xs text-gm-yellow">
                Esta franja queda configurada como: <strong>{formatMinutesLabel(amountUnitToMinutes(amount, unit))}</strong> — revisá que coincida con el nombre de arriba.
              </p>
            )}

            {noLimit && (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Tarifa recurrente (en vez de un monto fijo único)</FormLabel>
                  <Switch checked={recurring} onCheckedChange={setRecurring} disabled={isPending} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {recurring
                    ? 'El precio se va a cobrar repetidas veces según cuánto dure la estadía (ej. "$1500 por cada día").'
                    : 'Sin esto, "sin límite" cobra un monto fijo una sola vez, sin importar cuánto más se quede — no suele tener sentido si no sabés cuánto va a durar la estadía.'}
                </p>
              </FormItem>
            )}

            {noLimit && recurring && (
              <div className="flex gap-2">
                <FormItem className="flex-1">
                  <FormLabel>Cada</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      disabled={isPending}
                      value={recurringAmount}
                      onChange={(e) => setRecurringAmount(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
                <FormItem className="w-32">
                  <FormLabel>Unidad</FormLabel>
                  <FormControl>
                    <Select disabled={isPending} value={recurringUnit} onValueChange={(v) => setRecurringUnit(v as DurationUnit)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIN">Minutos</SelectItem>
                        <SelectItem value="HOUR">Horas</SelectItem>
                        <SelectItem value="DAY">Días</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              </div>
            )}

            {noLimit && recurring && (
              <p className="-mt-2 text-xs text-gm-yellow">
                Se va a cobrar {formatRecurringUnitLabel(amountUnitToMinutes(recurringAmount, recurringUnit))} de estadía.
              </p>
            )}

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{noLimit && recurring ? 'Precio por cada bloque' : 'Precio'}</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" type="submit" disabled={isPending}>
              Crear Franja de Precio
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
