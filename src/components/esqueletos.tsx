import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Piezas para armar el esqueleto de carga de cada pantalla y componente. La regla del sistema:
// la primera carga muestra la forma de lo que viene (estas piezas, combinadas con el mismo
// contenedor y la misma grilla del componente real), y el ícono de carga queda solo para datos que
// se actualizan o se buscan dentro de algo que ya está en pantalla. Sin 'use client': sirven en los
// loading.tsx (servidor) y dentro de los componentes.

export { Skeleton as Hueso };

// Envoltorio accesible: los lectores de pantalla escuchan «Cargando…»; las piezas son cajas vacías
// y no se leen. Las piezas van como hijos directos (para que space-y, gap y grid del envoltorio se
// apliquen) y el texto oculto al final, así no le suma margen al primer bloque.
export function Cargando({ texto, className, children }: { texto: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      {children}
      <span className="sr-only">{texto}</span>
    </div>
  );
}

// El encabezado de página (PageHeader): ruta, título grande, descripción y acciones.
export function EsqueletoEncabezado({ acciones = 0, descripcion = true, className }: { acciones?: number; descripcion?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-2.5">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-8 w-52 md:h-9" />
        {descripcion && <Skeleton className="h-3.5 w-80 max-w-full" />}
      </div>
      {acciones > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: acciones }, (_, i) => <Skeleton key={i} className="h-11 w-28 rounded-md sm:h-9" />)}
        </div>
      )}
    </div>
  );
}

// El título de una opción dentro de una sección (EncabezadoSeccion).
export function EsqueletoSeccion({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-3.5 w-96 max-w-full" />
    </div>
  );
}

// Las tarjetas de resumen de las planillas (TarjetaResumen).
export function EsqueletoResumen({ cantidad = 4, className }: { cantidad?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-[18px] border border-gm-line bg-card px-[18px] py-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
      ))}
    </div>
  );
}

// Una tabla de planilla: título con cantidad, encabezados y filas. `columnas` da el ancho relativo
// de cada columna; en el celular se ven las dos primeras y la última.
export function EsqueletoTabla({ filas = 6, columnas = [3, 2, 2, 2], titulo = true, className }: { filas?: number; columnas?: number[]; titulo?: boolean; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[20px] border border-gm-line bg-card', className)}>
      {titulo && <div className="flex items-center justify-between gap-3 border-b border-gm-line px-[18px] py-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-24 rounded-md" /></div>}
      <EsqueletoFilasTabla filas={filas} columnas={columnas} />
    </div>
  );
}

// Solo los encabezados y las filas, para cuando el marco de la tabla y su título ya están en
// pantalla (las planillas cargan debajo de su CabeceraTabla).
export function EsqueletoFilasTabla({ filas = 6, columnas = [3, 2, 2, 2] }: { filas?: number; columnas?: number[] }) {
  const plantilla = { gridTemplateColumns: columnas.map((c) => `${c}fr`).join(' ') };
  const celda = (i: number) => cn(i > 1 && i < columnas.length - 1 && 'max-md:hidden');
  return (
    <>
      <div className="grid gap-4 bg-background px-[18px] py-3" style={plantilla}>
        {columnas.map((_, i) => <Skeleton key={i} className={cn('h-2.5 w-16', celda(i))} />)}
      </div>
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="grid items-center gap-4 border-t border-gm-line px-[18px] py-3.5" style={plantilla}>
          {columnas.map((_, i) => (
            <div key={i} className={cn('space-y-1.5', celda(i))}>
              <Skeleton className={cn('h-3.5', i === 0 ? 'w-36 max-w-full' : 'w-20')} />
              {i === 0 && <Skeleton className="h-2.5 w-24" />}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// Filas sueltas con borde (listas de avisos, comprobantes, turnos): nombre, detalle y dato a la derecha.
export function EsqueletoFilas({ filas = 4, className, alta = false }: { filas?: number; className?: string; alta?: boolean }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gm-line bg-card px-4', alta ? 'py-4' : 'py-3')}>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-56 max-w-full" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// Campos de formulario: etiqueta y caja (Input y Select miden 44 px en el celular y 40 en la compu).
export function EsqueletoCampos({ campos = 3, columnas = 1, className }: { campos?: number; columnas?: 1 | 2 | 3 | 4; className?: string }) {
  const grilla = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columnas];
  return (
    <div className={cn('grid gap-4', grilla, className)}>
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-11 w-full rounded-md sm:h-10" />
        </div>
      ))}
    </div>
  );
}

// Una tarjeta con título, líneas de texto y, si corresponde, un botón al pie.
export function EsqueletoTarjeta({ lineas = 2, boton = false, className }: { lineas?: number; boton?: boolean; className?: string }) {
  return (
    <div className={cn('space-y-3 rounded-2xl border border-gm-line bg-card p-5', className)}>
      <Skeleton className="h-5 w-44" />
      {Array.from({ length: lineas }, (_, i) => <Skeleton key={i} className={cn('h-3', i === lineas - 1 ? 'w-2/3' : 'w-full')} />)}
      {boton && <Skeleton className="mt-2 h-10 w-36 rounded-md" />}
    </div>
  );
}

// Una fila de pestañas o selector segmentado.
export function EsqueletoPestanias({ cantidad = 3, className }: { cantidad?: number; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {Array.from({ length: cantidad }, (_, i) => <Skeleton key={i} className="h-11 w-28 rounded-lg sm:h-9" />)}
    </div>
  );
}
