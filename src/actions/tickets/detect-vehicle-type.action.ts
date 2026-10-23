'use server';

import { detectVehicleTypeFromImage, type VehiculoDetectado } from '@/services/plate-recognition.service';

// La foto con la que se leyó la patente: el backend sugiere el tipo y el modelo (Gemini).
export async function detectVehicleTypeAction(formData: FormData): Promise<VehiculoDetectado | { error: string; code?: string }> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) return { error: 'No se recibió ninguna imagen.' };
  return detectVehicleTypeFromImage(file);
}
