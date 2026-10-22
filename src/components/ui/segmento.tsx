'use client';

// El segmentado de toda la app: Rubber Segment de React Bits (components/reactbits) con los colores
// de la marca. La pastilla se estira al cambiar de opción, se puede arrastrar y rebota en los bordes.
// Lo usan las pestañas de shadcn (ui/tabs), Segmentos de la plataforma, JellyRadio y los selectores
// armados a mano. Con muchas opciones, la fila se desliza de costado en vez de amontonarse.

import type { ReactNode } from 'react';
import RubberSegment from '@/components/reactbits/RubberSegment';
import { cn } from '@/lib/utils';

export type SegmentoItem = { value: string; label: ReactNode; icon?: ReactNode; badge?: ReactNode };

export const SEGMENTO_COLORES = {
  track: '#12100D',
  thumb: '#F5C219',
  thumbClaro: '#F2EDE3',
  text: '#D9D1C3',
  activeText: '#201204',
};

// El número va dos veces (abajo y dentro de la pastilla): toma el color del texto de cada capa.
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="gm-mono rounded-full bg-[color-mix(in_srgb,currentColor_16%,transparent)] px-1.5 py-px text-[10.5px] font-bold">
      {children}
    </span>
  );
}

export function Segmento({
  items,
  value,
  onChange,
  size = 'md',
  claro,
  ancho,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  items: SegmentoItem[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  // Pastilla en crema en vez de amarillo: para selectores secundarios dentro de una tarjeta.
  claro?: boolean;
  // Ocupa todo el ancho, con las opciones del mismo tamaño.
  ancho?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div className={cn('-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', ancho && 'w-[calc(100%+0.5rem)]', className)}>
      <RubberSegment
        items={items.map((item) => ({
          value: item.value,
          icon: item.icon,
          label: item.badge === undefined ? item.label : <>{item.label}<Badge>{item.badge}</Badge></>,
        }))}
        value={value}
        onChange={(next) => onChange(next)}
        size={size}
        radius={size === 'sm' ? 12 : 14}
        inset={3}
        trackColor={SEGMENTO_COLORES.track}
        thumbColor={claro ? SEGMENTO_COLORES.thumbClaro : SEGMENTO_COLORES.thumb}
        textColor={SEGMENTO_COLORES.text}
        activeTextColor={SEGMENTO_COLORES.activeText}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn('font-semibold shadow-[inset_0_0_0_1px_hsl(var(--gm-line))]', ancho && 'w-full')}
      />
    </div>
  );
}
