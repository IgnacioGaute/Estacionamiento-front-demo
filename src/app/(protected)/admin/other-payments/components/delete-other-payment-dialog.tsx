'use client';

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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DeleteUserSchemaType, deleteUserSchema } from '@/schemas/user.schema';

import { toast } from 'sonner';
import { User } from '@/types/user.type';
import { deleteUserAction } from '@/actions/users/delete-user.action';
import { deleteOwnerParkingTypeSchema, DeleteOwnerParkingTypeSchemaType } from '@/schemas/owner-parking-type.schema';
import { OtherPayment } from '@/types/other-payment.type';
import { deleteExpenseAction } from '@/actions/other-payment/delete-other-payment.action';



export function DeleteExpenseDialog({ expense }: { expense: OtherPayment }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<DeleteOwnerParkingTypeSchemaType>({
    resolver: zodResolver(deleteOwnerParkingTypeSchema),
    defaultValues: {
      confirmation: '',
    },
  });

  const onSubmit = (values: DeleteOwnerParkingTypeSchemaType) => {

    startTransition(() => {
      deleteExpenseAction(expense.id).then((data) => {
        if (!data || data.error) {
          toast.error(data.error);
        } else {
          toast.success(data.success);
          form.reset();
          setOpen(false);
        }
      });
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Eliminar
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Gasto</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isPending}
                >
                  Eliminar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
