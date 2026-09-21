'use server';
import { auth } from '@/auth';
import { registerSchema, RegisterSchemaType } from '@/schemas/auth/register.schema';
import { createUser } from '@/services/users.service';

export async function registerAction({ values }: { values: RegisterSchemaType; isVerified: boolean }) {
  const session = await auth();
  if (session?.user.role !== 'ADMIN') return { error: 'La cuenta debe crearla el administrador de tu empresa.' };
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success || !parsed.data.password) return { error: 'Revisá los datos y la contraseña.' };
  const { confirmPassword, ...data } = parsed.data;
  const user = await createUser({ ...data, role: 'USER' });
  return user ? { success: 'Usuario creado en tu empresa.' } : { error: 'No se pudo crear el usuario.' };
}
