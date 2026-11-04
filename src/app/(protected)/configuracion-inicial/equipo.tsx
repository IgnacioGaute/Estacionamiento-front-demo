'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ScanLine, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateUserDialog } from '../admin/users/components/create-user-dialog';

export type Miembro = { id: string; nombre: string; usuario: string; administrador: boolean };

const LLEGADA = [0.16, 1, 0.3, 1] as const;
const ROLES = [
  { icono: ScanLine, titulo: 'Operador', texto: 'Registra entradas y salidas, cobra y abre su turno de caja.' },
  { icono: ShieldCheck, titulo: 'Administrador', texto: 'Además configura tarifas, usuarios y los datos de la playa.' },
];
const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';

// El paso Usuarios: quiénes entran a la playa y con qué rol. Crear una cuenta usa el mismo diálogo
// que Usuarios; al guardarlo la página se recarga y la lista llega actualizada.
export function EquipoConfiguracion({ miembros, yoId }: { miembros: Miembro[]; yoId?: string }) {
  const quieto = useReducedMotion();
  const sinOperadores = !miembros.some((m) => !m.administrador);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="flex gap-3.5 rounded-2xl border border-gm-line bg-gm-surface-2/60 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gm-yellow"><Icono className="size-5" aria-hidden /></span>
            <div className="min-w-0">
              <p className="font-semibold">{titulo}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Tu equipo <span className="text-gm-yellow">· {miembros.length} {miembros.length === 1 ? 'cuenta' : 'cuentas'}</span>
          </h2>
          {!sinOperadores && <CreateUserDialog trigger={<Button size="sm" className="gap-1.5"><UserPlus className="size-4" aria-hidden />Nuevo usuario</Button>} />}
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {miembros.map((m) => (
              <motion.li
                key={m.id}
                layout={quieto ? false : 'position'}
                initial={quieto ? false : { y: 14, filter: 'blur(6px)', clipPath: 'inset(0% 0% 100% 0% round 16px)' }}
                animate={{ y: 0, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0% round 16px)', transition: { duration: 0.55, ease: LLEGADA }, transitionEnd: { filter: 'none', clipPath: 'none' } }}
                className="flex items-center gap-3.5 rounded-2xl border border-gm-line-strong bg-gm-surface-2 px-4 py-3"
              >
                <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', m.administrador ? 'bg-gm-yellow text-gm-ink' : 'bg-white/[0.08] text-foreground')}>{iniciales(m.nombre)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.nombre}{m.id === yoId && <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">(vos)</span>}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">@{m.usuario}</p>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', m.administrador ? 'border-gm-yellow/40 text-gm-yellow' : 'border-gm-line-strong text-muted-foreground')}>{m.administrador ? 'Administrador' : 'Operador'}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {sinOperadores && (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-gm-line-strong p-5 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gm-yellow/10 text-gm-yellow"><UserPlus className="size-6" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Todavía no sumaste operadores</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Creá una cuenta para cada persona que atiende la playa: cada cobro queda a su nombre.</p>
            </div>
            <CreateUserDialog trigger={<Button className="gap-1.5"><UserPlus className="size-4" aria-hidden />Crear un operador</Button>} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">Las cuentas nuevas quedan asignadas a esta playa. Podés sumar más después desde Usuarios.</p>
      </div>
    </div>
  );
}
