import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Piezas visuales compartidas por la sección de turnos (página de Caja, diálogos de turno,
// historial y planilla), para que todas hablen el mismo idioma: rótulos en versalitas, cifras
// grandes en la tipografía de la marca y estados como píldoras de color.

export const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export function Etiqueta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground', className)}>{children}</p>;
}

export function Cifra({ value, className }: { value: number; className?: string }) {
  return <p className={cn('font-display text-[34px] font-bold leading-none tracking-tight tabular-nums', className)}>{money(value)}</p>;
}

export function Iniciales({ nombre, className }: { nombre: string; className?: string }) {
  const letras = nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]?.toUpperCase() ?? '').join('') || '·';
  return <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-full border border-gm-line-strong bg-gm-surface-3 text-[12px] font-bold text-[#D9D1C3]', className)}>{letras}</span>;
}

type Tono = 'ok' | 'aviso' | 'error' | 'neutro' | 'marca';
const TONOS: Record<Tono, { caja: string; punto: string }> = {
  ok: { caja: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400', punto: 'bg-emerald-400' },
  error: { caja: 'border-red-400/30 bg-red-400/10 text-red-400', punto: 'bg-red-400' },
  aviso: { caja: 'border-amber-400/30 bg-amber-400/10 text-amber-400', punto: 'bg-amber-400' },
  neutro: { caja: 'border-gm-line-strong bg-gm-surface-3 text-muted-foreground', punto: 'bg-muted-foreground/70' },
  marca: { caja: 'border-gm-yellow/30 bg-gm-yellow/10 text-gm-yellow', punto: 'bg-gm-yellow' },
};

export function Pill({ tono = 'neutro', children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-bold', TONOS[tono].caja, className)}>
    <span aria-hidden className={cn('size-1.5 rounded-full', TONOS[tono].punto)} />{children}
  </span>;
}

// Paso numerado de un formulario de caja: el número se vuelve un tilde cuando el paso está listo.
export function Paso({ numero, listo, ultimo, children }: { numero: number; listo?: boolean; ultimo?: boolean; children: ReactNode }) {
  return <li className="relative pl-10">
    {!ultimo && <span aria-hidden className="absolute bottom-[-20px] left-[13px] top-8 w-px bg-gm-line-strong" />}
    <span aria-hidden className={cn('gm-mono absolute left-0 top-0 grid size-7 place-items-center rounded-full border text-[12px] font-bold transition-colors', listo ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-gm-line-strong bg-gm-surface-3 text-muted-foreground')}>{listo ? '✓' : numero}</span>
    {children}
  </li>;
}
