'use client';

// El anticipo: se elige cuánto se va a quedar y se cobra ahora, con cualquiera de los medios del
// cobro de salida. Ya no existe «cobrar al salir»: guardar una duración sin cobrar nada no servía.
// Con QR o alias el importe lo calcula el servidor y, al acreditarse, queda como anticipo sin
// registrar la salida. Si el auto se queda más de lo pagado, la diferencia se cobra al salir.

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import LatticeLoader from '@/components/ui/lattice-loader';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
} from '@/components/ui/action-dialog';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatImporte } from '@/components/pricing-breakdown';
import { addAdvancePaymentAction } from '@/actions/tickets/add-advance-payment.action';
import { previewPlannedStayAction } from '@/actions/tickets/preview-price.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { CobroMercadoPago } from '@/types/mercadopago.type';
import type { CobroAlias } from '@/types/verificacion-alias.type';
import { formatMinutesLabel } from '@/utils/ticket-price-bracket.utils';
import { PaymentMethodChoices, type MedioCobro } from './payment-method-choices';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';
import { CobroAliasPanel } from './cobro-alias';

type DurationChoice = { id: string; label: string; minutes: number };

const ACCION: Record<MedioCobro, (importe: string) => { texto: string; detalle: string }> = {
  CASH: (importe) => ({ texto: `Cobrar ${importe}`, detalle: 'en efectivo' }),
  TRANSFER: (importe) => ({ texto: `Cobrar ${importe}`, detalle: 'por transferencia ya verificada' }),
  QR: (importe) => ({ texto: 'Mostrar el QR', detalle: importe }),
  ALIAS: (importe) => ({ texto: 'Esperar la transferencia', detalle: `${importe} al alias` }),
};

export function AdvancePaymentDialog({
  registrationId, codeBar, vehicleType, existingRegistration, priceBrackets, open, onOpenChange, onSuccess,
}: {
  registrationId: string | null;
  codeBar?: string;
  vehicleType?: string;
  existingRegistration: TicketRegistration | null;
  priceBrackets: TicketPriceBracket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [medio, setMedio] = useState<MedioCobro | null>(null);
  const [preview, setPreview] = useState<{ price: number; ticketDayType: 'DAY' | 'NIGHT' | 'MIXED' } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastName, setLastName] = useState('');
  const [verApellido, setVerApellido] = useState(false);
  const [aliasDisponible, setAliasDisponible] = useState(false);
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);

  const choices = useMemo<DurationChoice[]>(() => {
    const brackets = (existingRegistration?.pricingSnapshot?.brackets ?? priceBrackets)
      .filter((row) => row.vehicleType === vehicleType && row.uptoMinutes !== null)
      .sort((a, b) => a.uptoMinutes! - b.uptoMinutes!);
    const byDuration = new Map<number, DurationChoice>();
    for (const row of brackets) {
      const minutes = row.uptoMinutes!;
      const duplicate = brackets.some((other) => other.id !== row.id && other.uptoMinutes === minutes);
      if (!byDuration.has(minutes)) byDuration.set(minutes, { id: row.id, minutes, label: duplicate ? formatMinutesLabel(minutes) : row.label });
    }
    if (!byDuration.size) {
      const charging = existingRegistration?.pricingSnapshot?.schedule.pricingOptions?.charging;
      if (charging?.enabled) {
        for (const minutes of [...new Set([charging.unitMinutes, charging.unitMinutes * 2, 1440])].filter((value) => value > 0).sort((a, b) => a - b)) {
          byDuration.set(minutes, { id: `unit-${minutes}`, minutes, label: formatMinutesLabel(minutes) });
        }
      }
    }
    return [...byDuration.values()];
  }, [existingRegistration?.pricingSnapshot, priceBrackets, vehicleType]);

  const selectedChoice = choices.find((choice) => choice.minutes === selectedMinutes);
  const collected = existingRegistration?.advancePaidAmount ?? 0;
  const dueNow = preview ? Math.max(0, preview.price - collected) : null;
  const exceedsTariff = preview !== null && collected > preview.price;
  const cobrando = !!cobroQr || !!cobroAlias;

  useEffect(() => {
    if (!open) return;
    const savedMinutes = existingRegistration?.expectedUptoMinutes;
    setSelectedMinutes(choices.find((choice) => choice.minutes === savedMinutes)?.minutes ?? null);
    setMedio(null);
    setLastName(existingRegistration?.lastNameCustomer ?? '');
    setVerApellido(!!existingRegistration?.lastNameCustomer);
    setCobroQr(null);
    setCobroAlias(null);
    void disponibilidadAliasAction().then((r) => setAliasDisponible(!!r.datos?.disponible));
    // Se precarga una sola vez por apertura; cambiar de opción no debe reiniciar la elección.
  }, [open, existingRegistration?.id]);

  useEffect(() => {
    if (!open || !registrationId || selectedMinutes === null) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    previewPlannedStayAction(registrationId, selectedMinutes).then((result) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (result.error || result.price === undefined || !result.ticketDayType) setPreviewError(result.error ?? 'No se pudo calcular esta tarifa.');
      else setPreview({ price: result.price, ticketDayType: result.ticketDayType });
    });
    return () => { cancelled = true; };
  }, [open, registrationId, selectedMinutes]);

  const terminar = (mensaje: string) => {
    toast.success(mensaje);
    onOpenChange(false);
    onSuccess?.();
  };

  // El apellido viaja con el anticipo en efectivo o transferencia; con QR o alias se guarda antes
  // de pedir el pago (sin cobrar nada), porque la acreditación llega después y por otro camino.
  const guardarApellido = async () => {
    if (!registrationId || lastName.trim() === (existingRegistration?.lastNameCustomer ?? '')) return true;
    const r = await addAdvancePaymentAction(registrationId, { lastNameCustomer: lastName.trim() });
    if (!r || r.error) {
      toast.error((typeof r?.error === 'string' ? r.error : r?.error?.message) ?? 'No se pudo guardar el apellido.');
      return false;
    }
    return true;
  };

  const confirmar = () => {
    if (!registrationId || !selectedChoice || !preview || exceedsTariff) return;
    const anticipo = { anticipoMinutos: selectedChoice.minutes, anticipoEtiqueta: selectedChoice.label };
    startTransition(async () => {
      if (dueNow === 0 || medio === 'CASH' || medio === 'TRANSFER') {
        const data = await addAdvancePaymentAction(registrationId, {
          lastNameCustomer: lastName.trim(),
          expectedBracketLabel: selectedChoice.label,
          expectedUptoMinutes: selectedChoice.minutes,
          chargeFullPlannedStay: true,
          metodo: dueNow ? medio as 'CASH' | 'TRANSFER' : undefined,
        });
        if (!data || data.error) {
          toast.error((typeof data?.error === 'string' ? data.error : data?.error?.message) ?? 'No se pudo cobrar el anticipo.');
          return;
        }
        terminar(dueNow ? `Anticipo de ${formatImporte(dueNow)} cobrado.` : 'Duración guardada: ya estaba pagada.');
        return;
      }
      if (!(await guardarApellido())) return;
      if (medio === 'QR') {
        const r = await crearCobroMercadoPagoAction(registrationId, 'HORA', anticipo);
        if (r.error || !r.cobro) toast.error(r.error ?? 'No se pudo generar el QR.');
        else setCobroQr(r.cobro);
      } else if (medio === 'ALIAS') {
        const r = await iniciarCobroAliasAction(registrationId, 'HORA', anticipo);
        if (r.error || !r.datos) toast.error(r.error ?? 'No se pudo empezar a esperar la transferencia.');
        else if (r.datos.estado === 'CONFIRMADO') terminar('Anticipo cobrado por transferencia al alias.');
        else setCobroAlias(r.datos);
      }
    });
  };

  const importe = dueNow !== null ? formatImporte(dueNow) : '';
  const accion = dueNow === 0 ? { texto: 'Guardar duración', detalle: 'Ya está pagada' } : medio ? ACCION[medio](importe) : null;
  const listo = !!selectedChoice && !!preview && !exceedsTariff && (dueNow === 0 || !!medio);
  const horario = preview?.ticketDayType === 'NIGHT' ? 'De noche' : preview?.ticketDayType === 'DAY' ? 'De día' : preview?.ticketDayType === 'MIXED' ? 'Día y noche' : null;

  return (
    <ActionDialog open={open} onOpenChange={onOpenChange}>
      <ActionDialogContent className="sm:max-w-[560px]">
        <ActionDialogHeader title="Cobrar anticipo" description={`Elegí cuánto se queda y cobralo ahora${codeBar ? ` · Ticket ${codeBar}` : ''}`} />
        <ActionDialogBody>
          {cobroQr ? (
            <CobroQrMercadoPago
              cobro={cobroQr}
              onAcreditado={() => terminar('Anticipo cobrado con QR.')}
              onCancelar={() => setCobroQr(null)}
            />
          ) : cobroAlias ? (
            <CobroAliasPanel
              key={cobroAlias.id}
              cobro={cobroAlias}
              onTerminado={(cobro) => (cobro.estado === 'CONFIRMADO' ? terminar('Anticipo cobrado por transferencia al alias.') : terminar('El anticipo se cobró por otro medio.'))}
              onCancelado={() => setCobroAlias(null)}
            />
          ) : (
            <>
              <section aria-labelledby="anticipo-duracion" className="space-y-2">
                <h3 id="anticipo-duracion" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">¿Cuánto se queda?</h3>
                {choices.length ? (
                  <div role="group" aria-label="Duración" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        disabled={isPending}
                        aria-pressed={selectedMinutes === choice.minutes}
                        onClick={() => setSelectedMinutes(choice.minutes)}
                        className={cn(
                          'min-h-12 rounded-xl border-[1.5px] px-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                          selectedMinutes === choice.minutes ? 'border-gm-yellow bg-gm-yellow/[0.12] text-foreground' : 'border-gm-line-strong bg-gm-surface-2 text-[#D9D1C3] hover:border-gm-yellow/40',
                        )}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay duraciones configuradas para este vehículo.</p>
                )}
              </section>

              {selectedChoice && (
                <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-2xl border border-gm-line-strong bg-gm-surface-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">Hasta {selectedChoice.label}{horario ? ` · ${horario}` : ''}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collected > 0 ? `Ya cobrado ${formatImporte(collected)} · falta ${dueNow !== null ? formatImporte(dueNow) : '—'}` : 'Si se queda más, la diferencia se cobra al salir'}
                    </p>
                  </div>
                  <p className="gm-display shrink-0 text-[26px] font-bold leading-none text-gm-yellow">
                    {previewLoading ? <LatticeLoader compact label="Calculando…" showTimer={false} cellSize={4} gap={1} /> : dueNow !== null ? formatImporte(dueNow) : '—'}
                  </p>
                </div>
              )}
              {previewError && <p className="text-sm text-red-400" role="alert">{previewError}</p>}
              {exceedsTariff && <p className="text-sm text-gm-yellow">Lo ya cobrado supera esta tarifa. Elegí una duración mayor; la devolución se gestiona al salir.</p>}

              {selectedChoice && preview && !exceedsTariff && dueNow! > 0 && (
                <section aria-labelledby="anticipo-medio" className="space-y-2">
                  <h3 id="anticipo-medio" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">¿Cómo paga?</h3>
                  <PaymentMethodChoices value={medio} onChange={setMedio} disabled={isPending} aliasDisponible={aliasDisponible} />
                </section>
              )}

              {verApellido ? (
                <div className="space-y-1.5">
                  <label htmlFor="anticipo-apellido" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Apellido <span className="font-normal normal-case tracking-normal">(opcional)</span></label>
                  <input
                    id="anticipo-apellido"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isPending}
                    placeholder="Apellido"
                    className="h-11 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 text-base outline-none transition-colors focus:border-gm-yellow"
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setVerApellido(true)} className="inline-flex min-h-11 items-center gap-1.5 self-start text-[13px] font-semibold text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
                  <Plus className="size-4" aria-hidden />Agregar apellido
                </button>
              )}
            </>
          )}
        </ActionDialogBody>
        {!cobrando && (
          <ActionDialogFooter>
            <ActionDialogPrimaryButton disabled={isPending || !listo} onClick={confirmar} detail={accion?.detalle}>
              {isPending ? 'Procesando…' : accion?.texto ?? (selectedChoice ? 'Elegí cómo paga' : 'Elegí la duración')}
            </ActionDialogPrimaryButton>
          </ActionDialogFooter>
        )}
      </ActionDialogContent>
    </ActionDialog>
  );
}
