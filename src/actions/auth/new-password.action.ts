'use server';
import { newPasswordSchema, NewPasswordSchemaType } from '@/schemas/auth/new-password.schema';

export async function newPasswordAction(values: NewPasswordSchemaType, token: string | null) {
  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success || !token) return { error: 'Revisá la contraseña y el enlace de recuperación.' };
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/reset-password', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.API_SECRET_TOKEN },
      body: JSON.stringify({ token, password: parsed.data.password }),
    });
    if (!response.ok) return { error: 'El enlace no es válido o venció. Pedí uno nuevo.' };
    return { success: 'Contraseña actualizada. Volvé a iniciar sesión.' };
  } catch { return { error: 'No se pudo conectar. Intentá nuevamente.' }; }
}
