'use client';

import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
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
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

import { loginSchema, LoginSchemaType } from '@/schemas/auth/login.schema';
import { loginAction } from '@/actions/auth/login.action';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = (values: LoginSchemaType) => {
    setError(undefined);
    setSuccess(undefined);
    startTransition(() => {
      loginAction(values, callbackUrl || '')
        .then((data) => {
          if (data?.error) setError(data.error);
          if (data?.success) {
            setSuccess(data.success);
            router.push(data.redirectTo || '/');
          }
        })
        .catch((err) => {
          console.error('⚠️ Error en loginAction:', err);
          setError('No se pudo iniciar sesión. Intentá de nuevo.');
        });
    });
  };

  // Con la sesión ya iniciada todo queda bloqueado hasta que abre la pantalla siguiente: si el botón
  // volviera a «Entrar» mientras navega, invitaría a tocarlo de nuevo.
  const entrando = isPending || !!success;

  // Campos grandes y oscuros sobre la tarjeta negra; en el celular la letra queda en 16 px para que
  // el teléfono no haga zoom al tocarlos.
  const campo =
    'h-[52px] rounded-[14px] border-white/10 bg-[#16130F] px-3.5 text-base md:h-[50px] md:text-[15px] placeholder:text-[#7D7365] focus-visible:ring-4 focus-visible:ring-gm-yellow/15';
  const etiqueta = 'text-[13px] font-semibold normal-case tracking-normal text-[#D9D1C3]';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={etiqueta}>Email o usuario</FormLabel>
              <FormControl>
                <Input
                  disabled={entrando}
                  autoComplete="username"
                  className={campo}
                  placeholder="tu@email.com o tu usuario"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className={etiqueta}>Contraseña</FormLabel>
                <Link
                  href="/auth/reset"
                  className="text-[13px] font-semibold text-gm-yellow hover:underline"
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    disabled={entrando}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`${campo} pr-12`}
                    placeholder="Tu contraseña"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[10px] text-[#857B6D] transition-colors hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
                  >
                    {showPassword ? (
                      <EyeOff className="size-[18px]" aria-hidden />
                    ) : (
                      <Eye className="size-[18px]" aria-hidden />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormError message={error} />
        <FormSuccess message={success} detail="Abriendo el sistema…" pending />

        <Button
          className="!mt-5 h-[54px] w-full gap-2.5 rounded-[14px] bg-gm-yellow font-display text-lg font-bold tracking-[0.04em] text-gm-ink hover:bg-gm-yellow hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
          type="submit"
          disabled={entrando}
        >
          {entrando ? 'ENTRANDO…' : 'ENTRAR'}
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
        </Button>
      </form>
    </Form>
  );
}
