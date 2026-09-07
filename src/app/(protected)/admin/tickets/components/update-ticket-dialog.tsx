'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useTransition } from 'react';
import {
  updateUserPassword,
  UpdateUserPasswordType,
  updateUserSchema,
  UpdateUserSchemaType,
} from '@/schemas/user.schema';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePassword } from '@/actions/users/update-password.action';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUserByUsername } from '@/services/users.service';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { updateUserAction } from '@/actions/users/update-user.action';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User } from '@/types/user.type';
import { Ticket } from '@/types/ticket.type';
import { updateTicketSchema, UpdateTicketSchemaType } from '@/schemas/ticket.schema';
import { updateTicketAction } from '@/actions/tickets/update-ticket.action';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export function UpdateTicketDialog({ ticket }: { ticket: Ticket }) {

  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateTicketSchemaType>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: {
      codeBar: ticket.codeBar,
      vehicleType: 'AUTO',
    },
  });


  const onSubmit = async (values: UpdateTicketSchemaType) => {
    startTransition(async () => {
      const response = await updateTicketAction(ticket.id, values);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Ticket actualizado exitosamente');
        form.reset();
        setOpen(false);
      }
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
            Editar Ticket
          </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Actualizar Ticket</DialogTitle>
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
            {/* Select para Vehicle Type */}
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
              Editar Ticket
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
