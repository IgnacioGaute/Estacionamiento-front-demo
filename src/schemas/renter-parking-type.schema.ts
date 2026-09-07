import { z } from 'zod';

export const renterParkingTypeSchema = z.object({
  name: z.string().min(1, 'Ingrese un nombre').max(100, 'Máximo 100 caracteres'),
  amount: z.coerce.number(),
});

export type RenterParkingTypeSchemaType = z.infer<typeof renterParkingTypeSchema>;


export const updateRenterParkingTypeSchema = z.object({
  name: z.string().min(1, 'Ingrese un nombre').max(100, 'Máximo 100 caracteres').optional(),
  amount: z.coerce.number(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes debe ser YYYY-MM (ej: 2026-02)"),
});
export type UpdateRenterParkingTypeSchemaType = z.infer<typeof updateRenterParkingTypeSchema>;


export const deleteRenterParkingTypeSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Estacionamiento"'),
});
export type DeleteRenterParkingTypeSchemaType = z.infer<typeof deleteRenterParkingTypeSchema>;
