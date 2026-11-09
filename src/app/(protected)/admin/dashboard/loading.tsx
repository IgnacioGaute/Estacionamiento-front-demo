import { Cargando, EsqueletoEncabezado, Hueso } from '@/components/esqueletos';

// El Panel mientras carga: el encabezado, el mapa de actividad, la actividad por hora, el selector
// de fechas y la grilla de gráficos.
export default function Loading() {
  return (
    <Cargando texto="Cargando el panel…" className="container mx-auto block px-4 py-4 sm:p-6">
      <EsqueletoEncabezado acciones={1} className="mb-6" />
      <div className="mb-4 space-y-4 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-4 w-40" /><Hueso className="h-44 w-full rounded-xl" /></div>
      <div className="mb-4 space-y-4 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-4 w-36" /><Hueso className="h-56 w-full rounded-xl" /></div>
      <div className="mb-3 flex justify-end"><Hueso className="h-10 w-60 rounded-md" /></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="space-y-4 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-4 w-40" /><Hueso className="h-48 w-full rounded-xl" /></div>)}
      </div>
    </Cargando>
  );
}
