'use client';

import { useState } from 'react';
import { ShieldQuestion } from 'lucide-react';
import { getConciliacionAction } from '@/actions/turnos/conciliacion.action';
import { CobroSinVerificar } from '@/types/turno.type';
import { CobrosSinVerificar } from './conciliacion-caja';
import { botonDetalle } from './cobros-efectivo-historial';

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

  // Un botón con borde, como «Ver cobros en efectivo» al lado; lo que trae ocupa todo el ancho.
  if (cobros === undefined)
    return <button type="button" onClick={() => void ver()} disabled={cargando} className={botonDetalle}>
      <ShieldQuestion className="size-3.5" aria-hidden />{cargando ? 'Buscando…' : 'Ver cobros digitales sin verificar'}
    </button>;
  if (cobros === null) return <p role="alert" className="basis-full text-xs text-muted-foreground">No se pudieron traer los cobros de este turno.</p>;
  if (!cobros.length) return <p className="basis-full text-xs text-muted-foreground">No hubo transferencias cargadas a mano ni alias elegidos entre varias.</p>;
  return <div className="basis-full"><CobrosSinVerificar cobros={cobros} /></div>;
}
