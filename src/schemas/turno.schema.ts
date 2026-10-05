import { z } from 'zod';
export const openTurnoSchema = z.object({
  fondoInicial: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0'),
  cajaId: z.string().uuid().optional(),
  sesionAnteriorId: z.string().uuid().optional(),
  sesionActivaId: z.string().uuid().optional(),
  cambioAgregado: z.coerce.number().int().min(0).optional(),
  motivoApertura: z.string().max(255).optional(),
  turnoAnteriorId: z.string().uuid().optional(),
});
export type OpenTurnoSchemaType = z.infer<typeof openTurnoSchema>;
export const closeTurnoSchema = z.object({
  cerrarCaja: z.boolean().optional(),
  efectivoContado: z.coerce.number().int().min(0, 'Debe ser mayor o igual a 0').optional(),
  efectivoParaSiguiente: z.coerce.number().int().min(0).optional(),
  efectivoEsperado: z.number().int().optional(),
  observaciones: z.string().optional(),
  motivoCierreForzado: z.string().max(255).optional(),
}).refine(v => v.efectivoContado === undefined ? v.efectivoParaSiguiente === undefined : (v.efectivoParaSiguiente ?? 0) <= v.efectivoContado, { path: ['efectivoParaSiguiente'], message: 'No puede superar el efectivo contado.' });
export type CloseTurnoSchemaType = z.infer<typeof closeTurnoSchema>;
