"use client";

import { cn } from '@/lib/utils';
import LatticeLoader from './lattice-loader';

type DataLoadingProps = {
  label?: string;
  className?: string;
};

export function DataLoading({ label = 'Cargando datos…', className }: DataLoadingProps) {
  return (
    <div className={cn('flex min-w-0 items-center', className)} aria-busy="true">
      <LatticeLoader label={label} fontSize={13} cellSize={5} gap={2.5} showTimer={false} />
    </div>
  );
}
