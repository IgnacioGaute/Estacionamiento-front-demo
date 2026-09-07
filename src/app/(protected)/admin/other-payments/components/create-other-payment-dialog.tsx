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
import { otherPaymentSchema, OtherPaymentSchemaType } from '@/schemas/other-payment.schema';
import { createOtherPaymentAction } from '@/actions/other-payment/create-other-payment.action';
import { PAYMENT_METHOD, PAYMENT_TYPE } from '@/types/other-payment.type';

export function CreateOtherPaymentDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<OtherPaymentSchemaType>({
    resolver: zodResolver(otherPaymentSchema),
    defaultValues: {
      type: PAYMENT_TYPE[0],
      paymentMethod: PAYMENT_METHOD[0],
      description: '',
      price: undefined,
    },
  });

  const onSubmit = (values: OtherPaymentSchemaType) => {
    startTransition(() => {
      createOtherPaymentAction(values)
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
          } else {
            toast.success('Gasto Registrado exitosamente');
            form.reset({
              type: PAYMENT_TYPE[0],
              paymentMethod: PAYMENT_METHOD[0],
              description: '',
              price: '' as unknown as number,
            });
            setOpen(false);
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.message || 'Error desconocido');
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-tour="varios-create" onClick={() => setOpen(true)}>
          Crear
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Registrar Ingreso o Egreso</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
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
                        <SelectItem value="EGRESOS">Egreso</SelectItem>
                        <SelectItem value="INGRESOS">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pago</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una forma de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Efectivo</SelectItem>
                        <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={isPending}>
              Crear
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
