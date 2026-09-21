'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { AlertTriangle, Loader2, Trash } from 'lucide-react';

import {
  DeleteUserSchemaType,
  deleteUserSchema,
} from '@/schemas/user.schema';
import { User } from '@/types/user.type';
import { deleteUserAction } from '@/actions/users/delete-user.action';

const DELETE_USER_TEXT = 'Eliminar usuario';

export function DeleteUserDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<DeleteUserSchemaType>({
    resolver: zodResolver(deleteUserSchema),
    defaultValues: { email: '', confirmation: '' },
  });

  const onSubmit = async (values: DeleteUserSchemaType) => {
    if (
      values.email !== user.email ||
      values.confirmation !== DELETE_USER_TEXT
    ) {
      toast.error('Los detalles de confirmación no coinciden.');
      return;
    }
    setIsPending(true);
    try {
      const data = await deleteUserAction(user.id);
      if (!data || data.error) {
        toast.error(data?.error);
      } else {
        toast.success(data.success);
        form.reset();
        setOpen(false);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[#F08775] hover:bg-destructive/15 hover:text-[#F08775]"
        >
          <Trash className="size-4" />
          Eliminar usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-destructive/40 bg-destructive/15 text-[#F08775]">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <DialogTitle>Eliminar usuario</DialogTitle>
              <DialogDescription className="mt-0.5">
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="text-[13.5px] leading-relaxed text-muted-foreground">
          Se eliminará la cuenta de{' '}
          <span className="font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </span>
          . Los movimientos firmados por este usuario se conservan.
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Escribí el email del usuario:{' '}
                    <span className="text-foreground gm-mono">{user.email}</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      placeholder={user.email}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Escribí{' '}
                    <span className="text-foreground gm-mono">
                      "{DELETE_USER_TEXT}"
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      placeholder={DELETE_USER_TEXT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Eliminar definitivamente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
