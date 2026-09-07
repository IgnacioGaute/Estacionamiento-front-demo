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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ownerParkingTypeSchema, OwnerParkingTypeSchemaType } from '@/schemas/owner-parking-type.schema';
import { createOwnerParkingTypeAction } from '@/actions/owner-parking-type/create-owner-parking-type.action';

export function CreateOwnerParkingTypeDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<OwnerParkingTypeSchemaType>({
    resolver: zodResolver(ownerParkingTypeSchema),
    defaultValues: {
      amount: 0,
      name: '',
    },
  });

  const onSubmit = (values: OwnerParkingTypeSchemaType) => {
    startTransition(async () => {
      const data = await createOwnerParkingTypeAction(values);

      if (!data || data.error) {
        const errorMessage = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message;

        toast.error(errorMessage || 'No se pudo crear el tipo');
      } else {
        toast.success('Tipo de estacionamiento creado exitosamente');
        form.reset();
        setOpen(false);
      }
    });
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-tour="parking-type-create" onClick={() => setOpen(true)}>
          Crear tipo para dueños
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Crear tipo de estacionamiento (dueños)</DialogTitle>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Expensas 1" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isPending} {...field} />
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
