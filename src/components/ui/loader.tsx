import React from 'react';
import { cn } from '@/lib/utils';
import { InfinityLoader } from './infinity-loader';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Loader: React.FC<LoaderProps> = ({ className, size = 'md', ...props }) => (
  <div className={cn('flex w-full items-center justify-center', className)} {...props}>
    <InfinityLoader label="Cargando…" size={size} />
  </div>
);

export { Loader };
