import { z } from 'zod';

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    confirmPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });
export type NewPasswordSchemaType = z.infer<typeof newPasswordSchema>;
