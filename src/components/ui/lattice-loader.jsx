'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { InfinityLoader } from './infinity-loader';

import './lattice-loader.css';

const fmt = ds => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);
const spoken = ds =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

// Un solo ícono de carga en toda la app: el infinito. El compacto (dentro de un botón) es el
// infinito chico; antes era una grilla de puntos, que quedó vieja. `pattern`, `grid`, `shape`,
// `gap` y los colores se aceptan todavía para no tocar cada uso, pero ya no cambian el dibujo.
/**
 * @param {{
 *   label?: string, doneLabel?: string, errorLabel?: string, status?: string,
 *   cellSize?: number, fontSize?: number, showTimer?: boolean, compact?: boolean, elapsed?: number,
 *   className?: string, style?: import('react').CSSProperties,
 *   pattern?: unknown, grid?: number, shape?: string, color?: string, doneColor?: string,
 *   errorColor?: string, gap?: number, step?: number, idleOpacity?: number, glow?: boolean, glowColor?: string
 * }} props
 */
export default function LatticeLoader({
  label = 'Cargando…',
  doneLabel = 'Listo en',
  errorLabel = 'Error después de',
  status = 'working',
  cellSize = 6,
  fontSize = 15,
  showTimer = true,
  compact = false,
  elapsed = undefined,
  className = '',
  style = {}
}) {
  const timerRef = useRef(null);
  const dsRef = useRef(0);
  const [announce, setAnnounce] = useState(`${label}, en progreso`);

  const paint = ds => {
    dsRef.current = ds;
    if (timerRef.current) timerRef.current.textContent = fmt(ds);
  };

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (status !== 'working') return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => paint(Math.floor((performance.now() - startedAt) / 100)), 100);
    return () => clearInterval(id);
  }, [status, elapsed]);

  useEffect(() => {
    if (status === 'working') setAnnounce(`${label}, en progreso`);
    else setAnnounce(`${status === 'done' ? doneLabel : errorLabel}${showTimer ? ` ${spoken(dsRef.current)}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <span
      role="status"
      className={`lattice-loader${className ? ` ${className}` : ''}`}
      data-status={status}
      data-bloque={compact ? undefined : ''}
      style={{ '--ll-font': `${fontSize}px`, ...style }}
    >
      <span aria-hidden="true" className="lattice-loader__icono">
        <InfinityLoader compact status={status} size={compact ? 'xs' : cellSize >= 7 ? 'lg' : 'md'} />
      </span>
      {!compact && <span className="lattice-loader__label" aria-hidden="true">
        <span className="lattice-loader__text" data-active={status === 'working' ? '' : undefined}>
          {label}
        </span>
        <span className="lattice-loader__text" data-active={status === 'done' ? '' : undefined}>
          {doneLabel}
        </span>
        <span className="lattice-loader__text" data-active={status === 'error' ? '' : undefined}>
          {errorLabel}
        </span>
      </span>}
      {!compact && showTimer ? (
        <span ref={timerRef} className="lattice-loader__timer" aria-hidden="true">
          0.0s
        </span>
      ) : null}
      <span className="lattice-loader__sr">{announce}</span>
    </span>
  );
}
