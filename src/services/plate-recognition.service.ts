import { currentToken } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export type PlateRecognitionResponse = { plate: string | null; score?: number };

// No usa getAuthHeaders() porque hardcodea Content-Type: application/json, que rompe el
// multipart — dejamos que fetch ponga el boundary solo al pasar un FormData como body.
export const recognizePlateFromImage = async (
  file: File,
): Promise<PlateRecognitionResponse | { error: string }> => {
  try {
    const token = await currentToken();
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${BASE_URL}/plate-recognition/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { error: data?.message || 'No se pudo reconocer la patente.' };
    }

    return data as PlateRecognitionResponse;
  } catch (error) {
    console.error('Error en recognizePlateFromImage:', error);
    return { error: 'Error de conexión con el servidor.' };
  }
};
