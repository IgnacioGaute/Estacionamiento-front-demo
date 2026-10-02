import React from 'react';
import { cn } from '@/lib/utils';
import LatticeLoader from './lattice-loader';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Loader: React.FC<LoaderProps> = ({ className, size = 'md', ...props }) => (
  <div className={cn('flex items-center justify-center', className)} {...props}>
    <LatticeLoader label="Cargando…" showTimer={false} cellSize={size === 'sm' ? 4 : size === 'lg' ? 7 : 6} gap={size === 'sm' ? 2 : 3} />
  </div>
);

export { Loader };
