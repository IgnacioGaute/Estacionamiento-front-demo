"use client";

import { cn } from '@/lib/utils';
import { InfinityLoader } from './infinity-loader';

type DataLoadingProps = {
  label?: string;
  className?: string;
};

export function DataLoading({ label = 'Cargando datos…', className }: DataLoadingProps) {
  return (
    <div className={cn('flex min-w-0 items-center justify-center', className)} aria-busy="true">
      <InfinityLoader label={label} />
    </div>
  );
}
