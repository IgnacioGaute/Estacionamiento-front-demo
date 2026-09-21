'use client';

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
 * El color de línea va sin opacidad a propósito (`border-border`, no `border-border/60`): con
 * alpha, donde el codo se superpone al tronco el empalme queda más oscuro y se nota.
 */

type RamaProps = {
  label: string;
  abierta: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
};

export function Rama({ label, abierta, onAlternar, children }: RamaProps) {
  return (
    <>
      <DropdownMenuItem
        // preventDefault: tocar un encabezado pliega la rama, no cierra el menú.
        onSelect={(event) => event.preventDefault()}
        onClick={onAlternar}
        aria-expanded={abierta}
        className="cursor-pointer gap-2 rounded-lg px-2.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-foreground focus:bg-white/[0.08] data-[highlighted]:bg-white/[0.08]"
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
        className={cn(
          'relative overflow-hidden pl-[34px] transition-all duration-300 ease-out motion-reduce:transition-none',
          "before:absolute before:left-[13px] before:top-0 before:bottom-[17px] before:w-px before:bg-border before:content-['']",
          abierta ? 'max-h-[280px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </>
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
      className={cn(
        'relative cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors duration-150',
        "before:absolute before:-left-[21px] before:top-0 before:h-[17px] before:w-[21px] before:rounded-bl-[9px] before:border-b before:border-l before:border-border before:transition-colors before:duration-300 before:content-[''] motion-reduce:before:transition-none",
        activa
          ? 'bg-gm-yellow/10 text-gm-yellow before:border-gm-yellow focus:bg-gm-yellow/15 data-[highlighted]:bg-gm-yellow/15'
          : 'text-foreground focus:bg-white/[0.08] data-[highlighted]:bg-white/[0.08]',
      )}
    >
      {children}
    </DropdownMenuItem>
  );
}
