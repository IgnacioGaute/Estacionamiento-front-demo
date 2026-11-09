import { Cargando, EsqueletoEncabezado, Hueso } from '@/components/esqueletos';

// Pagar tu plan mientras carga: volver, encabezado, las formas de pago y el resumen al costado.
export default function Loading() {
  return (
    <div className="px-4 pb-16 pt-5 sm:px-10 sm:pt-10">
      <Cargando texto="Cargando el pago…" className="mx-auto flex max-w-[1100px] flex-col gap-7">
        <div className="flex items-center justify-between gap-3"><Hueso className="h-9 w-28 rounded-md" /><Hueso className="h-3.5 w-44" /></div>
        <EsqueletoEncabezado />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-4 rounded-[18px] border border-gm-line bg-gm-surface p-5"><Hueso className="size-5 rounded-full" /><div className="flex-1 space-y-2"><Hueso className="h-4 w-40" /><Hueso className="h-3 w-64 max-w-full" /></div></div>)}</div>
          <div className="space-y-4 rounded-[24px] border border-gm-line bg-gm-surface p-6"><Hueso className="h-3 w-20" /><Hueso className="h-9 w-36" />{[0, 1, 2].map((i) => <div key={i} className="flex justify-between"><Hueso className="h-3 w-24" /><Hueso className="h-3 w-16" /></div>)}<Hueso className="h-12 w-full rounded-[13px]" /></div>
        </div>
      </Cargando>
    </div>
  );
}
