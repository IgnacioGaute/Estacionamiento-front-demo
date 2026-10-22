'use client';

// Eliminar en toda la app: Hold Button de React Bits (components/reactbits). Hay que mantenerlo
// apretado; el rojo sube como un líquido y, si se suelta antes, vuelve. En las bajas importantes
// (usuarios, clientes, tarifas) va dentro de un diálogo de confirmación; en las livianas (una
// estadía cargada por error, un aviso) es el único paso.

import type { ReactNode } from 'react';
import HoldButton from '@/components/reactbits/HoldButton';
import { cn } from '@/lib/utils';

export function BotonMantener({
  children = 'Mantené para eliminar',
  hecho = 'Eliminado',
  icono,
  onHold,
  disabled,
  size = 'md',
  ancho,
  holdTime = 1500,
  className,
}: {
  children?: ReactNode;
  hecho?: ReactNode;
  icono?: ReactNode;
  onHold: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // Ocupa todo el ancho (pie de un diálogo en el celular).
  ancho?: boolean;
  holdTime?: number;
  className?: string;
}) {
  return (
    <HoldButton
      onHold={onHold}
      disabled={disabled}
      size={size}
      icon={icono}
      doneLabel={hecho}
      holdTime={holdTime}
      backgroundColor="#2A1915"
      fillColor="#C8432A"
      textColor="#F08775"
      fillTextColor="#FFFFFF"
      radius={size === 'sm' ? 10 : 12}
      // Lo resuelve quien lo usa (cierra el diálogo, saca la fila); si falla, vuelve solo.
      resetAfter={1800}
      className={cn('font-semibold', ancho && 'w-full', className)}
    >
      {children}
    </HoldButton>
  );
}
