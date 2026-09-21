'use client';

import { VehicleTypeOptions } from '@/components/vehicle-type-options';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { Loader2, Plus } from 'lucide-react';
import { ticketPriceSchema, TicketPriceSchemaType } from '@/schemas/ticket-price.schema';
import { createTicketPriceAction } from '@/actions/tickets/create-ticket-price.action';

export function CreateTicketPriceDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<TicketPriceSchemaType>({
    resolver: zodResolver(ticketPriceSchema),
    defaultValues: {
      vehicleType: 'AUTO',
      ticketTimeType: 'SEMANA',
      ticketTimePrice: undefined,
    },
  });

  const onSubmit = (values: TicketPriceSchemaType) => {
    startTransition(async () => {
      const data = await createTicketPriceAction(values);
      if (!data || 'error' in data) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'Error desconocido');
      } else {
        toast.success('Tarifa creada exitosamente');
        form.reset({ vehicleType: 'AUTO', ticketTimeType: 'SEMANA', ticketTimePrice: undefined });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 rounded-md text-[12px] font-semibold" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Nueva tarifa
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <Plus className="size-4" />
            </span>
            <div>
              <DialogTitle>Nueva tarifa por día/semana/mes</DialogTitle>
              <DialogDescription className="mt-0.5">
                Precio por unidad — se multiplica por la cantidad elegida al registrar el ticket.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de vehículo</FormLabel>
                  <FormControl>
                    <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
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
              name="ticketTimeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración</FormLabel>
                  <FormControl>
                    <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una duración" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIA">Día</SelectItem>
                        <SelectItem value="SEMANA">Semana</SelectItem>
                        <SelectItem value="MES">Mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    "Semana y día" o "Mes y día" combinan estas mismas tarifas — no hace falta cargarlas aparte.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketTimePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por unidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      disabled={isPending}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Crear tarifa
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
