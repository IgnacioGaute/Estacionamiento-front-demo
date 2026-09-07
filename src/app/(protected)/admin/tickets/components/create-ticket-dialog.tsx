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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ticketSchema, TicketSchemaType } from '@/schemas/ticket.schema';
import { createTicketAction } from '@/actions/tickets/create-ticket.action';

export function CreateTicketDialog() {
  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>('');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<TicketSchemaType>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      codeBar: '',
      vehicleType: 'AUTO',
    },
  });

  const onSubmit = (values: TicketSchemaType) => {
    setError(undefined);
    setSuccess(undefined);

    startTransition(() => {
      createTicketAction(values)
        .then((data) => {
          setError(data.error);
          setSuccess(data.success);
          toast.success('Ticket creado exitosamente');
          setOpen(false)
        })
        .catch((error) => {
          console.error(error);
          setError('Error al crear ticket');
          toast.error(error);
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-tour="tickets-create" onClick={() => setOpen(true)}>
          Crear Ticket
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Crear Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codeBar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Barras</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
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
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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

            <Button className="w-full" type="submit" disabled={isPending}>
              Crear Ticket
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
