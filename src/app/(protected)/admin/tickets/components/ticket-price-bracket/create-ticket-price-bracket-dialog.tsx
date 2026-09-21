'use client';

import { VehicleTypeOptions } from '@/components/vehicle-type-options';
import { RecurringPriceExplanation } from './recurring-price-explanation';

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
import { toast } from '@/lib/toast';
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
      recurringPriceMode: 'FIXED',
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

      <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-md sm:max-w-lg">
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
                        <VehicleTypeOptions />
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
                <FormLabel>Cobrar después de la última duración</FormLabel>
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
                  <FormLabel>Sumar un precio por cada tiempo adicional</FormLabel>
                  <Switch checked={recurring} onCheckedChange={setRecurring} disabled={isPending} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {recurring
                    ? 'Al superar la última duración, se conserva su precio y se suma un importe por cada bloque de tiempo adicional.'
                    : 'Se cobra un único precio TOTAL al superar la última duración. Reemplaza el precio anterior y no aumenta aunque el vehículo se quede más tiempo.'}
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
                Se suma un cobro {formatRecurringUnitLabel(amountUnitToMinutes(recurringAmount, recurringUnit))} de tiempo adicional. Cada bloque que empieza se cobra completo.
              </p>
            )}

            {noLimit && recurring && (
              <FormField control={form.control} name="recurringPriceMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cómo se obtiene el precio adicional?</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FIXED">Ingresar un precio</SelectItem>
                      <SelectItem value="DERIVED">Calcular desde otra tarifa</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{field.value === 'DERIVED' ? 'El sistema toma una tarifa existente y calcula cuánto vale el tiempo que elegiste. Abajo podés ver qué tarifa usa y la cuenta.' : 'Elegís cuánto sumar por cada bloque de tiempo adicional.'}</p>
                </FormItem>
              )} />
            )}
            {noLimit && recurring && <RecurringPriceExplanation vehicle={form.watch('vehicleType')} day={form.watch('ticketDayType')} unitMinutes={amountUnitToMinutes(recurringAmount, recurringUnit)} price={form.watch('price')} derived={form.watch('recurringPriceMode') === 'DERIVED'}  />}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{noLimit && recurring ? form.watch('recurringPriceMode') === 'DERIVED' ? 'Precio de respaldo (si no hay otra tarifa)' : 'Precio por cada bloque adicional' : noLimit ? 'Precio total de la estadía' : 'Precio'}</FormLabel>
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
