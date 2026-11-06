'use client';
import { useEffect, useState } from 'react';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';

// ¿El usuario tiene su turno abierto? Sirve para avisar antes de cobrar en efectivo: con turnos
// activos el backend rechaza el efectivo sin turno propio, y el operador se enteraba recién al
// confirmar. Devuelve null mientras carga o si la consulta falla: en ese caso no se avisa nada y
// el backend sigue siendo quien decide. Se actualiza con el mismo evento que usa TurnoBar.
export function useTurnoPropio(habilitado: boolean): boolean | null {
  const [abierto, setAbierto] = useState<boolean | null>(null);
  useEffect(() => {
    if (!habilitado) { setAbierto(null); return; }
    let vigente = true;
    const cargar = () => {
      getCashContextAction()
        .then((r) => { if (vigente) setAbierto(r.context ? !!r.context.active : null); })
        .catch(() => { if (vigente) setAbierto(null); });
    };
    cargar();
    window.addEventListener('parking-shift-changed', cargar);
    return () => { vigente = false; window.removeEventListener('parking-shift-changed', cargar); };
  }, [habilitado]);
  return abierto;
}
