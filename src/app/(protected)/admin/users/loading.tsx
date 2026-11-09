import { Cargando, EsqueletoEncabezado, EsqueletoResumen, Hueso } from '@/components/esqueletos';

// Usuarios mientras carga: encabezado, las cuatro cifras, el filtro por rol con la búsqueda y la
// lista de usuarios.
export default function Loading() {
  return (
    <Cargando texto="Cargando usuarios…" className="container mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:p-8">
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoResumen />
      <div className="flex flex-col gap-3 rounded-[20px] border border-gm-line bg-card p-3.5 md:flex-row md:items-center"><Hueso className="h-11 w-64 rounded-[14px]" /><Hueso className="h-11 flex-1 rounded-xl" /></div>
      <div className="overflow-hidden rounded-[20px] border border-gm-line bg-card">
        <div className="border-b border-gm-line px-[18px] py-4"><Hueso className="h-4 w-28" /></div>
        <div className="space-y-3 p-3.5">
          {[0, 1, 2].map((i) => <div key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gm-line p-4"><Hueso className="size-10 rounded-xl" /><div className="flex-1 space-y-1.5"><Hueso className="h-4 w-36" /><Hueso className="h-3 w-24" /></div><Hueso className="h-9 w-20 rounded-md" /><Hueso className="size-9 rounded-md" /></div>)}
        </div>
      </div>
    </Cargando>
  );
}
