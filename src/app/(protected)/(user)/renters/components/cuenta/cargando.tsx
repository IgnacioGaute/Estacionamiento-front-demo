import { Cargando, EsqueletoEncabezado, Hueso } from '@/components/esqueletos';

// Esqueletos de Inquilinos y de la cuenta corriente: la forma de cada parte mientras carga, en
// lugar del ícono que reemplazaba el componente entero.

// Las filas de la tabla de inquilinos (en la compu, la grilla de columnas; en el celular, tarjetas).
export function FilasInquilinosCargando({ filas = 5 }: { filas?: number }) {
  return (
    <Cargando texto="Cargando cuentas…">
      <div className="hidden md:block">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_150px_140px_210px_200px] items-center border-t border-gm-line px-5 py-2">
            <div className="flex items-center gap-3"><Hueso className="size-9 rounded-full" /><div className="space-y-1.5"><Hueso className="h-3.5 w-40" /><Hueso className="h-2.5 w-24" /></div></div>
            <Hueso className="h-3.5 w-12" />
            <Hueso className="h-3.5 w-20" />
            <Hueso className="h-6 w-28 rounded-full" />
            <div className="flex justify-end gap-2"><Hueso className="h-9 w-20 rounded-md" /><Hueso className="h-9 w-24 rounded-md" /></div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-gm-line md:hidden">
        {Array.from({ length: Math.min(filas, 4) }, (_, i) => (
          <div key={i} className="space-y-3 px-4 py-4">
            <div className="flex items-center gap-3"><Hueso className="size-9 rounded-full" /><div className="flex-1 space-y-1.5"><Hueso className="h-3.5 w-40" /><Hueso className="h-2.5 w-24" /></div><Hueso className="h-6 w-24 rounded-full" /></div>
            <div className="flex gap-2"><Hueso className="h-11 flex-1 rounded-md" /><Hueso className="h-11 flex-1 rounded-md" /></div>
          </div>
        ))}
      </div>
    </Cargando>
  );
}

// La pantalla de Inquilinos entera (carga de la página): encabezado, cuatro cifras, búsqueda,
// filtros y la tabla.
export function InquilinosCargando() {
  return (
    <Cargando texto="Cargando inquilinos…" className="block space-y-5">
      <EsqueletoEncabezado acciones={2} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-3 w-28" /><Hueso className="h-9 w-20" /><Hueso className="h-3 w-36 max-w-full" /></div>)}
      </div>
      <div className="flex flex-wrap gap-3"><Hueso className="h-11 w-full max-w-md rounded-xl" /><Hueso className="ml-auto h-11 w-40 rounded-xl" /><Hueso className="h-11 w-40 rounded-xl" /></div>
      <Hueso className="h-10 w-96 max-w-full rounded-xl" />
      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="hidden h-11 bg-background md:block" />
        <FilasInquilinosCargando />
      </section>
    </Cargando>
  );
}

// La cuenta corriente de un inquilino: volver, encabezado con iniciales y nombre, cifras, pestañas
// y los movimientos.
export function CuentaCargando() {
  return (
    <Cargando texto="Cargando la cuenta…" className="block space-y-6">
      <Hueso className="h-9 w-32 rounded-md" />
      <div className="flex flex-wrap items-center gap-4">
        <Hueso className="size-16 rounded-[18px]" />
        <div className="space-y-2.5"><Hueso className="h-8 w-64 max-w-full md:h-9" /><Hueso className="h-3.5 w-48" /></div>
        <div className="ml-auto flex gap-2"><Hueso className="h-11 w-36 rounded-xl" /><Hueso className="h-11 w-28 rounded-xl" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-3 w-24" /><Hueso className="h-8 w-28" /><Hueso className="h-3 w-32" /></div>)}
      </div>
      <Hueso className="h-10 w-80 max-w-full rounded-xl" />
      <div className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="h-11 bg-background" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid grid-cols-[100px_minmax(0,1fr)_120px] items-center gap-4 border-t border-gm-line px-5 py-3.5 md:grid-cols-[100px_minmax(0,1fr)_120px_130px_130px]">
            <Hueso className="h-3 w-16" /><div className="space-y-1.5"><Hueso className="h-3.5 w-48 max-w-full" /><Hueso className="h-2.5 w-28" /></div><Hueso className="h-3.5 w-20 justify-self-end" />
            <Hueso className="hidden h-3.5 w-20 justify-self-end md:block" /><Hueso className="hidden h-3.5 w-20 justify-self-end md:block" />
          </div>
        ))}
      </div>
    </Cargando>
  );
}

// El cuerpo de «Cobrar a …»: los cargos para elegir, el importe y los medios.
export function CobrarCargando() {
  return (
    <Cargando texto="Cargando la cuenta…" className="block space-y-4">
      <div className="flex items-baseline justify-between"><Hueso className="h-3.5 w-36" /><Hueso className="h-3 w-24" /></div>
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center gap-3 border-t border-border px-3.5 py-3 first:border-t-0"><Hueso className="size-[18px] rounded" /><div className="flex-1 space-y-1.5"><Hueso className="h-3.5 w-40" /><Hueso className="h-2.5 w-24" /></div><Hueso className="h-3.5 w-20" /></div>)}
      </div>
      <div className="space-y-2"><Hueso className="h-3 w-28" /><Hueso className="h-11 w-full rounded-md" /></div>
      <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, i) => <Hueso key={i} className="h-14 rounded-xl" />)}</div>
    </Cargando>
  );
}

// La cuenta en el mostrador: el saldo, las pestañas y la lista.
export function MostradorCargando() {
  return (
    <Cargando texto="Cargando cuenta…" className="block space-y-4">
      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-gm-surface-2/60 px-4 py-3"><Hueso className="h-3.5 w-12" /><Hueso className="h-7 w-28" /></div>
      <Hueso className="h-10 w-full rounded-xl" />
      <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"><div className="space-y-1.5"><Hueso className="h-3.5 w-36" /><Hueso className="h-2.5 w-24" /></div><Hueso className="h-3.5 w-20" /></div>)}</div>
    </Cargando>
  );
}

// Anulaciones: las tres cifras y la lista.
export function AnulacionesCargando() {
  return (
    <Cargando texto="Cargando anulaciones…" className="block space-y-3">
      <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, i) => <div key={i} className="space-y-2 rounded-xl border border-border bg-background px-3 py-2.5"><Hueso className="h-2.5 w-20" /><Hueso className="h-6 w-16" /></div>)}</div>
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"><div className="space-y-1.5"><Hueso className="h-3.5 w-44" /><Hueso className="h-2.5 w-28" /></div><Hueso className="h-6 w-20" /></div>)}
    </Cargando>
  );
}

// La vista previa de «Cargar abonos del mes»: el resumen y los abonos que se van a cargar.
export function AbonosCargando() {
  return (
    <Cargando texto="Revisando abonos…" className="block space-y-3">
      <div className="space-y-2 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.06] px-4 py-3"><Hueso className="h-4 w-64 max-w-full" /><Hueso className="h-3 w-48" /></div>
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center justify-between gap-3 px-1"><Hueso className="h-3.5 w-40" /><Hueso className="h-3.5 w-20" /></div>)}
    </Cargando>
  );
}
