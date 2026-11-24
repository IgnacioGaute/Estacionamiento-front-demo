'use client';

// Las piezas de los filtros de Movimientos y Comprobantes: el buscador, el período en un selector de
// un toque, los chips (con su cantidad o con la X para quitarlos), el estado vacío y «Ver más». Las
// dos pantallas se leen igual.

import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const enfoque = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';

export function BuscadorHistorial({ value, onChange, placeholder, etiqueta }: { value: string; onChange: (value: string) => void; placeholder: string; etiqueta: string }) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-[14px] border-[1.5px] border-gm-line-strong bg-background px-4 transition-colors focus-within:border-gm-yellow/70 sm:h-[52px]">
      <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{etiqueta}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" enterKeyHint="search"
        className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Borrar la búsqueda" className={cn('-mr-2 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground', enfoque)}>
          <X className="size-4" aria-hidden />
        </button>
      )}
    </label>
  );
}

// Opciones excluyentes en una cápsula (Hoy · Ayer · 7 días…): la elegida, en amarillo.
export function Segmentado<T extends string>({ opciones, valor, onChange, etiqueta, className }: {
  opciones: { id: T; texto: ReactNode; etiqueta?: string }[];
  valor: T;
  onChange: (id: T) => void;
  etiqueta: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-[14px] border border-gm-line bg-background p-1', className)}>
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} aria-label={o.etiqueta} onClick={() => onChange(o.id)}
          className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-sm font-semibold transition-colors', enfoque,
            valor === o.id ? 'bg-gm-yellow font-bold text-gm-ink' : 'text-gm-texto-2 hover:bg-gm-surface-2 hover:text-foreground')}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

// Un chip de filtro. `cuenta`: cuántos hay con ese filtro. `onQuitar`: un filtro activo que se saca con la X.
export function ChipFiltro({ activo, onClick, children, cuenta, onQuitar, className }: {
  activo?: boolean;
  onClick?: () => void;
  children: ReactNode;
  cuenta?: number;
  onQuitar?: () => void;
  className?: string;
}) {
  const clase = cn('inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition-colors', enfoque,
    activo ? 'border-gm-yellow bg-gm-yellow/[0.12] text-foreground' : 'border-gm-line text-gm-texto-2 hover:border-gm-yellow/40 hover:text-foreground', className);
  if (onQuitar)
    return (
      <button type="button" onClick={onQuitar} className={clase} aria-label={`Quitar el filtro ${typeof children === 'string' ? children : ''}`.trim()}>
        {children}
        <X className="size-3.5" strokeWidth={2.4} aria-hidden />
      </button>
    );
  return (
    <button type="button" aria-pressed={!!activo} onClick={onClick} className={clase}>
      {children}
      {cuenta !== undefined && <span className={cn('gm-mono text-xs font-bold', activo ? 'text-gm-yellow' : 'text-muted-foreground')}>{cuenta}</span>}
    </button>
  );
}

// Un interruptor con su texto (Solo mi turno).
export function Interruptor({ activo, onChange, children, className }: { activo: boolean; onChange: (activo: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)}
      className={cn('inline-flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] py-1 pl-2.5 pr-4 text-left text-sm font-semibold transition-colors', enfoque,
        activo ? 'border-gm-yellow bg-gm-yellow/[0.12] text-foreground' : 'border-gm-line text-gm-texto-2 hover:border-gm-yellow/40', className)}>
      <span aria-hidden className={cn('relative h-5 w-[34px] shrink-0 rounded-full transition-colors', activo ? 'bg-gm-yellow' : 'bg-gm-surface-3')}>
        <span className={cn('absolute top-[3px] size-3.5 rounded-full transition-all', activo ? 'right-[3px] bg-gm-ink' : 'left-[3px] bg-muted-foreground')} />
      </span>
      {children}
    </button>
  );
}

export function EstadoVacio({ icono, titulo, texto, children }: { icono: ReactNode; titulo: string; texto?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] border border-gm-line bg-card px-6 py-10 text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-gm-yellow/[0.12] text-gm-yellow">{icono}</span>
      <div className="max-w-sm">
        <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[0.02em]">{titulo}</h2>
        {texto && <p className="mt-2 text-[15px] leading-relaxed text-gm-texto-2">{texto}</p>}
      </div>
      {children && <div className="flex w-full max-w-xs flex-col gap-2">{children}</div>}
    </div>
  );
}

export function VerMas({ mostrando, total, cargando, onClick }: { mostrando: number; total: number; cargando: boolean; onClick: () => void }) {
  if (!total) return null;
  const quedan = total - mostrando;
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p aria-live="polite" className="text-[13px] text-muted-foreground">Mostrando {mostrando} de {total}</p>
      {quedan > 0 && (
        <button type="button" onClick={onClick} disabled={cargando}
          className={cn('min-h-11 rounded-full border-[1.5px] border-gm-line-strong px-5 text-sm font-semibold transition-colors hover:border-gm-yellow/50 disabled:opacity-50', enfoque)}>
          {cargando ? 'Cargando…' : `Ver ${Math.min(quedan, 20)} más`}
        </button>
      )}
    </div>
  );
}
