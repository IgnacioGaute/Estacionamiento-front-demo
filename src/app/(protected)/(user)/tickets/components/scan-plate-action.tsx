'use client';
import { useEffect, useState } from 'react';
import { CarFront, ChevronRight, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import type { PlateStatus } from '@/types/plate-status.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { PlateCameraScanButton } from './plate-camera-scan-button';

// `dock`: el botón redondo de la barra de abajo del inicio. Ahí no hay lugar para mensajes debajo
// del botón: la consulta se ve en el propio botón y los errores como aviso.
export function ScanPlateAction({ onEntry, onHourlyExit, onDailyExit, onBusyChange, variant = 'action' }: {
  onEntry: (plate: string) => void;
  onHourlyExit: (id: string) => void;
  onDailyExit: (registration: TicketRegistrationForDay) => void;
  onBusyChange?: (busy: boolean) => void;
  variant?: 'action' | 'dock';
}) {
  const [cameraBusy, setCameraBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPlate, setLastPlate] = useState('');
  const [choices, setChoices] = useState<PlateStatus | null>(null);
  useEffect(() => { onBusyChange?.(cameraBusy || loading || !!choices); }, [cameraBusy, loading, choices, onBusyChange]);

  const resolve = async (plate: string) => {
    setLastPlate(plate);
    setError('');
    setLoading(true);
    try {
      const result = await getPlateStatusAction(plate);
      if (result.error || !result.data) { setError(result.error || 'No se pudo consultar el vehículo.'); return; }
      const data = result.data;
      const count = data.hourly.length + data.daily.length;
      if (!count) onEntry(data.plate);
      else if (count > 1) setChoices(data);
      else if (data.hourly.length) onHourlyExit(data.hourly[0].id);
      else onDailyExit(data.daily[0]);
    } catch {
      setError('No se pudo consultar el vehículo. Intentá nuevamente.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (variant === 'dock' && error) toast.error(`${error} Volvé a escanear ${lastPlate}.`);
  }, [variant, error, lastPlate]);

  const elegir = <Dialog open={!!choices} onOpenChange={open => { if (!open) setChoices(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Elegí la estadía de {choices?.plate}</DialogTitle><DialogDescription>Hay más de un registro activo con esta patente. Seleccioná el que corresponde a la salida.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {choices?.hourly.map(registration => <button type="button" key={registration.id}
            onClick={() => { setChoices(null); onHourlyExit(registration.id); }}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-secondary p-3 text-left hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            <CarFront className="size-5 shrink-0 text-gm-yellow" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{registration.licensePlateOriginal || registration.vehiclePlateCustomer || choices.plate}</span><span className="block text-xs text-muted-foreground">Por hora · {registration.entryDay} · {registration.entryTime}</span></span><ChevronRight className="size-4" />
          </button>)}
          {choices?.daily.map(registration => <button type="button" key={registration.id}
            onClick={() => { setChoices(null); onDailyExit(registration); }}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-secondary p-3 text-left hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            <CarFront className="size-5 shrink-0 text-gm-yellow" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{registration.vehiclePlateCustomer}</span><span className="block text-xs text-muted-foreground">Día, semana o mes · {String(registration.dateNow || '')}</span></span><ChevronRight className="size-4" />
          </button>)}
        </div>
      </DialogContent>
    </Dialog>;

  if (variant === 'dock') return <div className="flex justify-center">
    <PlateCameraScanButton variant="dock" busy={loading} disabled={loading} onRecognized={resolve} notifyRecognition={false} onBusyChange={setCameraBusy} />
    {elegir}
  </div>;

  return <div>
    <PlateCameraScanButton variant="action" disabled={loading} onRecognized={resolve} notifyRecognition={false} onBusyChange={setCameraBusy} />
    {loading && <p role="status" className="mt-2 text-xs text-muted-foreground">Consultando si {lastPlate} está en la playa…</p>}
    {error && <div role="alert" className="mt-2 rounded-xl border border-gm-orange/30 bg-gm-orange/5 p-3">
      <p className="text-xs text-gm-orange">{error}</p>
      <Button type="button" size="sm" variant="ghost" onClick={() => resolve(lastPlate)} disabled={loading} className="mt-1 h-9 px-0 text-xs"><RotateCcw className="mr-1.5 size-3.5" />Reintentar consulta de {lastPlate}</Button>
    </div>}
    {elegir}
  </div>;
}
