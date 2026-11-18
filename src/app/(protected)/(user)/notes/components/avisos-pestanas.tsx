'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ListaAvisos } from '@/types/note.type';
import { useDeudasHabilitadas, useDeudores } from '@/hooks/use-deudores';
import { AvisosBody } from './avisos-body';
import { DeudasInquilinos } from './deudas-inquilinos';

type Pestana = 'avisos' | 'inquilinos';

// Avisos tiene una segunda pestaña, Inquilinos, con las deudas vencidas: solo para la
// administración y con la sección de inquilinos prendida. La pestaña queda en la dirección
// (?tab=inquilinos) para que «Deudas» del menú llegue directo.
export function AvisosPestanas({ inicial }: { inicial: ListaAvisos | null }) {
  const habilitadas = useDeudasHabilitadas();
  const deudores = useDeudores();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pestana: Pestana = habilitadas && params?.get('tab') === 'inquilinos' ? 'inquilinos' : 'avisos';
  if (!habilitadas) return <AvisosBody inicial={inicial} />;
  const elegir = (p: Pestana) => router.replace(p === 'inquilinos' ? `${pathname}?tab=inquilinos` : pathname, { scroll: false });
  const opciones: { id: Pestana; label: string; cantidad?: number; nuevas?: number }[] = [
    { id: 'avisos', label: 'Avisos' },
    { id: 'inquilinos', label: 'Inquilinos con deuda', cantidad: deudores?.cantidad, nuevas: deudores?.nuevos },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Qué ver" className="flex w-max max-w-full gap-1 rounded-full border border-gm-line-strong bg-gm-surface p-1">
        {opciones.map((o) => {
          const activa = pestana === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              id={`pestana-${o.id}`}
              aria-selected={activa}
              aria-controls={`panel-${o.id}`}
              onClick={() => elegir(o.id)}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                activa ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o.label}
              {o.cantidad != null && o.cantidad > 0 && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                  o.nuevas ? 'bg-[#C93630] text-white' : activa ? 'bg-background/15' : 'bg-gm-surface-3')}>
                  {o.cantidad}
                </span>
              )}
              {!!o.nuevas && <span className="sr-only"> ({o.nuevas} sin ver)</span>}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'inquilinos' ? <DeudasInquilinos /> : <AvisosBody inicial={inicial} />}
      </div>
    </div>
  );
}
