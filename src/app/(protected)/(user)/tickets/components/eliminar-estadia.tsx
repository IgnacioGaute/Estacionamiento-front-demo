'use client';

// Eliminar una estadía que se cargó por error (patente equivocada, doble carga). Es del
// administrador: un ícono al lado de «Corregir» que pide confirmación en el
// lugar. Solo aparece sin cobros ni anticipos; el backend lo vuelve a validar (y rechaza si hay un
// QR o una transferencia esperando el pago) y lo deja en la Actividad.
//
// Sin startTransition a propósito, como CorregirEntrada: un error de red iría a la pantalla de
// error de la app.

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import type { ResumenSalida } from '@/services/tickets.service';

export function EliminarEstadia({ summary, onEliminada }: { summary: Pick<ResumenSalida, 'registration'> & { totalCollectedSoFar?: number }; onEliminada: () => void }) {
  const rol = useCurrentRole()?.toUpperCase();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') return null;
  if ((summary.totalCollectedSoFar ?? 0) > 0) return null;

  const r = summary.registration;
  const quien = r.licensePlateOriginal || r.ticket?.codeBar || r.lastNameCustomer || 'este vehículo';

  const eliminar = async () => {
    setEnviando(true);
    setError('');
    try {
      const resultado = await eliminarEstadiaAction(r.id);
      if (resultado.error) { setError(resultado.error); return; }
      onEliminada();
    } catch {
      setError('No se pudo eliminar la estadía. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // Solo el ícono: es la acción menos frecuente y no tiene que pesar como el cobro. El nombre
  // («Eliminar estadía») lo lleva el aria-label y el title; el área táctil es de 44 px.
  if (!confirmando)
    return (
      <button
        type="button"
        aria-label="Eliminar estadía"
        title="Eliminar estadía"
        onClick={() => setConfirmando(true)}
        className="group inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none"
      >
        <span className="grid size-8 place-items-center rounded-full border border-destructive/30 text-destructive transition-colors group-hover:bg-destructive/10 group-focus-visible:ring-2 group-focus-visible:ring-destructive/60">
          <Trash2 className="size-3.5" aria-hidden />
        </span>
      </button>
    );

  // data-abierto: ocupa la fila del resumen; el tipo y «Corregir» se esconden hasta volver.
  return (
    <div data-abierto role="alertdialog" aria-label="Eliminar estadía" className="w-full space-y-2.5 rounded-2xl border border-destructive/35 bg-destructive/[0.06] p-3.5">
      <p className="text-[13.5px] leading-snug">
        <span className="font-semibold">¿Eliminar la estadía de <span className="gm-mono">{quien}</span>?</span>{' '}
        <span className="text-muted-foreground">Usalo solo si se cargó por error: la entrada desaparece y no se cobra nada.</span>
      </p>
      {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={enviando}
          onClick={() => { setConfirmando(false); setError(''); }}
          className="h-11 rounded-xl border border-gm-line-strong text-[13.5px] font-semibold transition-colors hover:bg-gm-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50"
        >
          No, volver
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void eliminar()}
          className="h-11 rounded-xl bg-destructive text-[13.5px] font-bold text-destructive-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
        >
          {enviando ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  );
}
