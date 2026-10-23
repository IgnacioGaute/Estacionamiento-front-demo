import { tenantFetch as fetch } from '@/lib/tenant-fetch';
import { getAuthHeaders } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export type PlateRecognitionResponse = { plate: string | null; score?: number };

// El tipo (uno habilitado de la playa) y el modelo («Fiat Strada») que Gemini ve en la foto.
export type VehiculoDetectado = { vehicleType: string | null; modelo: string | null };

export const detectVehicleTypeFromImage = async (file: File): Promise<VehiculoDetectado | { error: string; code?: string }> => {
  try {
    const headers = await getAuthHeaders();
    delete headers['Content-Type'];
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${BASE_URL}/plate-recognition/vehicle-type`, { method: 'POST', headers, body: formData });
    const data = await response.json().catch(() => null);
    if (!response.ok) return { error: data?.message || 'No se pudo detectar el tipo de vehículo.', code: data?.code };
    return data as VehiculoDetectado;
  } catch (error) {
    console.error('Error en detectVehicleTypeFromImage:', error);
    return { error: 'Error de conexión con el servidor.' };
  }
};

// No usa getAuthHeaders() porque hardcodea Content-Type: application/json, que rompe el
// multipart — dejamos que fetch ponga el boundary solo al pasar un FormData como body.
export const recognizePlateFromImage = async (
  file: File,
): Promise<PlateRecognitionResponse | { error: string; code?: string }> => {
  try {
    const headers = await getAuthHeaders();
    delete headers['Content-Type'];
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${BASE_URL}/plate-recognition/scan`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { error: data?.message || 'No se pudo reconocer la patente.', code: data?.code };
    }

    return data as PlateRecognitionResponse;
  } catch (error) {
    console.error('Error en recognizePlateFromImage:', error);
    return { error: 'Error de conexión con el servidor.' };
  }
};
