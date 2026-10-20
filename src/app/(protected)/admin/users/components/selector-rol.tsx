'use client';

import { Check, MapPin } from 'lucide-react';
import { RolAvatar } from '@/components/rol-avatar';
import { cn } from '@/lib/utils';

type Rol = 'USER' | 'ADMIN';

const ROLES: { id: Rol; titulo: string; detalle: string }[] = [
  { id: 'USER', titulo: 'Operador', detalle: 'Registra entradas y salidas en su playa.' },
  { id: 'ADMIN', titulo: 'Administrador', detalle: 'Configura la empresa y ve todas sus playas.' },
];

const opcion = 'group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gm-line-strong bg-background/50 px-3.5 py-3 transition-colors hover:border-gm-yellow/50 has-[:checked]:border-gm-yellow has-[:checked]:bg-gm-yellow/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gm-yellow has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60';

// El mismo bloque en el alta y en la edición: dos tarjetas con el ícono de cada rol (el de la lista).
export function SelectorRol({ nombre, valor, onChange, disabled }: { nombre: string; valor: Rol; onChange: (rol: Rol) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium">Rol</legend>
      {ROLES.map((r) => (
        <label key={r.id} className={opcion}>
          <input type="radio" name={nombre} value={r.id} checked={valor === r.id} onChange={() => onChange(r.id)} className="sr-only" />
          <RolAvatar role={r.id} className="size-9 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{r.titulo}</span>
            <span className="block text-xs text-muted-foreground">{r.detalle}</span>
          </span>
          {valor === r.id && <Check className="size-4 shrink-0 text-gm-yellow" aria-hidden />}
        </label>
      ))}
    </fieldset>
  );
}

// Al pasar un administrador a operador: el operador entra a una sola playa.
export function SelectorPlaya({ nombre, playas, valor, onChange, disabled }: {
  nombre: string; playas: { id: string; nombre: string }[]; valor: string; onChange: (id: string) => void; disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium">Playa donde va a operar</legend>
      {playas.map((p) => (
        <label key={p.id} className={cn(opcion, 'min-h-12')}>
          <input type="radio" name={nombre} value={p.id} checked={valor === p.id} onChange={() => onChange(p.id)} className="sr-only" />
          <MapPin className="size-4 shrink-0 text-muted-foreground group-has-[:checked]:text-gm-yellow" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nombre}</span>
          {valor === p.id && <Check className="size-4 shrink-0 text-gm-yellow" aria-hidden />}
        </label>
      ))}
    </fieldset>
  );
}
