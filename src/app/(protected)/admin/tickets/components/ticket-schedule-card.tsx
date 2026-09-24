'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ticketScheduleSchema, TicketScheduleSchemaType } from '@/schemas/ticket-schedule.schema';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { TicketSchedule } from '@/services/tickets.service';

export function TicketScheduleCard({ schedule }: { schedule: TicketSchedule }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<TicketScheduleSchemaType>({
    resolver: zodResolver(ticketScheduleSchema),
    defaultValues: {
      dayStartHour: schedule.dayStartHour,
      dayEndHour: schedule.dayEndHour,
      graceMinutes: schedule.graceMinutes,

      pricingDayTypeBasis: schedule.pricingDayTypeBasis ?? 'EXIT',
    },
  });

  const onSubmit = (values: TicketScheduleSchemaType) => {
    startTransition(async () => {
      const response = await updateTicketScheduleAction(values);
      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success('Configuración actualizada exitosamente');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">


        <FormField control={form.control} name="pricingDayTypeBasis" render={({ field }) => (
          <FormItem>
            <FormLabel>Horario de referencia</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={isPending || schedule.pricingOptions?.crossing.enabled}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent><SelectItem value="ENTRY">Hora de entrada</SelectItem><SelectItem value="EXIT">Hora de salida</SelectItem></SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{schedule.pricingOptions?.crossing.enabled ? 'Esta elección está reemplazada por la opción Cruces de horario en Cómo cobrar.' : 'Se usa este horario para elegir el precio de toda la estadía. Los cambios se aplican a las próximas entradas.'}</p>
            <FormMessage />
          </FormItem>
        )} />
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            De esta hora a esta hora se cobra la tarifa &quot;Dia&quot;; el resto del tiempo se cobra &quot;Noche&quot;. La tolerancia es cuántos minutos de gracia se dan antes de saltar a cobrar la franja de precio siguiente.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              control={form.control}
              name="dayStartHour"
              render={({ field }) => (
                <FormItem className="w-28">
                  <FormLabel>Desde (hora)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={23} disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dayEndHour"
              render={({ field }) => (
                <FormItem className="w-28">
                  <FormLabel>Hasta (hora)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={23} disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="graceMinutes"
              render={({ field }) => (
                <FormItem className="w-32">
                  <FormLabel>Tolerancia (min)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
