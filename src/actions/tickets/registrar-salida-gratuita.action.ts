'use server';
import { registrarSalidaGratuita } from '@/services/tickets.service';
import { ERRORES_MODALIDAD } from '@/lib/modalidad';

// La salida de una estadía que ingresó gratis. Sin importes: el backend no crea cobros ni caja.
export async function registrarSalidaGratuitaAction(id: string) {
  try {
    const r = await registrarSalidaGratuita(id);
    if (r.error) return { error: (r.code && ERRORES_MODALIDAD[r.code]) || r.error, code: r.code };
    return { registration: r.registration };
  } catch {
    return { error: 'No se pudo registrar la salida. Revisá la conexión e intentá de nuevo.' };
  }
}
