'use client';

// Las secciones de Caja en la misma página: Rubber Segment (ui/segmento) cambia de panel sin volver
// a cargar. Los dos paneles quedan montados (el oculto conserva lo que ya trajo) y la pestaña se
// anota en la URL (?tab=) para que recargar o un enlace como «Ver turnos e historial» abra la misma.

import { useState, type ReactNode } from 'react';
import { Segmento } from '@/components/ui/segmento';

export type SeccionCaja = 'turnos' | 'movimientos';

export function CajaSecciones({ inicial, turnos, movimientos }: {
  inicial: SeccionCaja;
  // Sin turnos activos no hay sección de turnos ni selector.
  turnos: ReactNode | null;
  movimientos: ReactNode;
}) {
  const [tab, setTab] = useState<SeccionCaja>(turnos ? inicial : 'movimientos');

  const cambiar = (valor: string) => {
    const siguiente = valor as SeccionCaja;
    setTab(siguiente);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', siguiente);
    window.history.replaceState(window.history.state, '', url);
  };

  return (
    <>
      {turnos && (
        <Segmento
          aria-label="Secciones de caja"
          size="lg"
          value={tab}
          onChange={cambiar}
          items={[
            { value: 'turnos', label: 'Turnos' },
            { value: 'movimientos', label: 'Ingresos y gastos' },
          ]}
        />
      )}
      {turnos && <div aria-label="Turnos" hidden={tab !== 'turnos'}>{turnos}</div>}
      <div aria-label="Ingresos y gastos" hidden={tab !== 'movimientos'}>{movimientos}</div>
    </>
  );
}
