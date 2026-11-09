import { Cargando, Hueso } from '@/components/esqueletos';
import { CajasCargando } from '../../components/caja-actions';
import { TurnosCargando } from '../../components/turnos-historial-panel';

// Caja › Turnos mientras carga: el aviso de tu turno, las cajas abiertas y el historial, con la
// misma forma que cuando llegan los datos.
export default function Loading() {
  return (
    <Cargando texto="Cargando turnos…" className="block space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-gm-yellow/25 bg-gm-yellow/[0.05] p-5 sm:p-6">
        <div className="flex items-start gap-4"><Hueso className="size-12 rounded-2xl" /><div className="space-y-2"><Hueso className="h-5 w-64 max-w-full" /><Hueso className="h-3.5 w-80 max-w-full" /></div></div>
        <Hueso className="h-11 w-36 rounded-xl" />
      </div>
      <section className="space-y-5">
        <div className="space-y-2"><Hueso className="h-6 w-56" /><Hueso className="h-3.5 w-96 max-w-full" /></div>
        <CajasCargando />
      </section>
      <section className="space-y-4">
        <div className="space-y-2"><Hueso className="h-6 w-44" /><Hueso className="h-3.5 w-64" /></div>
        <div className="flex flex-wrap gap-2"><Hueso className="h-10 w-64 rounded-xl" /><Hueso className="h-10 w-60 rounded-xl" /></div>
        <TurnosCargando />
      </section>
    </Cargando>
  );
}
