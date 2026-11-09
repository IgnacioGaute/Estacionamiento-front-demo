import { Cargando, EsqueletoEncabezado, EsqueletoTabla, Hueso } from '@/components/esqueletos';

// Frecuentes mientras carga: encabezado, el resumen en una línea, los filtros y la tabla.
export default function Loading() {
  return (
    <Cargando texto="Cargando clientes frecuentes…" className="container mx-auto block space-y-5 px-4 py-6">
      <EsqueletoEncabezado />
      <Hueso className="h-4 w-80 max-w-full" />
      <div className="flex flex-wrap gap-3 rounded-[20px] border border-gm-line bg-card p-3.5"><Hueso className="h-11 min-w-0 flex-1 rounded-xl" /><Hueso className="h-11 w-56 rounded-[14px]" /></div>
      <EsqueletoTabla filas={8} columnas={[3, 2, 1, 2, 2]} />
    </Cargando>
  );
}
