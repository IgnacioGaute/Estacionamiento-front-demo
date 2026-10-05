'use server';

import { recognizePlateFromImage } from '@/services/plate-recognition.service';

// `code` deja que el escáner en vivo siga probando con el próximo cuadro cuando no hubo patente
// (SIN_PATENTE) o Plate Recognizer estaba ocupado (PLATE_RECOGNIZER_BUSY), y corte con cualquier
// otro error.
export type RecognizePlateResult =
  | { success: true; plate: string; score?: number }
  | { error: string; code?: string };

export async function recognizePlateAction(formData: FormData): Promise<RecognizePlateResult> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No se recibió ninguna imagen.' };
  }

  const result = await recognizePlateFromImage(file);

  if ('error' in result) {
    return { error: result.error, code: result.code };
  }
  if (!result.plate) {
    return {
      error: 'No se detectó ninguna patente en la foto. Probá de nuevo o escribila manualmente.',
      code: 'SIN_PATENTE',
    };
  }

  return { success: true, plate: result.plate, score: result.score };
}
