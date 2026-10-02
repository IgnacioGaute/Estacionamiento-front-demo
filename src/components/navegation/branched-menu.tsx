'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Menú en árbol para el dropdown del usuario.
 *
 * Los hijos cuelgan de una línea troncal mediante codos curvos: el tronco es el `before` del
 * contenedor y cada codo el `before` de su fila. El codo mide media fila de alto, así el trazo
 * muere justo en el centro del texto.
 *
 * En escritorio el tramo amarillo termina al comenzar la hoja activa; su propio codo completa
 * la unión. En móvil se muestra una guía vertical y la hoja activa usa un fondo degradado.
 */

type RamaProps = {
  label: string;
  abierta: boolean;
  activa?: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
};

export function Rama({ label, abierta, activa, onAlternar, children }: RamaProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeLineHeight, setActiveLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (!abierta || !activa || !contentRef.current) return;
    const content = contentRef.current;
    const activeItem = content.querySelector<HTMLElement>('[data-branch-active="true"]');
    if (!activeItem) return;
    const measure = () => {
      const parent = content.getBoundingClientRect();
      const item = activeItem.getBoundingClientRect();
      setActiveLineHeight(Math.max(0, Math.round(item.top - parent.top)));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    observer.observe(activeItem);
    return () => observer.disconnect();
  }, [abierta, activa, children]);

  return (
    <div className="relative">
      <DropdownMenuItem
        // preventDefault: tocar un encabezado pliega la rama, no cierra el menú.
        onSelect={(event) => event.preventDefault()}
        onClick={onAlternar}
        aria-expanded={abierta}
        className="min-h-10 cursor-pointer gap-2 rounded-lg px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-foreground focus:bg-white/[0.08] data-[highlighted]:bg-white/[0.08] lg:min-h-0 lg:px-2.5 lg:py-1.5"
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none',
            abierta && 'rotate-90',
          )}
        />
        {label}
      </DropdownMenuItem>

      <div
        ref={contentRef}
        className={cn(
          'relative overflow-hidden pl-6 transition-all duration-300 ease-out motion-reduce:transition-none lg:pl-[34px]',
          "before:absolute before:left-[10px] before:top-0 before:bottom-0 before:w-[2px] before:bg-border before:content-[''] lg:before:left-[13px] lg:before:bottom-[17px] lg:before:w-px",
          abierta ? 'max-h-[520px] opacity-100 lg:max-h-[280px]' : 'max-h-0 opacity-0',
        )}
      >
        {abierta && activa && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[10px] top-0 z-[1] w-[2px] rounded-full bg-gm-yellow lg:hidden" />}
        {abierta && activa && activeLineHeight > 0 && <span aria-hidden="true" className="pointer-events-none absolute left-[13px] top-0 z-[1] hidden w-px bg-gm-yellow lg:block" style={{ height: activeLineHeight }} />}
        {children}
      </div>
    </div>
  );
}

type HojaProps = {
  activa?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
};

/** Una hoja que cuelga de una rama: lleva el codo curvo a la izquierda. */
export function HojaDeRama({ activa, onSelect, children }: HojaProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      data-branch-active={activa ? 'true' : undefined}
      className={cn(
        'relative min-h-[52px] cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 [&>svg]:size-4 lg:min-h-0 lg:gap-2.5 lg:rounded-lg lg:px-2.5 lg:py-1.5 lg:text-[12.5px] lg:font-normal lg:[&>svg]:size-3.5',
        "before:absolute before:-left-[21px] before:top-0 before:hidden before:h-[17px] before:w-[21px] before:rounded-bl-[9px] before:border-b before:border-l before:border-border before:transition-colors before:duration-300 before:content-[''] motion-reduce:before:transition-none lg:before:block",
        activa
          ? 'bg-gradient-to-r from-gm-yellow/25 via-gm-yellow/10 to-transparent text-gm-yellow ring-1 ring-inset ring-gm-yellow/20 before:border-gm-yellow focus:from-gm-yellow/30 lg:ring-0 lg:focus:bg-gm-yellow/15 lg:data-[highlighted]:bg-gm-yellow/15'
          : 'text-foreground focus:bg-white/[0.08] data-[highlighted]:bg-white/[0.08]',
      )}
    >
      {children}
    </DropdownMenuItem>
  );
}
