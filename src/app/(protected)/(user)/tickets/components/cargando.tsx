import { Cargando, Hueso } from '@/components/esqueletos';

// Esqueletos de Entradas y salidas: la forma de cada parte mientras carga.

// Cobrar salida, al entrar desde un vehículo: a la izquierda la estadía (chapa, tiempos), a la
// derecha lo que se cobra y los medios. Misma grilla que el resumen real.
export function EstadiaCargando() {
  return (
    <Cargando texto="Cargando la estadía…" className="contents">
      <div className="space-y-4 rounded-2xl border border-gm-line bg-gm-surface-2/40 p-4">
        <Hueso className="h-10 w-36 rounded-md" />
        <div className="space-y-2"><Hueso className="h-3 w-40" /><Hueso className="h-3 w-32" /><Hueso className="h-3 w-24" /></div>
        <Hueso className="h-9 w-28" />
      </div>
      <div className="space-y-4 max-md:mt-4">
        <div className="space-y-2 rounded-2xl border border-gm-line p-4"><Hueso className="h-3 w-20" /><Hueso className="h-10 w-40" /></div>
        <Hueso className="h-3.5 w-36" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Hueso key={i} className="h-14 rounded-xl" />)}</div>
        <div className="flex gap-2"><Hueso className="h-10 w-28 rounded-md" /><Hueso className="h-10 w-28 rounded-md" /></div>
      </div>
    </Cargando>
  );
}

// Los comprobantes del día: tarjetas con el ícono, la patente, el estado y los dos botones.
export function ComprobantesCargando() {
  return (
    <Cargando texto="Cargando comprobantes…" className="grid gap-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2.5 rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-start gap-2.5"><Hueso className="size-8 rounded-lg" /><div className="flex-1 space-y-1.5"><Hueso className="h-3.5 w-24" /><Hueso className="h-2.5 w-32" /></div></div>
          <div className="flex justify-between"><Hueso className="h-2.5 w-24" /><Hueso className="h-2.5 w-10" /></div>
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-2"><Hueso className="h-10 rounded-lg" /><Hueso className="h-10 rounded-lg" /></div>
        </div>
      ))}
    </Cargando>
  );
}

// Las tarifas para elegir (TarifasElegibles): una fila por opción con nombre, detalle y precio.
export function TarifasCargando({ opciones = 3 }: { opciones?: number }) {
  return (
    <Cargando texto="Cargando tarifas…" className="grid gap-2">
      {Array.from({ length: opciones }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3">
          <Hueso className="size-4 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5"><Hueso className="h-3.5 w-32" /><Hueso className="h-2.5 w-20" /></div>
          <Hueso className="h-4 w-16" />
        </div>
      ))}
    </Cargando>
  );
}

// «Mi turno» mientras carga la caja: la tarjeta amarilla del turno y su resumen.
export function TurnoCargando() {
  return (
    <Cargando texto="Cargando caja…" className="block space-y-4">
      <div className="space-y-4 rounded-[22px] bg-gm-yellow/15 p-5">
        <div className="flex justify-between"><Hueso className="h-7 w-40 rounded-full bg-gm-yellow/20" /><Hueso className="h-3 w-24 bg-gm-yellow/20" /></div>
        <Hueso className="h-5 w-32 bg-gm-yellow/20" />
        <Hueso className="h-12 w-44 bg-gm-yellow/20" />
      </div>
      <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-2 rounded-xl border border-gm-line p-3"><Hueso className="h-2.5 w-20" /><Hueso className="h-5 w-16" /></div>)}</div>
    </Cargando>
  );
}
