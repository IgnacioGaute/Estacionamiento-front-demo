'use client';
import { DataLoading } from '@/components/ui/data-loading';

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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useState } from 'react';
import { JellyRadio } from '@/components/ui/jelly-radio';
import {
  updateUserPassword,
  UpdateUserPasswordType,
  updateUserSchema,
  UpdateUserSchemaType,
} from '@/schemas/user.schema';
import { toast } from '@/lib/toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePassword } from '@/actions/users/update-password.action';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUserByUsername } from '@/actions/users/find-user.action';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { updateUserAction } from '@/actions/users/update-user.action';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User } from '@/types/user.type';
import { useTenant } from '@/components/tenant-provider';
import { SelectorPlaya, SelectorRol } from './selector-rol';

export function UpdateUserDailog({ user }: { user: User }) {
  const session = useSession();

  // Controlado para que el segmentado y el contenido compartan la misma sección activa.
  const [tabPerfil, setTabPerfil] = useState('account');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [open, setOpen] = useState(false);
  let debounceTimeout: NodeJS.Timeout | null = null;

  const router = useRouter();
  const { context, playaId } = useTenant();
  // El rol propio no se cambia desde acá (el backend lo rechaza): que lo haga otro administrador.
  const esPropio = session.data?.user.id === user.id;
  const rolOriginal = user.role === 'ADMIN' ? 'ADMIN' : 'USER';

  const form = useForm<UpdateUserSchemaType>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: user?.username || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      role: rolOriginal,
      playaId: context.playas.some((p) => p.id === playaId) ? playaId : context.playas[0]?.id,
    },
  });
  const rol = form.watch('role') ?? rolOriginal;
  const cambiaRol = rol !== rolOriginal;
  const eligePlaya = cambiaRol && rol === 'USER' && context.playas.length > 1;

  const passwordForm = useForm<UpdateUserPasswordType>({
    resolver: zodResolver(updateUserPassword),
    defaultValues: {
      currentPassword: '',
      repeatNewPassword: '',
      newPassword: '',
    },
  });

  if (!user) {
    return <div>No estás autenticado.</div>;
  }

  if (session.status === 'loading') {
    return <DataLoading label="Cargando usuario…" />;
  }

  const checkUsername = async (username: string) => {
    setIsCheckingUsername(true);
    try {
      const exists = await getUserByUsername(username);

      if (exists && exists.username !== user.username) {
        setUsernameExists(true);
      } else {
        setUsernameExists(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error verificando el username:', error.message);
      }
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const onUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const username = event.target.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
      if (username === '') {
        setUsernameExists(false);
        setIsCheckingUsername(false);
        return;
      }
      checkUsername(username);
    }, 1500);
  };

  const onSubmitProfile = async (values: UpdateUserSchemaType) => {
    if (!user?.id) return;
    // Rol y playa viajan solo si el rol cambia; con una sola playa la elige el backend.
    const { role, playaId: playa, ...perfil } = values;
    const payload = cambiaRol ? { ...perfil, role, ...(eligePlaya ? { playaId: playa } : {}) } : perfil;

    try {
      setIsLoading(true);

      const result = await updateUserAction(user.id, payload);

      if (result.error) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message;

        toast.error(errorMessage);
      } else if (result.success) {
        toast.success(cambiaRol ? `Ahora es ${rol === 'ADMIN' ? 'administrador' : 'operador'}. Va a tener que volver a iniciar sesión.` : 'Perfil actualizado exitosamente');
        if (cambiaRol) setOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error(
        'Ocurrió un error inesperado. Por favor, inténtalo nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPassword = async (values: UpdateUserPasswordType) => {
    try {
      setIsLoading(true);

      const result = await updatePassword(user.id, values);

      if (result.error) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message;

        toast.error(errorMessage);
      } else if (result.success) {
        toast.success(
          'Contraseña actualizada exitosamente. Inicie sesión nuevamente.',
        );
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error(
        'Ocurrió un error inesperado. Por favor, inténtalo nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
    <Button
            variant="outline"
            size="sm"
            aria-label={`Editar a ${user.firstName} ${user.lastName}`}
            className="h-9 gap-2 border-gm-line-strong"
            onClick={() => setOpen(true)}
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Actualizar Perfil</DialogTitle>
      </DialogHeader>
    <Tabs value={tabPerfil} onValueChange={setTabPerfil}>
      <JellyRadio
        aria-label="Secciones del perfil"
        value={tabPerfil}
        onChange={setTabPerfil}
        items={[
          { value: 'account', label: 'Cuenta' },
          { value: 'password', label: 'Contraseña' },
        ]}
      />

      <TabsContent value="account">
        <Card className="h-fit flex flex-col">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitProfile)}
              className="space-y-4"
            >
              <CardContent className="space-y-2">
                {!esPropio && (
                  <div className="space-y-3 pb-2">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <SelectorRol nombre={`rol-${user.id}`} valor={field.value ?? rolOriginal} onChange={field.onChange} disabled={isLoading} />
                      )}
                    />
                    {eligePlaya && (
                      <FormField
                        control={form.control}
                        name="playaId"
                        render={({ field }) => (
                          <SelectorPlaya nombre={`playa-rol-${user.id}`} playas={context.playas} valor={field.value ?? ''} onChange={field.onChange} disabled={isLoading} />
                        )}
                      />
                    )}
                    {cambiaRol && <p className="text-xs text-gm-yellow">Al guardar se cierra su sesión para que entre con el rol nuevo.</p>}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de usuario</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            onUsernameChange(e);
                          }}
                        />
                      </FormControl>
                      {usernameExists && (
                        <div className="text-sm text-red-500">
                          El nombre de usuario ya está en uso.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input disabled readOnly value={user.email || undefined} />
                  </FormControl>
                </FormItem>
              </CardContent>
              <CardFooter className="flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || isCheckingUsername}
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar perfil'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Contraseña</CardTitle>
              <CardDescription>
                Elegir nueva contraseña. Luego de actualizar se cerrará la
                sesión.
              </CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                className="space-y-4"
              >
                <CardContent className="space-y-2">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Contraseña actual</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              id="current"
                              type={showCurrentPassword ? 'text' : 'password'}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() =>
                              setShowCurrentPassword((prev) => !prev)
                            }
                          >
                            {showCurrentPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                        <FormMessage className="mt-2 text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Contraseña nueva</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              id="new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                          >
                            {showNewPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                        <FormMessage className="mt-2 text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="repeatNewPassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Repetir contraseña nueva</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              id="repeat-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                          >
                            {showNewPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                        <FormMessage className="mt-2 text-red-500" />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex items-center justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Actualizando...' : 'Actualizar perfil'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
    </Tabs>
    <DialogFooter className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
