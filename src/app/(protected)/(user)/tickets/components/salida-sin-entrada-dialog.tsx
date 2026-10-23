'use client';

// Un auto que se va y no tiene entrada registrada. Antes, al escanearlo para cobrar, se abría la
// entrada con su patente: se confirmaba, el auto se iba y esa entrada quedaba abierta para siempre,
// sin cobro. Como en «Se fue antes», no se pide la hora exacta: se elige la tarifa que le
// corresponde (y, en la última, cuántas veces la que se repite). Se registra la entrada con esa
// antigüedad —la misma corrección que «Corregir entrada», que queda en la Actividad— y se abre el
// cobro de siempre, con todos los medios (efectivo, QR, alias, transferencia o combinado).
//
// Siempre se buscan las que están adentro con una patente igual o parecida (también si se llegó
// desde el escáner): antes de registrar hay que contestar, por cada una, si sigue en la playa o
// no. No se cobran desde acá. Las que no están y estaban mal cargadas, el administrador las puede
// eliminar en el mismo paso (sin cobros; el backend lo vuelve a validar).

import { useEffect, useState, useTransition } from 'react';
import { AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
} from '@/components/ui/action-dialog';
import { DataLoading } from '@/components/ui/data-loading';
import { PlateChip } from '@/components/plate-chip';
import { VehicleTypeButtons } from '@/components/vehicle-type-options';
import { formatImporte } from '@/components/pricing-breakdown';
import { toast } from '@/lib/toast';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import { tarifasSinEntradaAction } from '@/actions/tickets/salida-anterior.action';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TarifasSinEntrada } from '@/services/tickets.service';
import { formatEstadia } from '@/utils/estadia';
import { TarifasElegibles } from './tarifas-elegibles';

// La entrada queda unos minutos adentro de la tarifa elegida: justo en el borde, un minuto después
// el cobro ya caería en la siguiente.
const MARGEN_MINUTOS = 2;

// La entrada parecida que pudo estar mal cargada (la patente bien escrita es la buscada).
export type EntradaParecida = { id: string; patente: string };

export function SalidaSinEntradaDialog({ plate, parecida, onClose, onCobrar, onRegistrada }: {
  // Abierto mientras hay una patente.
  plate: string | null;
  parecida?: EntradaParecida | null;
  onClose: () => void;
  onCobrar: (registrationId: string) => void;
  onRegistrada?: () => void;
}) {
  const rol = useCurrentRole()?.toUpperCase();
  const esAdmin = rol === 'ADMIN' || rol === 'SUPER_ADMIN';
  const [vehiculo, setVehiculo] = useState('AUTO');
  const [vehiculoValido, setVehiculoValido] = useState(false);
  const [tarifas, setTarifas] = useState<TarifasSinEntrada | null>(null);
  const [cargando, setCargando] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [cada, setCada] = useState(0);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  // Las que están adentro con una patente igual o parecida. Antes de registrar hay que contestar,
  // por cada una, si sigue en la playa o no (`respuestas`); no se cobran desde acá. Las que no
  // están y estaban mal cargadas, el administrador las puede eliminar (`eliminar`).
  const [candidatas, setCandidatas] = useState<TicketRegistration[] | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, 'SIGUE' | 'NO_ESTA'>>({});
  const [eliminar, setEliminar] = useState<string[]>([]);

  useEffect(() => {
    if (!plate) return;
    setVehiculo('AUTO');
    setElegida(null);
    setCada(0);
    setRespuestas({});
    setEliminar([]);
    setError('');
    setCandidatas(null);
    let vigente = true;
    void searchActiveRegistrationsAction(plate)
      .then((r) => { if (vigente) setCandidatas(Array.isArray(r) ? r : []); })
      .catch(() => { if (vigente) setCandidatas([]); });
    return () => { vigente = false; };
  }, [plate]);

  // Las tarifas dependen del vehículo: al cambiarlo se vuelven a pedir y se elige de nuevo.
  useEffect(() => {
    if (!plate || !vehiculoValido) return;
    let vigente = true;
    setCargando(true);
    setTarifas(null);
    setElegida(null);
    setCada(0);
    void tarifasSinEntradaAction(vehiculo).then((r) => {
      if (!vigente) return;
      setCargando(false);
      if (r.error || !r.opciones) { setError(r.error ?? 'No se pudieron cargar las tarifas.'); return; }
      setError('');
      setTarifas({ opciones: r.opciones, repeticion: r.repeticion ?? null });
    });
    return () => { vigente = false; };
  }, [plate, vehiculo, vehiculoValido]);

  const opciones = tarifas?.opciones ?? [];
  const repeticion = tarifas?.repeticion ?? null;
  const ultima = opciones[opciones.length - 1];
  const elegidaOpcion = opciones.find((o) => String(o.minutos) === elegida) ?? null;
  const conCada = !!repeticion && !!elegidaOpcion && elegidaOpcion === ultima && cada > 0;
  const minutos = !elegidaOpcion ? null : conCada ? repeticion!.base + cada * repeticion!.unidadMinutos : elegidaOpcion.minutos;
  const precio = !elegidaOpcion ? null : conCada ? repeticion!.precios[cada - 1] : elegidaOpcion.precio;
  // La parecida que vino del cobro se suma si la búsqueda no la trajo (por ejemplo, ya no coincide).
  const parecidas = [
    ...(candidatas ?? []),
    ...(parecida && candidatas && !candidatas.some((c) => c.id === parecida.id) ? [{ id: parecida.id, licensePlateOriginal: parecida.patente, parecida: true } as TicketRegistration] : []),
  ];
  const hayParecidas = parecidas.length > 0;
  const patenteDe = (r: TicketRegistration) => r.licensePlateOriginal || 'Sin patente';
  const responder = (id: string, respuesta: 'SIGUE' | 'NO_ESTA') => {
    setRespuestas((actual) => ({ ...actual, [id]: respuesta }));
    // Si vuelve a estar en la playa, no se borra.
    if (respuesta === 'SIGUE') setEliminar((actual) => actual.filter((x) => x !== id));
  };
  const todasContestadas = parecidas.every((r) => respuestas[r.id]);
  const listo = !!plate && vehiculoValido && minutos !== null && !pending && candidatas !== null && todasContestadas;

  const confirmar = () => {
    if (!plate || minutos === null || !listo) return;
    const entrada = dayjs().subtract(Math.max(1, minutos - MARGEN_MINUTOS), 'minute').toISOString();
    startTransition(async () => {
      // Las entradas mal cargadas se eliminan primero. Si el backend no deja alguna (tiene
      // cobros), no se sigue: lo ya eliminado queda en la Actividad.
      for (const id of eliminar) {
        const r = parecidas.find((p) => p.id === id);
        if (!r || respuestas[id] !== 'NO_ESTA') continue;
        const borrada = await eliminarEstadiaAction(id);
        if (borrada.error) { setError(`${patenteDe(r)}: ${borrada.error}`); return; }
        toast.success(`Entrada de ${patenteDe(r)} eliminada.`);
      }
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
      // Si la entrada no se pudo poner (por ejemplo, la patente tuvo otra estadía en ese lapso), se
      // avisa y se abre el cobro igual: desde ahí se puede volver a corregir en los primeros minutos.
      if (corregida.error) toast.error(`${corregida.error} Revisá la entrada en el cobro.`);
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
            <p className="text-[13px] leading-relaxed text-[#D9D1C3]">Elegí la tarifa que le corresponde: se registra la entrada con ese tiempo y se cobra ahora, con cualquier medio. Queda anotado en la Actividad con tu usuario.</p>
          </div>

          {/* Antes de registrar un auto nuevo hay que revisar las parecidas que figuran adentro: por
              cada una, si sigue en la playa o no. No se cobran desde acá. */}
          {candidatas === null ? <DataLoading label="Buscando patentes parecidas…" /> : hayParecidas && (
            <section aria-labelledby="sin-entrada-parecidas" className="space-y-2.5 rounded-2xl border-[1.5px] border-[#F0A43A]/50 bg-[#F0A43A]/[0.08] p-3.5">
              <p id="sin-entrada-parecidas" className="text-[14px] font-semibold text-[#F5C26B]">
                {parecidas.length === 1 ? 'Hay una patente parecida en la playa' : `Hay ${parecidas.length} patentes parecidas en la playa`}
              </p>
              <p className="text-[12.5px] leading-snug text-[#D9D1C3]">
                Revisá si {parecidas.length === 1 ? 'sigue' : 'siguen'} en la playa antes de registrar este auto: puede ser una patente mal escrita o mal cargada.
              </p>
              <ul className="space-y-1.5">
                {parecidas.map((r) => {
                  const respuesta = respuestas[r.id];
                  return (
                    <li key={r.id} className="space-y-2 rounded-xl border border-gm-line-strong bg-gm-surface-2 p-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PlateChip plate={r.licensePlateOriginal || '—'} size="sm" />
                        <div role="radiogroup" aria-label={`¿${patenteDe(r)} sigue en la playa?`} className="ml-auto grid grid-cols-2 gap-1.5">
                          {([['SIGUE', 'Sigue en la playa'], ['NO_ESTA', 'No está']] as const).map(([valor, texto]) => (
                            <button key={valor} type="button" role="radio" aria-checked={respuesta === valor} disabled={pending} onClick={() => responder(r.id, valor)}
                              className={`min-h-10 rounded-lg border-[1.5px] px-2.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow ${
                                respuesta === valor ? 'border-gm-yellow bg-gm-yellow/[0.12] text-foreground' : 'border-gm-line-strong text-muted-foreground hover:text-foreground'}`}>
                              {texto}
                            </button>
                          ))}
                        </div>
                      </div>
                      {respuesta === 'NO_ESTA' && esAdmin && (
                        <label className="flex cursor-pointer items-start gap-2.5 px-0.5 text-[12.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gm-yellow">
                          <input type="checkbox" checked={eliminar.includes(r.id)} disabled={pending} className="mt-0.5 size-4 accent-[#F5C219]"
                            onChange={(e) => setEliminar((actual) => (e.target.checked ? [...actual, r.id] : actual.filter((x) => x !== r.id)))} />
                          <span>
                            <span className="font-semibold">Eliminar la entrada de <span className="gm-mono">{patenteDe(r)}</span></span>
                            <span className="block text-muted-foreground">Si se cargó mal. Solo si no tiene cobros.</span>
                          </span>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Vehículo</p>
            <VehicleTypeButtons value={vehiculo} onChange={setVehiculo} disabled={pending} onValidityChange={setVehiculoValido} />
          </section>

          <section aria-labelledby="sin-entrada-tarifa" className="space-y-2">
            <p id="sin-entrada-tarifa" className="text-[14px] font-semibold">¿Qué tarifa le corresponde?</p>
            {cargando ? <DataLoading label="Cargando tarifas…" /> : opciones.length ? (
              <TarifasElegibles
                id="sin-entrada-tarifa"
                disabled={pending}
                opciones={opciones.map((o) => ({ clave: String(o.minutos), etiqueta: o.etiqueta, detalle: `hasta ${formatEstadia(o.minutos)}`, precio: o.precio }))}
                elegida={elegida}
                onElegir={(clave) => { setElegida(clave); setCada(0); }}
                cada={repeticion ? {
                  etiqueta: repeticion.etiqueta, max: repeticion.precios.length, cantidad: cada, onCantidad: setCada,
                  precioCon: (n) => repeticion.precios[n - 1] ?? ultima?.precio ?? 0,
                } : null}
              />
            ) : tarifas && <p className="text-[13px] text-muted-foreground">Este vehículo no tiene tarifas cargadas.</p>}
          </section>

          {error &&<p role="alert" className="text-sm text-destructive">{error}</p>}
        </ActionDialogBody>
        <ActionDialogFooter>
          <ActionDialogPrimaryButton disabled={!listo} onClick={confirmar}
            detail={!todasContestadas ? 'Revisá las patentes parecidas' : precio !== null && minutos !== null ? `${formatImporte(precio)} · hasta ${formatEstadia(minutos)}` : 'Elegí la tarifa'}>
            {pending ? 'Registrando…' : 'Registrar y cobrar'}
          </ActionDialogPrimaryButton>
        </ActionDialogFooter>
      </ActionDialogContent>
    </ActionDialog>
  );
}
