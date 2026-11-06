'use client';

import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardWrapper } from '@/components/auth/card-wrapper';
import { resetPasswordAction } from '@/actions/auth/reset-passoword.action';
import {
  resetPasswordSchema,
  ResetPasswordSchemaType,
} from '@/schemas/auth/reset-password.schema';
import { Mail, Send } from 'lucide-react';

export function ResetForm() {
  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>('');
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ResetPasswordSchemaType) => {
    setError(undefined);
    setSuccess(undefined);
    startTransition(() => {
      resetPasswordAction(values).then((data) => {
        setError(data?.error);
        setSuccess(data?.success);
      });
    });
  };

  return (
    <CardWrapper
      title="Recuperá tu contraseña"
      headerLabel="Te enviamos un link al email para que puedas crear una nueva contraseña."
      backButtonLabel="← Volver al inicio de sesión"
      backButtonHref="/auth/login"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      {...field}
                      disabled={isPending}
                      type="email"
                      className="pl-9"
                      placeholder="tu@email.com"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormError message={error} />
          <FormSuccess message={success} />

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            <Send className="size-4" />
            Enviar email de recuperación
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
}
