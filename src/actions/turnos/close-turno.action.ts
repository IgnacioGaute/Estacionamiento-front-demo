'use server';

import { closeTurnoSchema, CloseTurnoSchemaType } from '@/schemas/turno.schema';
import { closeTurno as closeTurnoAPI } from '@/services/turnos.service';

export async function closeTurnoAction(id: string, values: CloseTurnoSchemaType) {
  const validatedFields = closeTurnoSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  const turno = await closeTurnoAPI(id, validatedFields.data);
  if (!turno || 'error' in turno) {
    return { error: turno?.error ?? { code: 'SERVER_ERROR', message: 'Error inesperado en el servidor.' } };
  }
  return { success: 'Turno cerrado exitosamente', turno };
}
