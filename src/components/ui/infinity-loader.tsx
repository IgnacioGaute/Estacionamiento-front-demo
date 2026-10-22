'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import styles from './infinity-loader.module.css';

// Trazado y ciclo de Infinity Path de Amicro (MIT; ver infinity-loader.LICENSE).
const PATH = 'M 15 15 C 15 5, 25 5, 30 15 C 35 25, 45 25, 45 15 C 45 5, 35 5, 30 15 C 25 25, 15 25, 15 15';

export function InfinityLoader({
  label = 'Cargando…', size = 'md', compact = false,
  status = 'working', className, style,
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  status?: 'working' | 'done' | 'error';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span role="status" aria-label={label} aria-live="polite"
      className={cn(styles.loader, styles[size], className)}
      data-status={status} style={style}>
      <svg className={styles.symbol} viewBox="0 0 60 30" fill="none" strokeWidth="4" strokeLinecap="round" aria-hidden="true">
        <path d={PATH} className={styles.track} />
        <path d={PATH} className={styles.trail} strokeDasharray="100" />
      </svg>
      {!compact && <span className={styles.label} aria-hidden="true">{label}</span>}
    </span>
  );
}
