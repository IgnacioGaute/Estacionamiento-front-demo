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
import { Pencil } from 'lucide-react';
import { updateTicketPriceSchema, UpdateTicketPriceSchemaType } from '@/schemas/ticket-price.schema';
import { updateTicketPriceAction } from '@/actions/tickets/update-ticket-price.action';
import { ticketPrice } from '@/types/ticket-price';

export function UpdateTicketPriceDialog({ ticketPrice }: { ticketPrice: ticketPrice }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateTicketPriceSchemaType>({
    resolver: zodResolver(updateTicketPriceSchema),
    defaultValues: {
      vehicleType: ticketPrice.vehicleType ?? 'AUTO',
      ticketTimeType: ticketPrice.ticketTimeType ?? 'SEMANA',
      ticketTimePrice: ticketPrice.ticketTimePrice,
    },
  });

  const onSubmit = (values: UpdateTicketPriceSchemaType) => {
    startTransition(async () => {
      const data = await updateTicketPriceAction(ticketPrice.id, values);
      if (!data || 'error' in data) {
        toast.error(data?.error?.message ?? 'Error desconocido');
      } else {
        toast.success('Tarifa editada exitosamente');
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <Pencil className="size-4" />
            </span>
            <div>
              <DialogTitle>Editar tarifa</DialogTitle>
              <DialogDescription className="mt-0.5">Ajustá el precio por unidad.</DialogDescription>
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
              Guardar cambios
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
