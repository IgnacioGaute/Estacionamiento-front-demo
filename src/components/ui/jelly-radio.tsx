'use client';

import { cn } from '@/lib/utils';

/**
 * Segmentado con chips: el elegido se hincha y empuja a los vecinos, que además se achican un
 * poco. El movimiento sale con una curva que pasa de largo y vuelve, y cada vecino arranca unos
 * milisegundos después que el anterior, así la fila se acomoda como gelatina en vez de saltar.
 *
 * No usa librería de animación: son `transform` con `transition`, que es lo que este proyecto
 * ya tiene. Con `prefers-reduced-motion` el chip elegido igual se marca, sin recorrido.
 */

export type JellyItem = {
  value: string;
  label: React.ReactNode;
  /** Contador opcional a la derecha de la etiqueta. */
  badge?: React.ReactNode;
};

type Props = {
  items: JellyItem[];
  value: string;
  onChange: (value: string) => void;
  /** Alto del chip: 28, 36 o 44px. `lg` es la medida cómoda para el dedo. */
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  className?: string;
};

const ALTO = { sm: 'h-7 text-[11px] px-3', md: 'h-9 text-[12.5px] px-3.5', lg: 'h-11 text-[13.5px] px-4' };

// Cuánto crece el elegido, cuánto se corren los vecinos y cuánto ceden.
const SWELL_X = 1.05;
const SWELL_Y = 1.02;
const BARGE = 5;
const SHRINK = 0.97;
const STAGGER = 22;

export function JellyRadio({ items, value, onChange, size = 'md', className, ...rest }: Props) {
  const activo = items.findIndex((item) => item.value === value);

  return (
    // En mobile la fila se desliza en vez de amontonarse: con seis chips no entran en 390px.
    // El padding vertical deja aire para que el chip hinchado no se corte al crecer.
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn(
        '-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1.5',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item, i) => {
        const esActivo = i === activo;
        const distancia = activo < 0 ? 0 : i - activo;
        // Los vecinos se apartan del elegido; los de más lejos, un poco menos.
        const empuje = esActivo || activo < 0 ? 0 : Math.sign(distancia) * Math.max(0, BARGE - (Math.abs(distancia) - 1) * 2);

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={esActivo}
            onClick={() => onChange(item.value)}
            style={{
              transform: esActivo
                ? `scale(${SWELL_X}, ${SWELL_Y})`
                : `translateX(${empuje}px) scale(${SHRINK})`,
              transitionDelay: `${Math.abs(distancia) * STAGGER}ms`,
            }}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
              'transition-[transform,background-color,color] duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)]',
              'motion-reduce:transition-none motion-reduce:!transform-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              ALTO[size],
              esActivo
                ? 'bg-gm-yellow text-gm-ink'
                : 'bg-gm-surface-2 text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.badge !== undefined && (
              <span
                className={cn(
                  'gm-mono rounded-full px-1.5 py-px text-[9.5px] font-bold',
                  esActivo ? 'bg-gm-ink/15 text-gm-ink' : 'bg-gm-surface-3 text-muted-foreground',
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
