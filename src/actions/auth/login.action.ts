'use server';

import { signIn } from '@/auth';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { loginSchema, LoginSchemaType } from '@/schemas/auth/login.schema';

export async function loginAction(
  values: LoginSchemaType,
  callbackUrl?: string,
): Promise<{ success?: string; error?: string; redirectTo?: string }> {
  try {
    const validatedFields = loginSchema.safeParse(values);

    if (!validatedFields.success) {
      return { error: 'Revisá los campos e intentá de nuevo.' };
    }

    const { identifier, password } = validatedFields.data;

      await signIn('credentials', {
        identifier,
        password,
        redirect: false,
      });

      const safeRedirect = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') && !callbackUrl.includes('\\') ? callbackUrl : DEFAULT_LOGIN_REDIRECT;
      return { success: "Sesión iniciada — redirigiendo.", redirectTo: safeRedirect };
    } catch (error: unknown) {
      console.error("Error en signIn:", error);

      if (typeof error === "object" && error !== null && "type" in error) {
        const typedError = error as { type: string };
        if (typedError.type === "CredentialsSignin") {
          return { error: "Email o contraseña incorrectos" };
        }
      }

      return { error: "No se pudo iniciar sesión. Intentá de nuevo." };
    }
    
  }

