'use client';

// Un auto que se va y no tiene entrada registrada. Antes, al escanearlo para cobrar, se abría la
// entrada con su patente: se confirmaba, el auto se iba y esa entrada quedaba abierta para siempre,
// sin cobro. Acá se registra la entrada con la hora real en que llegó (la misma corrección que
// «Corregir entrada», que queda en la Actividad) y se abre el cobro de siempre, con todos los medios.

import { useEffect, useState, useTransition } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
} from '@/components/ui/action-dialog';
import { PlateChip } from '@/components/plate-chip';
import { VehicleTypeButtons } from '@/components/vehicle-type-options';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import { entradaDesdeHora } from './corregir-entrada';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const ATAJOS = [1, 2, 3, 4];

export function SalidaSinEntradaDialog({ plate, onClose, onCobrar, onRegistrada }: {
  // Abierto mientras hay una patente.
  plate: string | null;
  onClose: () => void;
  onCobrar: (registrationId: string) => void;
  onRegistrada?: () => void;
}) {
  const [hora, setHora] = useState('');
  const [vehiculo, setVehiculo] = useState('AUTO');
  const [vehiculoValido, setVehiculoValido] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!plate) return;
    setHora('');
    setVehiculo('AUTO');
    setError('');
  }, [plate]);

  const ahora = dayjs().tz(TZ);
  const minutos = hora && /^\d{2}:\d{2}$/.test(hora) ? ahora.diff(dayjs(entradaDesdeHora(hora)), 'minute') : null;
  const listo = !!plate && vehiculoValido && minutos !== null && minutos > 0 && minutos <= 24 * 60;

  const confirmar = () => {
    if (!plate || !listo) return;
    const entrada = entradaDesdeHora(hora);
    if (!entrada) { setError('Indicá la hora en que entró.'); return; }
    startTransition(async () => {
      const creada = await createRegistrationByPlateAction({ licensePlate: plate, vehicleType: vehiculo, noPlate: false });
      if (!creada || creada.error) {
        const err = creada?.error as { code?: string; message?: string; existingRegistrationId?: string } | string | undefined;
        // Ya estaba adentro (se registró mientras tanto): se cobra esa.
        if (typeof err === 'object' && err?.code === 'DUPLICATE_ACTIVE_PLATE' && err.existingRegistrationId) {
          onClose();
          onCobrar(err.existingRegistrationId);
          return;
        }
        setError((typeof err === 'string' ? err : err?.message) ?? 'No se pudo registrar la entrada.');
        return;
      }
      const id = creada.registrationId!;
      const corregida = await corregirEntradaAction(id, entrada);
      onRegistrada?.();
      onClose();
      // Si la hora no se pudo poner (por ejemplo, la patente tuvo otra estadía en ese lapso), se
      // avisa y se abre el cobro igual: desde ahí se puede volver a corregir en los primeros minutos.
      if (corregida.error) toast.error(`${corregida.error} Revisá la hora de entrada en el cobro.`);
      onCobrar(id);
    });
  };

  return (
    <ActionDialog open={!!plate} onOpenChange={(abierto) => { if (!abierto && !pending) onClose(); }}>
      <ActionDialogContent className="sm:max-w-[520px]">
        <ActionDialogHeader title="Cobrar sin entrada registrada" description="El auto se va y nunca se registró su entrada" />
        <ActionDialogBody>
          <div role="alert" className="space-y-3 rounded-[18px] border-[1.5px] border-gm-orange/55 bg-gm-orange/10 p-4">
            <p className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-orange/20 text-[#F0714A]"><AlertTriangle className="size-5" aria-hidden /></span>
              <span className="flex min-w-0 items-center gap-2.5"><PlateChip plate={plate ?? '—'} size="sm" /><span className="text-[14px] font-semibold text-[#F0714A]">no está adentro</span></span>
            </p>
            <p className="text-[13px] leading-relaxed text-[#D9D1C3]">Se registra la entrada con la hora en que llegó y se cobra ahora. Queda anotado en la Actividad con tu usuario.</p>
          </div>

          <section aria-labelledby="sin-entrada-hora" className="space-y-2">
            <label id="sin-entrada-hora" htmlFor="sin-entrada-input" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden />¿A qué hora entró?
            </label>
            <input
              id="sin-entrada-input"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              disabled={pending}
              className="gm-mono h-12 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 text-lg font-bold outline-none transition-colors focus:border-gm-yellow"
            />
            <div className="flex flex-wrap gap-1.5">
              {ATAJOS.map((h) => {
                const valor = ahora.subtract(h, 'hour').format('HH:mm');
                return (
                  <button key={h} type="button" disabled={pending} onClick={() => setHora(valor)}
                    className={cn('min-h-9 rounded-full border px-3 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow', hora === valor ? 'border-gm-yellow bg-gm-yellow/10 text-gm-yellow' : 'border-gm-line-strong text-muted-foreground hover:text-foreground')}>
                    Hace {h} h
                  </button>
                );
              })}
            </div>
            {minutos !== null && (minutos <= 0 || minutos > 24 * 60) && <p className="text-xs text-[#F0714A]">La hora tiene que ser anterior a ahora y de las últimas 24 horas.</p>}
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Vehículo</p>
            <VehicleTypeButtons value={vehiculo} onChange={setVehiculo} disabled={pending} onValidityChange={setVehiculoValido} />
          </section>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </ActionDialogBody>
        <ActionDialogFooter>
          <ActionDialogPrimaryButton disabled={pending || !listo} onClick={confirmar} detail={minutos && minutos > 0 ? `Estuvo ${Math.floor(minutos / 60)} h ${minutos % 60} min` : undefined}>
            {pending ? 'Registrando…' : 'Registrar y cobrar'}
          </ActionDialogPrimaryButton>
        </ActionDialogFooter>
      </ActionDialogContent>
    </ActionDialog>
  );
}
