'use client';

// Las tarjetas de planes: Pixel Card de React Bits (components/reactbits) sobre la superficie de la
// marca. Los píxeles aparecen al entrar en pantalla y al pasar el mouse (con un pulso al tocar): la
// destacada en amarillo, las demás en crema. El centro se desvanece (fade) para que el precio se lea.
// La etiqueta de arriba («Tu plan», «Más elegido») va afuera porque la tarjeta recorta lo que
// sobresale.

import type { ReactNode } from 'react';
import PixelCard from '@/components/reactbits/PixelCard';
import { cn } from '@/lib/utils';

const PIXELES = {
  destacada: { colors: ['#FFE38A', '#F5C219', '#B88A0B'], glowColor: '#F5C219', gap: 4 },
  comun: { colors: ['#F6F0E6', '#D9D0C2', '#8F8676'], glowColor: '#BDB4A6', gap: 6 },
};

export function TarjetaPixel({
  destacada = false,
  distintivo,
  atenuada = false,
  className,
  children,
}: {
  destacada?: boolean;
  // La etiqueta amarilla de arriba.
  distintivo?: string;
  // Un plan que no se ofrece: toda la tarjeta (con su etiqueta) más apagada.
  atenuada?: boolean;
  // Padding y separación del contenido.
  className?: string;
  children: ReactNode;
}) {
  const pixeles = destacada ? PIXELES.destacada : PIXELES.comun;
  return (
    <div className={cn('relative flex min-w-0', atenuada && 'opacity-60')}>
      <PixelCard
        colors={pixeles.colors}
        glowColor={pixeles.glowColor}
        gap={pixeles.gap}
        speed={25}
        fade={0.55}
        radius={16}
        // Sin parada de tabulación propia: la tarjeta ya tiene su botón o sus campos.
        noFocus
        className={cn(
          '!flex !h-auto !w-auto min-w-0 flex-1 flex-col !place-items-stretch ![background:#1B1915] !select-auto',
          destacada ? 'border-[1.5px] border-[#F6F0E6]' : 'border border-[#2E2A23]',
          className,
        )}
      >
        {children}
      </PixelCard>
      {distintivo && (
        <span className="absolute -top-3 left-8 z-[3] rounded-full bg-gm-yellow px-2.5 py-1 text-xs font-bold text-[#12100D]">
          {distintivo}
        </span>
      )}
    </div>
  );
}
