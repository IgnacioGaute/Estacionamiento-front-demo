import { UserRound, UserRoundCog, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// En vez de iniciales, una personita que dice el rol de un vistazo: el administrador en amarillo y
// con engranaje (el mismo amarillo de su etiqueta «Admin»), el operador en naranja. Difieren en
// color, en claridad y en el dibujo, así no dependen solo del tono.
export function estiloRol(role?: string | null): { fondo: string; Icono: LucideIcon; etiqueta: string } {
  if (role === 'ADMIN') return { fondo: 'bg-gm-yellow text-gm-ink', Icono: UserRoundCog, etiqueta: 'Administrador' };
  return { fondo: 'bg-gm-orange text-white', Icono: UserRound, etiqueta: 'Operador' };
}

export function RolAvatar({ role, className }: { role?: string | null; className?: string }) {
  const { fondo, Icono } = estiloRol(role);
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center', fondo, className)}>
      <Icono className="size-[56%]" strokeWidth={2.2} />
    </span>
  );
}
