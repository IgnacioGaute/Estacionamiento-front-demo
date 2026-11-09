import { Cargando, Hueso } from '@/components/esqueletos';

// Entradas y salidas mientras carga: la forma de la pantalla del operador. En la compu, la columna
// de la izquierda (adentro ahora, avisos, registrar y cobrar, estadía larga, últimos movimientos) y
// las columnas de «En la playa»; en el celular, el encabezado, la tarjeta amarilla y los tramos.
export default function Loading() {
  return (
    <Cargando texto="Cargando entradas y salidas…" className="block py-2 sm:px-6 sm:py-7 lg:px-0 lg:py-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Hueso className="h-3.5 w-48" />
          <Hueso className="hidden h-3 w-72 lg:block" />
          <Hueso className="h-10 w-72 max-w-full lg:h-11 lg:w-80" />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
          <Hueso className="col-span-2 hidden h-12 w-96 rounded-2xl lg:block" />
          <Hueso className="h-12 rounded-2xl lg:w-32" />
          <Hueso className="h-12 rounded-2xl lg:w-44" />
        </div>
      </div>
      <Hueso className="mt-3 h-16 rounded-2xl lg:hidden" />

      <div className="mt-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-3">
          <Hueso className="h-[300px] rounded-[22px] bg-gm-yellow/15 lg:h-[170px]" />
          <div className="grid grid-cols-3 gap-2 lg:hidden">
            {Array.from({ length: 3 }, (_, i) => <Hueso key={i} className="h-28 rounded-2xl" />)}
          </div>
          <div className="hidden space-y-3 lg:block">
            <Hueso className="h-16 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3"><Hueso className="h-40 rounded-2xl" /><Hueso className="h-40 rounded-2xl" /></div>
            <Hueso className="h-20 rounded-2xl" />
            <div className="space-y-3 rounded-2xl border border-gm-line bg-card p-4">
              <Hueso className="h-4 w-40" />
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="flex items-center gap-3"><Hueso className="size-8 rounded-full" /><Hueso className="h-7 w-20" /><Hueso className="h-3 w-24" /><Hueso className="ml-auto h-3 w-10" /></div>)}
            </div>
          </div>
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className="flex items-center gap-3"><Hueso className="h-7 w-36" /><Hueso className="h-3 w-64" /></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-4">
                <div className="flex justify-between"><Hueso className="h-4 w-24" /><Hueso className="h-7 w-5" /></div>
                <Hueso className="h-3 w-28" />
                <Hueso className="h-1 w-full" />
                <Hueso className="h-24 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Cargando>
  );
}
