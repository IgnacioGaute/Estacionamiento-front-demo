import { Cargando, Hueso } from '@/components/esqueletos';

// La configuración inicial mientras carga: la barra de arriba, los pasos al costado y el paso actual.
export default function Loading() {
  return (
    <Cargando texto="Cargando la configuración inicial…" className="relative block min-h-[100dvh] bg-gm-hondo">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4 sm:px-8"><Hueso className="size-8 rounded-lg" /><div className="space-y-1.5"><Hueso className="h-2.5 w-28" /><Hueso className="h-3.5 w-40" /></div></div>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden space-y-4 lg:block">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="flex items-center gap-3"><Hueso className="size-8 rounded-full" /><Hueso className="h-3.5 w-36" /></div>)}</div>
        <div className="space-y-6">
          <div className="space-y-3"><Hueso className="h-3 w-24" /><Hueso className="h-10 w-80 max-w-full" /><Hueso className="h-4 w-full max-w-xl" /></div>
          <div className="space-y-4 rounded-[22px] border border-gm-line bg-gm-surface p-6"><Hueso className="h-5 w-48" /><Hueso className="h-11 w-full rounded-md" /><Hueso className="h-11 w-full rounded-md" /><Hueso className="h-11 w-2/3 rounded-md" /></div>
        </div>
      </div>
    </Cargando>
  );
}
