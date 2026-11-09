import { Cargando, EsqueletoEncabezado, EsqueletoResumen, EsqueletoTabla, Hueso } from '@/components/esqueletos';

// La planilla de Vehículos mientras carga: encabezado, las cifras, los filtros y la tabla.
export default function Loading() {
  return (
    <Cargando texto="Cargando la planilla…" className="container mx-auto block space-y-5 px-4 py-6">
      <EsqueletoEncabezado acciones={1} />
      <EsqueletoResumen />
      <div className="flex flex-wrap gap-3 rounded-[20px] border border-gm-line bg-card p-3.5"><Hueso className="h-11 min-w-0 flex-1 rounded-xl" /><Hueso className="h-11 w-64 rounded-[14px] max-md:hidden" /><Hueso className="h-11 w-32 rounded-xl" /></div>
      <EsqueletoTabla filas={8} columnas={[3, 2, 2, 2, 2, 2]} />
    </Cargando>
  );
}
