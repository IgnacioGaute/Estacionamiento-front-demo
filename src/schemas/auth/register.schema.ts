import { z } from 'zod';
import { USER_ROLES } from '@/types/user.type';

export const registerSchema = z
  .object({
    email: z.string().email('El email no es válido'),
    username: z.string().min(1, 'El nombre de usuario es requerido'),
    firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  lastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede tener más de 50 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .optional(),
    confirmPassword: z.string(),
    // Lo elige el administrador al crear la cuenta; sin elegir, operador.
    role: z.enum(USER_ROLES).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterSchemaType = z.infer<typeof registerSchema>;
