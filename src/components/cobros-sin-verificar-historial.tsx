'use client';

import { useState } from 'react';
import { getConciliacionAction } from '@/actions/turnos/conciliacion.action';
import { CobroSinVerificar } from '@/types/turno.type';
import { CobrosSinVerificar } from './conciliacion-caja';

// En el historial, los cobros digitales sin verificar de un turno cerrado. Se piden al tocar: la
// lista de turnos no carga la conciliación de cada uno.
export function CobrosSinVerificarHistorial({ turnoId }: { turnoId: string }) {
  const [cobros, setCobros] = useState<CobroSinVerificar[] | null | undefined>(undefined);
  const [cargando, setCargando] = useState(false);

  async function ver() {
    setCargando(true);
    try {
      const detalle = await getConciliacionAction(turnoId);
      setCobros(detalle ? detalle.sinVerificar ?? [] : null);
    } catch {
      setCobros(null);
    } finally {
      setCargando(false);
    }
  }

  if (cobros === undefined)
    return <button type="button" onClick={() => void ver()} disabled={cargando}
      className="min-h-11 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">
      {cargando ? 'Buscando…' : 'Ver cobros digitales sin verificar'}
    </button>;
  if (cobros === null) return <p role="alert" className="text-xs text-muted-foreground">No se pudieron traer los cobros de este turno.</p>;
  if (!cobros.length) return <p className="text-xs text-muted-foreground">No hubo transferencias cargadas a mano ni alias elegidos entre varias.</p>;
  return <CobrosSinVerificar cobros={cobros} />;
}
