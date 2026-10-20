'use client';

// Piezas compartidas por las planillas de administración (Vehículos, Frecuentes): el mismo
// resumen arriba, el mismo bloque de filtros, las mismas chapas y la misma tabla, así una pantalla
// no se ve distinta de la otra. La permanencia usa los colores de los tramos de la pantalla de
// operación (src/utils/estadia.ts), que ya dicen «hace cuánto» en todo el sistema.

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRAMOS, tramoInfo, formatEstadia } from '@/utils/estadia';

export const tarjetaPlanilla = 'rounded-[20px] border border-gm-line bg-card';
export const thPlanilla = 'px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground first:pl-[18px] last:pr-[18px]';
export const tdPlanilla = 'px-3 py-3 align-middle first:pl-[18px] last:pr-[18px]';

export function TarjetaResumen({ etiqueta, valor, detalle, destacada = false }: { etiqueta: string; valor: ReactNode; detalle?: string; destacada?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-[18px] px-[18px] py-4', destacada ? 'bg-gm-yellow text-gm-ink' : 'border border-gm-line bg-card')}>
      <span className={cn('text-xs font-bold uppercase tracking-[0.12em]', destacada ? 'text-gm-ink/75' : 'text-muted-foreground')}>{etiqueta}</span>
      <span className="gm-display text-[40px] font-semibold leading-none tabular-nums sm:text-[44px]">{valor}</span>
      {detalle && <span className={cn('text-[12.5px]', destacada ? 'font-semibold text-gm-ink/75' : 'text-muted-foreground')}>{detalle}</span>}
    </div>
  );
}

// Patente como chapa clara; una tarjeta física o un registro sin patente, con su distintivo oscuro.
export function ChapaVehiculo({ texto, tarjeta = false, className }: { texto: string; tarjeta?: boolean; className?: string }) {
  return (
    <span className={cn('gm-mono inline-flex h-[30px] shrink-0 items-center whitespace-nowrap px-2.5 font-bold',
      tarjeta ? 'rounded-[7px] border-[1.5px] border-gm-line-strong bg-gm-surface-3 text-[13.5px] tracking-[0.04em] text-foreground'
        : 'rounded-[6px] border-2 border-gm-ink bg-foreground text-[14px] uppercase tracking-[0.08em] text-gm-ink', className)}>
      {texto}
    </span>
  );
}

export function EtiquetaTipo({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-[26px] items-center rounded-full bg-gm-surface-3 px-2.5 text-[12.5px] font-semibold text-[#D9D1C3]">{children}</span>;
}

export function SelectorSegmentado<T extends string>({ opciones, valor, onChange, etiqueta, disabled }: {
  opciones: { id: T; label: string; cantidad?: number | null }[]; valor: T; onChange: (id: T) => void; etiqueta: string; disabled?: boolean;
}) {
  return (
    // En el celular ocupa el ancho y las opciones se reparten: si una baja de renglón, los dos
    // renglones quedan parejos en vez de dejar un hueco.
    <div role="group" aria-label={etiqueta} className="flex w-full flex-wrap gap-1 rounded-[14px] border border-gm-line bg-background p-1 sm:inline-flex sm:w-auto sm:max-w-full">
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button key={o.id} type="button" aria-pressed={activo} disabled={disabled} onClick={() => onChange(o.id)}
            className={cn('inline-flex min-h-10 flex-auto items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-bold sm:flex-none sm:gap-2 sm:px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
              activo ? 'bg-foreground text-background' : 'text-[#D9D1C3] hover:text-foreground')}>
            {o.label}
            {o.cantidad != null && (
              <span className={cn('gm-mono inline-grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[11.5px]', activo ? 'bg-background text-foreground' : 'bg-gm-surface-3 text-muted-foreground')}>
                {o.cantidad.toLocaleString('es-AR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ChipFiltro({ activo, onClick, disabled, children }: { activo?: boolean; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={activo} disabled={disabled} onClick={onClick}
      className={cn('inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
        activo ? 'border-gm-yellow bg-gm-yellow/[0.12] font-bold text-gm-yellow' : 'border-gm-line-strong font-semibold text-[#D9D1C3] hover:text-foreground')}>
      {children}
    </button>
  );
}

// La permanencia con su barra: el color del tramo (como en Entradas y salidas) y el largo sobre 8 h.
export function Permanencia({ minutos, sufijo }: { minutos: number | null; sufijo?: string }) {
  if (minutos == null) return <span className="text-muted-foreground">—</span>;
  const ancho = Math.min(100, Math.max(6, Math.round((minutos / 480) * 100)));
  return (
    <div className="flex min-w-[140px] flex-col gap-1.5">
      <span className="gm-mono text-[14px] font-bold">{formatEstadia(minutos)}{sufijo ? <span className="font-sans text-xs font-medium text-muted-foreground"> {sufijo}</span> : null}</span>
      <span aria-hidden className="block h-[5px] rounded-full bg-gm-surface-3">
        <span className="block h-[5px] rounded-full" style={{ width: `${ancho}%`, background: tramoInfo(minutos).color }} />
      </span>
    </div>
  );
}

export function LeyendaTramos() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {TRAMOS.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: t.color }} />{t.label.toLowerCase()}</span>
      ))}
    </span>
  );
}

// Encabezado de la tabla (título con cantidad y algo a la derecha) y su pie con la paginación.
export function CabeceraTabla({ titulo, cantidad, children }: { titulo: string; cantidad: number; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-gm-line px-[18px] py-4">
      <h2 className="text-base font-bold">{titulo} <span className="font-medium text-muted-foreground">· {cantidad.toLocaleString('es-AR')}</span></h2>
      {children}
    </div>
  );
}

export function PieTabla({ pagina, porPagina, total, mostrados, onCambiar, disabled }: {
  pagina: number; porPagina: number; total: number; mostrados: number; onCambiar: (pagina: number) => void; disabled?: boolean;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const boton = 'grid h-10 w-11 place-items-center rounded-[10px] border border-gm-line-strong text-foreground transition-colors hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:border-gm-line disabled:text-[#6F665A]';
  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 border-t border-gm-line px-[18px] py-3.5">
      <span aria-live="polite" className="text-[13px] text-muted-foreground">
        {total ? `${(pagina * porPagina + 1).toLocaleString('es-AR')}–${(pagina * porPagina + mostrados).toLocaleString('es-AR')} de ${total.toLocaleString('es-AR')}` : 'Sin resultados'}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Página anterior" className={boton} disabled={disabled || pagina === 0} onClick={() => onCambiar(pagina - 1)}><ChevronLeft className="size-4" aria-hidden /></button>
        <span className="gm-mono min-w-12 text-center text-xs text-muted-foreground">{pagina + 1}/{paginas}</span>
        <button type="button" aria-label="Página siguiente" className={boton} disabled={disabled || pagina + 1 >= paginas} onClick={() => onCambiar(pagina + 1)}><ChevronRight className="size-4" aria-hidden /></button>
      </div>
    </nav>
  );
}

export function Iniciales({ nombre }: { nombre: string | null }) {
  const iniciales = (nombre ?? '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '—';
  return <span aria-hidden className="grid size-[22px] shrink-0 place-items-center rounded-full bg-gm-surface-3 text-[10px] font-bold text-[#D9D1C3]">{iniciales}</span>;
}
