import { Cargando, EsqueletoEncabezado, Hueso } from '@/components/esqueletos';

// Mi plan mientras carga: encabezado, el estado de la cuenta, las tarjetas de planes y las
// secciones de forma de pago y pagos.
export default function Loading() {
  return (
    <div className="px-4 pb-16 pt-6 sm:px-10 sm:pt-12">
      <Cargando texto="Cargando tu plan…" className="mx-auto flex max-w-[1160px] flex-col gap-7">
        <EsqueletoEncabezado />
        <div className="flex flex-wrap gap-7 rounded-[24px] border border-gm-line bg-gm-surface p-[22px] sm:p-9">
          <div className="min-w-0 flex-[1_1_420px] space-y-4"><Hueso className="h-8 w-40 rounded-full" /><Hueso className="h-7 w-72 max-w-full" /><Hueso className="h-3.5 w-full max-w-md" /><Hueso className="h-2 w-full max-w-md rounded-full" /></div>
          <div className="flex-[1_1_260px] space-y-3"><Hueso className="h-3 w-32" /><Hueso className="h-10 w-40" /><Hueso className="h-11 w-48 rounded-[13px]" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="space-y-4 rounded-[24px] border border-gm-line bg-gm-surface p-6"><Hueso className="h-5 w-24" /><Hueso className="h-9 w-32" /><Hueso className="h-3 w-full" /><Hueso className="h-3 w-4/5" /><Hueso className="h-3 w-2/3" /></div>)}</div>
        <div className="space-y-3 rounded-[24px] border border-gm-line bg-gm-surface p-[22px] sm:p-8"><Hueso className="h-5 w-40" />{[0, 1, 2].map((i) => <div key={i} className="flex justify-between gap-3 border-t border-gm-line pt-3"><div className="space-y-1.5"><Hueso className="h-3.5 w-36" /><Hueso className="h-3 w-24" /></div><Hueso className="h-6 w-20 rounded-full" /></div>)}</div>
      </Cargando>
    </div>
  );
}
