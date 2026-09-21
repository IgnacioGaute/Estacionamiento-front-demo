import type { CSSProperties } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

/**
 * Envoltorio de sonner. Existe por una sola razón: la mecha del aviso (la barrita que se
 * consume abajo) es CSS puro, y el CSS no tiene forma de saber cuánto va a durar cada aviso.
 * Sonner no publica la duración en el DOM, así que la inyectamos como variable en el `style`
 * del toast y la animación la lee desde ahí.
 *
 * Importar siempre desde acá y no desde 'sonner': un aviso disparado directo con sonner
 * queda con la mecha de 4 segundos aunque dure otra cosa.
 */

// Es también la duración por defecto de sonner; si cambia una, cambiar la otra.
const DURACION_POR_DEFECTO = 4000;

function conMecha(opciones?: ExternalToast): ExternalToast {
  const duracion = opciones?.duration ?? DURACION_POR_DEFECTO;
  // Un aviso sin vencimiento (Infinity) no lleva mecha: no habría nada que consumir.
  const permanente = !Number.isFinite(duracion);

  return {
    ...opciones,
    duration: duracion,
    style: {
      ...(opciones?.style ?? {}),
      ...(permanente ? { '--st-fuse-h': '0px' } : { '--st-dur': `${duracion}ms` }),
    } as CSSProperties,
  };
}

type Mensaje = Parameters<typeof sonner>[0];

export const toast = Object.assign(
  (mensaje: Mensaje, opciones?: ExternalToast) => sonner(mensaje, conMecha(opciones)),
  {
    success: (mensaje: Mensaje, opciones?: ExternalToast) => sonner.success(mensaje, conMecha(opciones)),
    error: (mensaje: Mensaje, opciones?: ExternalToast) => sonner.error(mensaje, conMecha(opciones)),
    warning: (mensaje: Mensaje, opciones?: ExternalToast) => sonner.warning(mensaje, conMecha(opciones)),
    info: (mensaje: Mensaje, opciones?: ExternalToast) => sonner.info(mensaje, conMecha(opciones)),
    message: (mensaje: Mensaje, opciones?: ExternalToast) => sonner.message(mensaje, conMecha(opciones)),
    // Estos manejan su propio ciclo de vida (loading queda abierto hasta que se resuelve),
    // así que pasan derecho: la mecha se oculta por CSS en los de tipo loading.
    loading: sonner.loading,
    promise: sonner.promise,
    custom: sonner.custom,
    dismiss: sonner.dismiss,
    getHistory: sonner.getHistory,
  },
);
