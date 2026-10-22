'use client';

// Eliminar una estadía que se cargó por error (patente equivocada, doble carga). Es del
// administrador: un Hold Button al lado de «Corregir» (BotonMantener). Se mantiene apretado y listo,
// sin otro paso. Solo aparece sin cobros ni anticipos; el backend lo vuelve a validar (y rechaza si
// hay un QR o una transferencia esperando el pago) y lo deja en la Actividad.
//
// Sin startTransition a propósito, como CorregirEntrada: un error de red iría a la pantalla de
// error de la app.

import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { BotonMantener } from '@/components/ui/boton-mantener';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import type { ResumenSalida } from '@/services/tickets.service';

export function EliminarEstadia({ summary, onEliminada }: { summary: Pick<ResumenSalida, 'registration'> & { totalCollectedSoFar?: number }; onEliminada: () => void }) {
  const rol = useCurrentRole()?.toUpperCase();
  const [enviando, setEnviando] = useState(false);

  if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') return null;
  if ((summary.totalCollectedSoFar ?? 0) > 0) return null;

  const r = summary.registration;
  const quien = r.licensePlateOriginal || r.ticket?.codeBar || r.lastNameCustomer || 'este vehículo';

  const eliminar = async () => {
    setEnviando(true);
    try {
      const resultado = await eliminarEstadiaAction(r.id);
      if (resultado.error) { toast.error(resultado.error); return; }
      onEliminada();
    } catch {
      toast.error('No se pudo eliminar la estadía. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // El texto dice qué hacer, corto para que entre en la fila de «Corregir»; la patente va solo para
  // lectores de pantalla y en el title.
  return (
    <span title={`Mantené apretado para eliminar la estadía de ${quien}`} className="inline-flex shrink-0">
      <BotonMantener
        size="sm"
        holdTime={1200}
        disabled={enviando}
        icono={<Trash2 className="size-3.5" aria-hidden />}
        hecho={<span className="inline-flex items-center gap-1.5"><Check className="size-3.5" aria-hidden />Borrada</span>}
        onHold={() => void eliminar()}
        className="text-[12.5px]"
      >
        Mantené para borrar<span className="sr-only"> la estadía de {quien}</span>
      </BotonMantener>
    </span>
  );
}
