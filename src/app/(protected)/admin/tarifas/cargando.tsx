import { Cargando, EsqueletoCampos, Hueso } from '@/components/esqueletos';

// Tarifas mientras carga: las pestañas, la tarjeta de tarifas vigentes (forma de cobro, vehículo,
// día o noche y los precios), el botón de editar y el simulador.
export function TarifasPantallaCargando() {
  return (
    <Cargando texto="Cargando tarifas…" className="block space-y-6">
      <div className="flex gap-1.5 rounded-xl border border-gm-line p-1 w-fit"><Hueso className="h-9 w-28 rounded-lg" /><Hueso className="h-9 w-36 rounded-lg" /></div>
      <div className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="space-y-2"><Hueso className="h-6 w-44" /><Hueso className="h-3.5 w-52" /><Hueso className="h-3 w-full max-w-2xl" /></div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gm-line p-4"><div className="space-y-2"><Hueso className="h-3 w-28" /><Hueso className="h-9 w-20 rounded-md" /></div><Hueso className="size-14 rounded-2xl" /></div>
        <div className="overflow-hidden rounded-2xl border border-gm-line">
          <div className="flex items-center gap-3 border-b border-gm-line p-4"><Hueso className="size-11 rounded-xl" /><div className="space-y-2"><Hueso className="h-5 w-24" /><Hueso className="h-3.5 w-28" /></div></div>
          <div className="p-5"><div className="space-y-2.5 rounded-xl border border-gm-line p-5"><Hueso className="h-8 w-32" /><Hueso className="h-3.5 w-28" /><Hueso className="h-3 w-44" /></div></div>
        </div>
      </div>
      <Hueso className="h-11 w-40 rounded-md sm:h-9" />
      <div className="space-y-4 rounded-2xl border border-gm-yellow/30 bg-gm-yellow/[0.03] p-4 sm:p-6">
        <Hueso className="h-6 w-56" /><Hueso className="h-3.5 w-80 max-w-full" />
        <EsqueletoCampos campos={4} columnas={4} />
      </div>
    </Cargando>
  );
}

// Los pases por día, semana o mes: el selector de vehículo y las filas de precios.
export function PasesCargando() {
  return (
    <Cargando texto="Cargando vehículos…" className="block space-y-4">
      <div className="flex flex-wrap gap-2">{[0, 1, 2].map((i) => <Hueso key={i} className="h-10 w-24 rounded-xl" />)}</div>
      <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-gm-line bg-card px-4 py-3.5"><div className="space-y-1.5"><Hueso className="h-3.5 w-28" /><Hueso className="h-2.5 w-20" /></div><Hueso className="h-5 w-20" /></div>)}</div>
    </Cargando>
  );
}
