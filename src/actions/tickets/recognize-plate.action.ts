'use server';

import { recognizePlateFromImage } from '@/services/plate-recognition.service';

export async function recognizePlateAction(formData: FormData) {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No se recibió ninguna imagen.' };
  }

  const result = await recognizePlateFromImage(file);

  if ('error' in result) {
    return { error: result.error };
  }
  if (!result.plate) {
    return { error: 'No se detectó ninguna patente en la foto. Probá de nuevo o escribila manualmente.' };
  }

  return { success: true as const, plate: result.plate, score: result.score };
}
