'use client';

// Eliminar una estadía que se cargó por error (patente equivocada, doble carga). Es del
// administrador y va discreta, al costado del cobro: un enlace apagado que pide confirmación en el
// lugar. Solo aparece sin cobros ni anticipos; el backend lo vuelve a validar (y rechaza si hay un
// QR o una transferencia esperando el pago) y lo deja en la Actividad.
//
// Sin startTransition a propósito, como CorregirEntrada: un error de red iría a la pantalla de
// error de la app.

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import type { CloseSummary } from '@/services/tickets.service';

export function EliminarEstadia({ summary, onEliminada }: { summary: CloseSummary; onEliminada: () => void }) {
  const rol = useCurrentRole()?.toUpperCase();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') return null;
  if (summary.totalCollectedSoFar > 0) return null;

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

  if (!confirmando)
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-1 text-[12.5px] text-muted-foreground/80 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
      >
        <Trash2 className="size-3.5" aria-hidden />
        ¿Se cargó por error? Eliminar estadía
      </button>
    );

  return (
    <div role="alertdialog" aria-label="Eliminar estadía" className="space-y-2.5 rounded-2xl border border-destructive/35 bg-destructive/[0.06] p-3.5">
      <p className="text-[13.5px] leading-snug">
        <span className="font-semibold">¿Eliminar la estadía de <span className="gm-mono">{quien}</span>?</span>{' '}
        <span className="text-muted-foreground">Usalo solo si se cargó por error: la entrada desaparece y no se cobra nada.</span>
      </p>
      {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={enviando}
          onClick={() => { setConfirmando(false); setError(''); }}
          className="h-10 rounded-xl px-3.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          No, volver
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void eliminar()}
          className="h-10 rounded-xl bg-destructive px-4 text-[13.5px] font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  );
}
