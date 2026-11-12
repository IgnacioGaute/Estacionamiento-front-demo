'use client';

import { usePathname } from 'next/navigation';
import { Toaster as Sonner } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Avisos con mecha de tiempo.
 *
 * Sonner queda `unstyled`: aporta la mecánica (la pila, el temporizador que se frena al pasar
 * el mouse, el arrastre para descartar, la accesibilidad) y el aspecto entero lo pone el CSS
 * de `globals.css`, sección "AVISOS (toast)". Las medidas y las curvas son las del componente
 * original, no una aproximación.
 *
 * En la computadora, abajo a la derecha con 32px de margen. En celular y tablet van arriba: abajo
 * están la barra de Entrada/Salida y el pie de las hojas («Listo», «Cobrar»), justo lo que se toca
 * después de registrar, y un aviso ahí lo tapaba. En menos de 600px el aviso ocupa el ancho.
 */

// 18px, el tamaño del original. Van con `currentColor` para tomar el color de cada tipo.
const iconoBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const ICONOS = {
  success: (
    <svg {...iconoBase}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg {...iconoBase}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  ),
  warning: (
    <svg {...iconoBase}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  ),
  info: (
    <svg {...iconoBase}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
};

// En la configuración inicial el pie fijo tiene los botones del recorrido: en la computadora los
// avisos van por encima para no tapar «Continuar» mientras se ven.
const PIE_ASISTENTE = 96;

// El mismo corte que esconde la barra del mostrador (`lg:hidden` en MostradorDock).
const PANTALLA_TACTIL = '(max-width: 1023.98px)';

const Toaster = ({ ...props }: ToasterProps) => {
  const enAsistente = usePathname()?.startsWith('/configuracion-inicial') ?? false;
  const arriba = useMediaQuery(PANTALLA_TACTIL) ?? false;
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position={arriba ? 'top-center' : 'bottom-right'}
      offset={arriba ? { top: 'calc(16px + env(safe-area-inset-top))', right: 16, left: 16, bottom: 16 }
        : enAsistente ? { top: 32, right: 32, left: 32, bottom: 32 + PIE_ASISTENTE } : 32}
      // Arriba suma la zona segura del iPhone (la muesca o la isla) para no quedar debajo.
      mobileOffset={{ top: 'calc(12px + env(safe-area-inset-top))', right: 12, left: 12, bottom: 16 }}
      // Se descarta arrastrándolo hacia el borde del que salió.
      swipeDirections={arriba ? ['top'] : ['bottom']}
      expand
      gap={10}
      duration={4000}
      icons={ICONOS}
      toastOptions={{
        unstyled: true,
        classNames: { toast: 'st-toast' },
      }}
      {...props}
    />
  );
};

export { Toaster };
