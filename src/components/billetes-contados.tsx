'use client';

// En el historial, cómo se contó el arqueo final: los billetes de cada denominación. Si el operador
// volvió a contar después de ver lo esperado, también el primer conteo, para ver qué cambió. Los
// cierres anteriores al conteo por billetes no tienen desglose: se dice, no se inventa uno.

import { useState } from 'react';
import { Banknote, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Turno } from '@/types/turno.type';
import { DesgloseBilletes } from './conteo-billetes';
import { botonDetalle } from './cobros-efectivo-historial';
import { money } from './turno-ui';

export function BilletesContados({ turno }: { turno: Turno }) {
  const [abierto, setAbierto] = useState(false);
  const final = turno.conteoDesglose ?? turno.cashSession?.conteoDesglose ?? null;
  const primero = turno.primerConteoDesglose ?? turno.cashSession?.primerConteoDesglose ?? null;
  if (turno.efectivoContado == null) return null;
  if (!final)
    return turno.primerConteo != null && turno.primerConteo !== turno.efectivoContado
      ? <p className="basis-full text-xs text-muted-foreground">Primer conteo {money(turno.primerConteo)}; se corrigió a {money(turno.efectivoContado)} después de ver lo esperado. Cierre sin conteo por billetes.</p>
      : null;
  const corregido = !!primero && JSON.stringify(primero) !== JSON.stringify(final);
  // Qué denominaciones cambiaron al volver a contar (también las que quedaron en cero en uno de los dos).
  const cantidad = (lista: typeof final, d: number) => lista?.find((f) => f.denominacion === d)?.cantidad ?? 0;
  const cambiaron = corregido ? [...new Set([...primero!, ...final].map((f) => f.denominacion))].filter((d) => cantidad(primero, d) !== cantidad(final, d)) : [];
  if (!abierto)
    return <button type="button" onClick={() => setAbierto(true)} aria-expanded={false} className={botonDetalle}>
      <Banknote className="size-3.5" aria-hidden />Ver billetes contados{corregido && ' · se volvió a contar'}
    </button>;
  return (
    <section aria-label="Billetes contados en el arqueo" className="basis-full overflow-hidden rounded-2xl border border-gm-line">
      <header className="flex items-center justify-between gap-3 border-b border-gm-line bg-gm-surface-2/60 px-3.5 py-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold"><Banknote className="size-4 text-gm-yellow" aria-hidden />Billetes contados</h3>
        <button type="button" onClick={() => setAbierto(false)} aria-expanded className={cn(botonDetalle, 'min-h-8 px-2.5')}>
          <ChevronUp className="size-3.5" aria-hidden />Ocultar
        </button>
      </header>
      <div className={cn('grid gap-4 px-3.5 py-3', corregido && 'sm:grid-cols-2')}>
        {corregido && <DesgloseBilletes titulo="Primer conteo, antes de ver lo esperado" desglose={primero!} resaltar={cambiaron} />}
        <DesgloseBilletes titulo={corregido ? 'Conteo final' : 'Conteo'} desglose={final} resaltar={cambiaron} />
      </div>
      <p className="border-t border-gm-line bg-gm-surface-2/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Todo el efectivo del cajón al cerrar, fondo incluido, antes de separar sueldo y recaudación. El total lo calculó el sistema con estas cantidades.
      </p>
    </section>
  );
}
