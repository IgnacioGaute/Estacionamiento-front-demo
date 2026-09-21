import { z } from 'zod';
export const openTurnoSchema = z.object({
  fondoInicial: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  nombre: z.string().max(80).optional(),
  duracionPrevistaHoras: z.coerce.number().int().min(1).max(168).optional(),
  turnoAnteriorId: z.string().uuid().optional(),
});
export type OpenTurnoSchemaType = z.infer<typeof openTurnoSchema>;
export const closeTurnoSchema = z.object({
  efectivoContado: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  efectivoParaSiguiente: z.coerce.number().int().min(0).optional(),
  efectivoEsperado: z.number().int().optional(),
  observaciones: z.string().optional(),
  motivoCierreForzado: z.string().max(255).optional(),
}).refine(v => (v.efectivoParaSiguiente ?? 0) <= v.efectivoContado, { path: ['efectivoParaSiguiente'], message: 'No puede superar el efectivo contado.' });
export type CloseTurnoSchemaType = z.infer<typeof closeTurnoSchema>;
