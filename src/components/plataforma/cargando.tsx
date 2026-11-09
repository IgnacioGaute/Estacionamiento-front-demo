import { Cargando, Hueso } from '@/components/esqueletos';

// Esqueletos de las pantallas de plataforma del super admin: el título con su bajada y acciones,
// las tarjetas de cifras (de 150 px, como las reales), los paneles y la tabla.

function Titulo({ acciones = 2 }: { acciones?: number }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2.5"><Hueso className="h-7 w-48" /><Hueso className="h-3.5 w-80 max-w-full" /></div>
      <div className="flex gap-2">{Array.from({ length: acciones }, (_, i) => <Hueso key={i} className="h-11 w-32 rounded-xl sm:h-10" />)}</div>
    </div>
  );
}

function Cifras({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-gm-line bg-card p-5">
          <Hueso className="h-3 w-28" /><Hueso className="h-9 w-20" /><Hueso className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

function FilasTabla({ filas = 6 }: { filas?: number }) {
  return (
    <>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-gm-line px-5 py-3.5">
          <Hueso className="size-9 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5"><Hueso className="h-3.5 w-44 max-w-full" /><Hueso className="h-2.5 w-28" /></div>
          <Hueso className="h-6 w-20 rounded-full max-md:hidden" /><Hueso className="h-3.5 w-16 max-md:hidden" /><Hueso className="h-3.5 w-14" />
        </div>
      ))}
    </>
  );
}

// Empresas y Planes y cobros: título, cifras, dos paneles y la tabla de cuentas.
export function PanelPlataformaCargando({ texto }: { texto: string }) {
  return (
    <Cargando texto={texto} className="block space-y-5">
      <Titulo />
      <Cifras />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-4 w-40" /><Hueso className="h-3 w-full" /><Hueso className="h-3 w-5/6" /><Hueso className="h-3 w-2/3" /></div>)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-gm-line bg-card">
        <div className="flex items-center justify-between gap-3 px-5 py-4"><Hueso className="h-4 w-32" /><Hueso className="h-10 w-64 rounded-xl max-md:hidden" /></div>
        <FilasTabla />
      </div>
    </Cargando>
  );
}

// Solo las filas de la tabla de cuentas, cuando el marco ya está.
export function FilasPlataformaCargando({ texto }: { texto: string }) {
  return <Cargando texto={texto}><FilasTabla filas={4} /></Cargando>;
}

// Métricas: título, cifras y la grilla de gráficos.
export function MetricasCargando() {
  return (
    <Cargando texto="Cargando métricas…" className="block space-y-5">
      <Titulo acciones={1} />
      <Cifras />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="space-y-4 rounded-2xl border border-gm-line bg-card p-5"><Hueso className="h-4 w-36" /><Hueso className="h-40 w-full rounded-xl" /></div>)}
      </div>
    </Cargando>
  );
}

// La ficha de una empresa: nombre con su estado, pestañas, cifras y las playas.
export function EmpresaCargando() {
  return (
    <Cargando texto="Cargando la empresa…" className="block space-y-5">
      <Hueso className="h-9 w-28 rounded-md" />
      <div className="flex flex-wrap items-center gap-3"><Hueso className="size-12 rounded-xl" /><div className="space-y-2"><Hueso className="h-7 w-56" /><Hueso className="h-3.5 w-40" /></div><Hueso className="ml-auto h-7 w-24 rounded-full" /></div>
      <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <Hueso key={i} className="h-10 w-24 rounded-lg" />)}</div>
      <Cifras />
      <div className="overflow-hidden rounded-2xl border border-gm-line bg-card"><div className="px-5 py-4"><Hueso className="h-4 w-24" /></div><FilasTabla filas={3} /></div>
    </Cargando>
  );
}

// El plan de una empresa: el estado de la cuenta, el ciclo y las facturas.
export function PlanEmpresaCargando() {
  return (
    <Cargando texto="Cargando el plan…" className="block space-y-5">
      <div className="space-y-4 rounded-2xl border border-gm-line bg-card p-6"><div className="flex items-center gap-3"><Hueso className="h-7 w-28 rounded-full" /><Hueso className="h-4 w-48" /></div><Hueso className="h-9 w-40" /><Hueso className="h-2 w-full rounded-full" /></div>
      <div className="flex justify-between gap-2 rounded-2xl border border-gm-line bg-card p-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex flex-col items-center gap-2"><Hueso className="size-3 rounded-full" /><Hueso className="h-2.5 w-14" /></div>)}</div>
      <div className="overflow-hidden rounded-2xl border border-gm-line bg-card"><div className="px-5 py-4"><Hueso className="h-4 w-24" /></div><FilasTabla filas={3} /></div>
    </Cargando>
  );
}

// El diálogo de modalidad de una playa: el estado actual y las dos opciones.
export function ModalidadCargando() {
  return (
    <Cargando texto="Revisando la playa…" className="block space-y-3">
      <Hueso className="h-14 w-full rounded-xl" />
      <div className="grid gap-2 sm:grid-cols-2"><Hueso className="h-24 rounded-xl" /><Hueso className="h-24 rounded-xl" /></div>
    </Cargando>
  );
}
