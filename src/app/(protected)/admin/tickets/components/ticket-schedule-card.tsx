'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
      barcodeTicketsEnabled: schedule.barcodeTicketsEnabled,
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
        <FormField
          control={form.control}
          name="barcodeTicketsEnabled"
          render={({ field }) => (
            <FormItem className="rounded-xl border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <FormLabel className="text-sm font-semibold">Tickets por código de barras</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Si lo apagás, en la pantalla de operación no se muestra nada de esto (escáner, grilla de tickets ni esos tickets en &quot;Activos ahora&quot;) — queda solo el flujo por patente.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

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
