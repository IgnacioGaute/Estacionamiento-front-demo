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
import { useState } from 'react';
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

export function UpdateUserDailog({ user }: { user: User }) {
  const session = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [open, setOpen] = useState(false);
  let debounceTimeout: NodeJS.Timeout | null = null;

  const router = useRouter();

  const form = useForm<UpdateUserSchemaType>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: user?.username || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

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
    return <div>Cargando...</div>;
  }

  const checkUsername = async (username: string) => {
    setIsCheckingUsername(true);
    try {
      const exists = await getUserByUsername(username, session.data?.token);

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
    console.log(values)

    try {
      setIsLoading(true);

      const result = await updateUserAction(user.id, values);

      if (result.error) {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error.message;

        toast.error(errorMessage);
      } else if (result.success) {
        toast.success('Perfil actualizado exitosamente');
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
            variant="ghost"
            className="w-full justify-start"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Editar Usuario
          </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Actualizar Perfil</DialogTitle>
      </DialogHeader>
    <Tabs defaultValue="account">
      <TabsList
        className={cn(
          'grid w-full',
          'grid-cols-2' ,
        )}
      >
        <TabsTrigger value="account">Cuenta</TabsTrigger>
          <TabsTrigger value="password">Contraseña</TabsTrigger>
      </TabsList>

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
