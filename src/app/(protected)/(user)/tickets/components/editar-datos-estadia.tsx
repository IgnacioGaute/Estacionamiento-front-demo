'use client';

// Corregir la patente o el tipo de vehículo de la estadía que se está cobrando: se cargó Auto y era
// Camioneta, o la patente con un carácter mal. Con otro tipo el cobro pasa a la tarifa de ese tipo y
// el importe se actualiza en el momento. Queda en la Actividad con el usuario.

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { VehicleTypeButtons } from '@/components/vehicle-type-options';
import { cn } from '@/lib/utils';
import { corregirDatosEstadiaAction } from '@/actions/tickets/corregir-datos.action';
import type { CloseSummary } from '@/services/tickets.service';
import { isBarcodeOrigin } from '@/utils/ticket-registration.utils';
import { sanitizePlateInput } from '@/utils/plate.utils';

export function EditarDatosEstadia({ summary, onCorregido }: { summary: CloseSummary; onCorregido: (summary: CloseSummary) => void }) {
  const r = summary.registration;
  const tarjeta = isBarcodeOrigin(r);
  const tipoActual = r.vehicleType ?? r.ticket?.vehicleType ?? 'AUTO';
  const [abierto, setAbierto] = useState(false);
  const [patente, setPatente] = useState('');
  const [tipo, setTipo] = useState(tipoActual);
  const [tipoValido, setTipoValido] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const abrir = () => {
    setPatente(r.licensePlateOriginal ?? '');
    setTipo(tipoActual);
    setError('');
    setAbierto(true);
  };
  const cambioPatente = !tarjeta && sanitizePlateInput(patente) !== sanitizePlateInput(r.licensePlateOriginal ?? '') && !!sanitizePlateInput(patente);
  const cambioTipo = tipo !== tipoActual;
  // El tipo solo tiene que ser válido si se cambia: corregir la patente no espera a que carguen los tipos.
  const listo = (cambioPatente || cambioTipo) && (!cambioTipo || tipoValido) && !enviando;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;
    setEnviando(true);
    setError('');
    try {
      const result = await corregirDatosEstadiaAction(r.id, { ...(cambioPatente ? { licensePlate: patente.trim() } : {}), ...(cambioTipo ? { vehicleType: tipo } : {}) });
      if (result.error || !result.summary) { setError(result.error || 'No se pudo corregir la estadía.'); return; }
      setAbierto(false);
      onCorregido(result.summary);
    } catch {
      setError('No se pudo corregir la estadía. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" onClick={abrir}
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
        <Pencil className="size-3.5" aria-hidden />{tarjeta ? 'Editar tipo de vehículo' : 'Editar patente o tipo'}
      </button>
    );
  }
  return (
    <form onSubmit={guardar} className="mt-3 space-y-3 rounded-2xl border border-gm-line-strong bg-card p-3">
      {!tarjeta && (
        <div className="space-y-1.5">
          <label htmlFor="editar-patente" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Patente</label>
          <input id="editar-patente" value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} disabled={enviando} autoComplete="off"
            className="gm-mono h-11 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3 text-base font-bold uppercase outline-none transition-colors focus:border-gm-yellow" />
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tipo de vehículo</p>
        <VehicleTypeButtons value={tipo} onChange={setTipo} disabled={enviando} onValidityChange={setTipoValido} />
        {cambioTipo && <p className="text-xs text-muted-foreground">Se cobra con la tarifa de este tipo, desde que entró.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} disabled={enviando}
          className="min-h-11 rounded-xl border border-gm-line-strong text-[13px] font-semibold transition-colors hover:bg-gm-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          Cancelar
        </button>
        <button type="submit" disabled={!listo}
          className={cn('min-h-11 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
            listo ? 'bg-gm-yellow text-gm-ink hover:bg-gm-yellow-deep' : 'bg-gm-surface-3 text-muted-foreground')}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
