import { detectVehicleTypeAction } from '@/actions/tickets/detect-vehicle-type.action';
import type { VehiculoDetectado } from '@/services/plate-recognition.service';

export type DeteccionVehiculo = Promise<VehiculoDetectado | null>;

// Pide el tipo y el modelo de la foto del escaneo. Nunca falla: sin respuesta da null y el
// operador elige a mano. Devuelve la promesa para que el escáner la empiece antes de abrir la
// entrada (mientras pregunta si entra o se va) y el diálogo use ese mismo resultado.
export function detectarVehiculo(foto: File): DeteccionVehiculo {
  const formData = new FormData();
  formData.append('image', foto);
  return detectVehicleTypeAction(formData)
    .then((resultado) => ('error' in resultado ? null : resultado))
    .catch(() => null);
}
