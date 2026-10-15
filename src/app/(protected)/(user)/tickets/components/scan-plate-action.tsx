'use client';
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CarFront, ChevronRight, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { getPlateStatusAction } from '@/actions/tickets/get-plate-status.action';
import type { PlateStatus } from '@/types/plate-status.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { PlateCameraScanButton } from './plate-camera-scan-button';

// `dock`: el botón redondo de la barra de abajo del inicio. Ahí no hay lugar para mensajes debajo
// del botón: la consulta se ve en el propio botón y los errores como aviso.
export function ScanPlateAction({ onEntry, onHourlyExit, onDailyExit, onSalidaSinEntrada, onBusyChange, variant = 'action' }: {
  // `parecidasRevisadas`: ya se ofrecieron las patentes parecidas y el operador dijo que es otro auto.
  onEntry: (plate: string, parecidasRevisadas?: boolean) => void;
  onHourlyExit: (id: string) => void;
  onDailyExit: (registration: TicketRegistrationForDay) => void;
  // Una patente que no está adentro: antes de abrir la entrada se pregunta si entra o se va. Si se
  // va, no tiene entrada registrada y se cobra igual (SalidaSinEntradaDialog).
  onSalidaSinEntrada?: (plate: string) => void;
  onBusyChange?: (busy: boolean) => void;
  variant?: 'action' | 'dock';
}) {
  const [cameraBusy, setCameraBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPlate, setLastPlate] = useState('');
  const [choices, setChoices] = useState<PlateStatus | null>(null);
  const [nueva, setNueva] = useState<{ plate: string; revisadas: boolean } | null>(null);
  useEffect(() => { onBusyChange?.(cameraBusy || loading || !!choices || !!nueva); }, [cameraBusy, loading, choices, nueva, onBusyChange]);

  // Abrir la entrada directamente dejaba abiertas para siempre las de autos que se estaban yendo sin
  // entrada registrada: se confirmaba la entrada, el auto salía y nadie la cerraba.
  const sinCoincidencia = (plate: string, revisadas: boolean) => {
    if (onSalidaSinEntrada) setNueva({ plate, revisadas });
    else if (revisadas) onEntry(plate, true);
    else onEntry(plate);
  };

  const resolve = async (plate: string) => {
    setLastPlate(plate);
    setError('');
    setLoading(true);
    try {
      const result = await getPlateStatusAction(plate);
      if (result.error || !result.data) { setError(result.error || 'No se pudo consultar el vehículo.'); return; }
      const data = result.data;
      const count = data.hourly.length + data.daily.length;
      // Sin coincidencia exacta pero con una parecida adentro: puede ser el mismo auto mal leído.
      // Se pregunta antes de abrir una entrada nueva, que dejaría la original abierta para siempre.
      if (!count && data.similares?.length) setChoices(data);
      else if (!count) sinCoincidencia(data.plate, false);
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

  const parecidas = !!choices && !choices.hourly.length && !choices.daily.length ? choices.similares ?? [] : [];
  const elegir = <Dialog open={!!choices} onOpenChange={open => { if (!open) setChoices(null); }}>
      <DialogContent className="max-w-md">
        {parecidas.length ? <>
          <DialogHeader><DialogTitle>¿Es alguno de estos?</DialogTitle><DialogDescription>{choices?.plate} no está adentro, pero hay {parecidas.length === 1 ? 'una patente parecida' : 'patentes parecidas'}. Puede ser el mismo auto con un carácter mal leído: si se está yendo, cobrá esa estadía.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {parecidas.map(registration => <button type="button" key={registration.id}
              onClick={() => { setChoices(null); onHourlyExit(registration.id); }}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-gm-yellow/40 bg-gm-yellow/[0.06] p-3 text-left hover:border-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
              <CarFront className="size-5 shrink-0 text-gm-yellow" /><span className="min-w-0 flex-1"><span className="gm-mono block text-sm font-bold">{registration.licensePlateOriginal || choices?.plate}</span><span className="block text-xs text-muted-foreground">Entró {registration.entryDay} · {registration.entryTime?.slice(0, 5)} · Cobrar esta</span></span><ChevronRight className="size-4" />
            </button>)}
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => { const plate = choices!.plate; setChoices(null); sinCoincidencia(plate, true); }}>
              No, es otro: registrar la entrada de {choices?.plate}
            </Button>
          </div>
        </> : <>
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
        </>}
      </DialogContent>
    </Dialog>;

  const entraOSale = <Dialog open={!!nueva} onOpenChange={open => { if (!open) setNueva(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{nueva?.plate} no está adentro</DialogTitle><DialogDescription>¿El auto está entrando o se está yendo?</DialogDescription></DialogHeader>
        <div className="grid gap-2">
          <button type="button" onClick={() => { const n = nueva!; setNueva(null); if (n.revisadas) onEntry(n.plate, true); else onEntry(n.plate); }}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-gm-yellow/50 bg-gm-yellow/[0.08] p-3 text-left hover:border-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            <ArrowDownLeft className="size-5 shrink-0 text-gm-yellow" aria-hidden /><span className="min-w-0 flex-1"><span className="block font-semibold">Está entrando</span><span className="block text-xs text-muted-foreground">Registrar la entrada</span></span><ChevronRight className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => { const n = nueva!; setNueva(null); onSalidaSinEntrada?.(n.plate); }}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-secondary p-3 text-left hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            <ArrowUpRight className="size-5 shrink-0 text-[#F0714A]" aria-hidden /><span className="min-w-0 flex-1"><span className="block font-semibold">Se está yendo</span><span className="block text-xs text-muted-foreground">No tiene entrada registrada: cobrarlo igual</span></span><ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </DialogContent>
    </Dialog>;

  if (variant === 'dock') return <div className="flex justify-center">
    <PlateCameraScanButton variant="dock" busy={loading} disabled={loading} onRecognized={resolve} notifyRecognition={false} onBusyChange={setCameraBusy} />
    {elegir}
    {entraOSale}
  </div>;

  return <div>
    <PlateCameraScanButton variant="action" disabled={loading} onRecognized={resolve} notifyRecognition={false} onBusyChange={setCameraBusy} />
    {loading && <p role="status" className="mt-2 text-xs text-muted-foreground">Consultando si {lastPlate} está en la playa…</p>}
    {error && <div role="alert" className="mt-2 rounded-xl border border-gm-orange/30 bg-gm-orange/5 p-3">
      <p className="text-xs text-gm-orange">{error}</p>
      <Button type="button" size="sm" variant="ghost" onClick={() => resolve(lastPlate)} disabled={loading} className="mt-1 h-9 px-0 text-xs"><RotateCcw className="mr-1.5 size-3.5" />Reintentar consulta de {lastPlate}</Button>
    </div>}
    {elegir}
    {entraOSale}
  </div>;
}
