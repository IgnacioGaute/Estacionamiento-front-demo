'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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
import {
  AtSign,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  UserPlus,
} from 'lucide-react';

import {
  registerSchema,
  RegisterSchemaType,
} from '@/schemas/auth/register.schema';
import { registerAction } from '@/actions/auth/register.action';

export function CreateUserDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const form = useForm<RegisterSchemaType>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: RegisterSchemaType) => {
    startTransition(() => {
      registerAction({ values, isVerified: false })
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
          } else {
            toast.success(data.success ?? 'Usuario creado exitosamente');
            form.reset();
            setOpen(false);
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error al registrar usuario');
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-tour="users-create">
          Nuevo usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <UserPlus className="size-4" />
            </span>
            <div>
              <DialogTitle>Nuevo usuario</DialogTitle>
              <DialogDescription className="mt-0.5">
                Creá una cuenta de operador o administrador.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} placeholder="Castro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        disabled={isPending}
                        placeholder="jcastro"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        disabled={isPending}
                        type="email"
                        placeholder="juan.castro@garagemitre.ar"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          disabled={isPending}
                          type={show1 ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShow1((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-gm-surface-3"
                          tabIndex={-1}
                        >
                          {show1 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          disabled={isPending}
                          type={show2 ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShow2((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-gm-surface-3"
                          tabIndex={-1}
                        >
                          {show2 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
