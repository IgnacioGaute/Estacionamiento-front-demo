'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Avisos con mecha de tiempo.
 *
 * Sonner queda `unstyled`: aporta la mecánica (la pila, el temporizador que se frena al pasar
 * el mouse, el arrastre para descartar, la accesibilidad) y el aspecto entero lo pone el CSS
 * de `globals.css`, sección "AVISOS (toast)". Las medidas y las curvas son las del componente
 * original, no una aproximación.
 *
 * Abajo a la derecha con 32px de margen; en pantallas de menos de 600px sonner pasa solo a
 * 16px y el aviso ocupa el ancho disponible.
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

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      offset={32}
      // El margen de abajo suma la zona segura del iPhone para no quedar bajo la barra.
      mobileOffset={{ top: 16, right: 16, left: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      // Se descarta arrastrando hacia abajo, que es el gesto natural con el pulgar.
      swipeDirections={['bottom']}
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
