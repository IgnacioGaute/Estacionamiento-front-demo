import { toast } from '@/lib/toast';
import { VERSION_APP } from '@/lib/version-app';

// Solo del navegador. Separado de version-app.ts, que también usa el servidor (y el middleware):
// así el aviso no arrastra sonner a esos paquetes.

let avisado: 'general' | 'accion' | null = null;
let informadoEl = 0;

/**
 * Hay un despliegue nuevo y esta pantalla es de la versión anterior. No recarga sola: puede haber
 * un cobro o un formulario abiertos. Explica qué pasó y deja actualizar con un toque. Nunca repite
 * la acción rechazada: Next la rechazó antes de ejecutarla, y la persona decide si volver a hacerla.
 */
export function avisarVersionNueva(accionRechazada: boolean) {
  if (accionRechazada && Date.now() - informadoEl > 60_000) {
    informadoEl = Date.now();
    // A los logs del front como [error-cliente], categoría version (ver app/api/errores).
    void fetch('/api/errores', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: 'version', nombre: 'UnrecognizedActionError', mensaje: 'Acción de servidor de otra versión', ruta: window.location.pathname, version: VERSION_APP }),
    }).catch(() => undefined);
  }
  // Uno solo a la vez; el de una acción rechazada reemplaza al general (es más urgente).
  if (avisado === 'accion' || (avisado === 'general' && !accionRechazada)) return;
  avisado = accionRechazada ? 'accion' : 'general';
  toast.warning(accionRechazada ? 'Esta pantalla es de una versión anterior' : 'Hay una versión nueva de la aplicación', {
    id: 'version-nueva',
    duration: Infinity,
    description: accionRechazada
      ? 'La última acción no se realizó. Actualizá y volvé a hacerla; lo que ya se registró no se pierde.'
      : 'Cuando termines lo que estás haciendo, tocá Actualizar. Lo que ya se registró no se pierde.',
    action: { label: 'Actualizar', onClick: () => window.location.reload() },
    onDismiss: () => { avisado = null; },
  });
}

export function _reiniciarAvisoVersion() {
  avisado = null;
  informadoEl = 0;
}
