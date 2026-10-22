'use client';

import { Segmento } from '@/components/ui/segmento';

/**
 * Segmentado de pestañas (usuarios, tickets, cocheras). Antes eran chips «gelatina» propios; ahora
 * es el Rubber Segment de toda la app (ui/segmento), con la misma firma para no tocar a quienes lo
 * usan. Con muchas opciones la fila se desliza de costado.
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
  /** Alto: 28, 36 o 44px. `lg` es la medida cómoda para el dedo. */
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  className?: string;
};

export function JellyRadio({ items, value, onChange, size = 'md', className, ...rest }: Props) {
  return <Segmento items={items} value={value} onChange={onChange} size={size} className={className} aria-label={rest['aria-label']} />;
}
