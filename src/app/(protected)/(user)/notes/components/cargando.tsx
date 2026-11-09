import { Cargando, EsqueletoEncabezado, Hueso } from '@/components/esqueletos';

// Los avisos mientras cargan: la franja del día y las filas con el ícono, el título, el origen y la
// hora, igual que la lista.
export function FilasAvisosCargando({ filas = 4 }: { filas?: number }) {
  return (
    <Cargando texto="Cargando avisos…">
      <div className="border-t border-gm-line bg-background px-[18px] py-2.5"><Hueso className="h-2.5 w-14" /></div>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex gap-3 border-t border-gm-line px-[18px] py-4">
          <Hueso className="size-10 shrink-0 rounded-[12px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Hueso className="h-4 w-52 max-w-full" /><Hueso className="h-[22px] w-20 rounded-full" /><Hueso className="ml-auto h-3 w-10" /></div>
            <Hueso className="h-3 w-72 max-w-full" />
          </div>
        </div>
      ))}
    </Cargando>
  );
}

// La pantalla de Avisos al cargar: encabezado, el resumen en una línea, los filtros y la lista.
export function AvisosCargando() {
  return (
    <Cargando texto="Cargando avisos…" className="flex flex-col gap-5">
      <EsqueletoEncabezado acciones={1} />
      <Hueso className="h-4 w-80 max-w-full" />
      <div className="flex flex-wrap gap-3 rounded-[20px] border border-gm-line bg-card p-3.5">
        <Hueso className="h-11 min-w-0 flex-1 rounded-xl" /><Hueso className="h-11 w-56 rounded-xl max-md:hidden" /><Hueso className="h-11 w-32 rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-[20px] border border-gm-line bg-card">
        <div className="flex items-center justify-between px-[18px] py-4"><Hueso className="h-4 w-28" /></div>
        <FilasAvisosCargando />
      </div>
    </Cargando>
  );
}
