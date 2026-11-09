import { Cargando, EsqueletoSeccion, Hueso } from '@/components/esqueletos';

// Esqueletos de las opciones de Configuración (el título de la sección y la fila de páginas ya
// están en el layout): el título de la opción y sus tarjetas.

// Turnos de caja: los cuatro pasos (activar, modo, cajas, sueldo), cada uno con su título,
// la etiqueta de estado y su contenido.
export function ConfigTurnosCargando() {
  return (
    <Cargando texto="Cargando turnos de caja…" className="block space-y-5">
      <EsqueletoSeccion />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-4 rounded-[22px] border border-gm-line bg-gm-surface p-5">
          <div className="flex items-center justify-between gap-3"><Hueso className="h-6 w-52" /><Hueso className="h-6 w-20 rounded-full" /></div>
          <Hueso className="h-3 w-80 max-w-full" />
          <div className="flex items-center gap-3 rounded-2xl border border-gm-line p-4"><Hueso className="size-5 rounded" /><div className="flex-1 space-y-2"><Hueso className="h-4 w-44" /><Hueso className="h-3 w-56 max-w-full" /></div><Hueso className="h-6 w-11 rounded-full" /></div>
        </div>
      ))}
    </Cargando>
  );
}

// Tipos de vehículo: la grilla de tarjetas con ícono, nombre e interruptor.
export function ConfigVehiculosCargando() {
  return (
    <Cargando texto="Cargando tipos de vehículo…" className="block space-y-5">
      <EsqueletoSeccion />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-4"><div className="flex items-center gap-3"><Hueso className="size-10 rounded-xl" /><Hueso className="h-4 w-28" /><Hueso className="ml-auto h-6 w-11 rounded-full" /></div><Hueso className="h-11 w-full rounded-md sm:h-10" /></div>)}
      </div>
    </Cargando>
  );
}

// Comprobantes: las opciones de entrega, una por tarjeta.
export function ConfigComprobantesCargando() {
  return (
    <Cargando texto="Cargando comprobantes…" className="block space-y-5">
      <EsqueletoSeccion />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="size-10 rounded-xl" /><Hueso className="h-4 w-32" /><Hueso className="h-3 w-full" /><Hueso className="h-3 w-2/3" /></div>)}
      </div>
      <Hueso className="h-11 w-40 rounded-md sm:h-9" />
    </Cargando>
  );
}

// Para opciones sin esqueleto propio: el título y dos tarjetas.
export function ConfigCargando() {
  return (
    <Cargando texto="Cargando…" className="block space-y-5">
      <EsqueletoSeccion />
      {[0, 1].map((i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-5 w-48" /><Hueso className="h-3 w-full" /><Hueso className="h-3 w-2/3" /></div>)}
    </Cargando>
  );
}
