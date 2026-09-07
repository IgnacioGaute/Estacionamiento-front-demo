'use server';

import { openTurnoSchema, OpenTurnoSchemaType } from '@/schemas/turno.schema';
import { openTurno as openTurnoAPI } from '@/services/turnos.service';

export async function openTurnoAction(values: OpenTurnoSchemaType) {
  const validatedFields = openTurnoSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  const turno = await openTurnoAPI(validatedFields.data);
  if (!turno || 'error' in turno) {
    return { error: turno?.error ?? { code: 'SERVER_ERROR', message: 'Error inesperado en el servidor.' } };
  }
  return { success: 'Turno abierto exitosamente', turno };
}
