import { z } from 'zod';

export const openTurnoSchema = z.object({
  fondoInicial: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
});
export type OpenTurnoSchemaType = z.infer<typeof openTurnoSchema>;

export const closeTurnoSchema = z.object({
  efectivoContado: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});
export type CloseTurnoSchemaType = z.infer<typeof closeTurnoSchema>;
