'use client';

import { useEffect, useState, useTransition } from 'react';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Landmark, ReceiptText } from 'lucide-react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { PlateChip } from '@/components/plate-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { updateTicketRegistrationForDayStatusAction } from '@/actions/tickets/update-ticket-registration-for-day-status.action';
import { PaymentMethodChoices, MedioCobro } from './payment-method-choices';
import { CobroQrMercadoPago, PagoQrRecibido } from './cobro-qr-mercadopago';
import { CobroAliasPanel, PagoRecibido } from './cobro-alias';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroAlias, DisponibilidadAlias } from '@/types/verificacion-alias.type';
import { cobroAliasDeEstadiaAction, disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

const metodoLabel: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', MERCADOPAGO: 'MercadoPago' };

const ticketTimeTypeLabel: Record<string, string> = {
  DIA: 'Día/s',
  SEMANA: 'Semana/s',
  MES: 'Mes/es',
  SEMANA_Y_DIA: 'Semana/s y día/s',
  MES_Y_DIA: 'Mes/es y día/s',
};

function formatDate(date: string | Date | null) {
  if (!date) return '—';
  const value = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

// Fecha estimada de vencimiento: fecha de alta + la duración comprada. Cada tipo usa SOLO los
// campos que le corresponden — mezclar semanas/días de un tipo que no los usa (quedan pegados
// en el form como valor por defecto) da una fecha incorrecta.
function estimatedDueDate(registration: TicketRegistrationForDay) {
  if (!registration.dateNow) return null;
  const start = new Date(registration.dateNow);
  const t = registration.ticketTimeType;

  if (t === 'MES' || t === 'MES_Y_DIA') {
    start.setMonth(start.getMonth() + (registration.months ?? 0));
    if (t === 'MES_Y_DIA') {
      start.setDate(start.getDate() + (registration.days ?? 0));
    }
    return start;
  }

  const totalDays =
    t === 'SEMANA'
      ? (registration.weeks ?? 0) * 7
      : t === 'SEMANA_Y_DIA'
        ? (registration.weeks ?? 0) * 7 + (registration.days ?? 0)
        : registration.days ?? 0; // DIA
  start.setDate(start.getDate() + totalDays);
  return start;
}

interface ActiveDayTicketDialogProps {
  deliveryEnabled?: boolean;
  registration: TicketRegistrationForDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActiveDayTicketDialog({ registration, open, onOpenChange, deliveryEnabled = false }: ActiveDayTicketDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [medio, setMedio] = useState<MedioCobro | null>(null);
  const [alias, setAlias] = useState<DisponibilidadAlias | null>(null);
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);
  // Transferencia o QR que dejó el abono pagado y retirado: confirmación que se cierra sola.
  const [pagoConSalida, setPagoConSalida] = useState<{ medio: 'ALIAS'; cobro: CobroAlias } | { medio: 'QR'; cobro: CobroMercadoPago } | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptKind, setReceiptKind] = useState<'ENTRY' | 'EXIT'>('EXIT');
  const router = useRouter();
  const escritorio = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    let vigente = true;
    setMedio(null); setAlias(null); setCobroQr(null); setCobroAlias(null); setPagoConSalida(null);
    if (open && registration && !registration.paid && !registration.retired) {
      void disponibilidadAliasAction().then(r => { if (vigente) setAlias(r.datos ?? null); });
      void cobroAliasDeEstadiaAction(registration.id, 'ABONO').then(r => {
        if (!vigente || !r.datos) return;
        if (['ESPERANDO', 'REVISION'].includes(r.datos.estado)) setCobroAlias(r.datos);
        else if (r.datos.estado === 'CONFIRMADO' && r.datos.salidaRegistrada) setPagoConSalida({ medio: 'ALIAS', cobro: r.datos });
      });
    }
    return () => { vigente = false; };
  }, [open, registration?.id]);

  const pagado = !!registration?.paid || cobroQr?.estado === 'ACREDITADO' || !!pagoConSalida;
  const esperando = cobroQr?.estado === 'PENDIENTE' || !!cobroAlias;
  const terminar = () => {
    if (!registration) return;
    toast.success('Salida registrada exitosamente');
    if (deliveryEnabled) setReceiptId(registration.id);
    setReceiptKind('EXIT');
    onOpenChange(false);
    router.refresh();
  };
  const terminadoAlias = (cobro: CobroAlias) => {
    setCobroAlias(null);
    if (cobro.estado === 'CONFIRMADO' && cobro.salidaRegistrada) setPagoConSalida({ medio: 'ALIAS', cobro });
    else if (cobro.estado === 'PAGADO_OTRO_MEDIO') { onOpenChange(false); router.refresh(); }
  };
  // El QR pagado ya dejó el abono pagado y retirado; si no figura así, queda el tilde de pagado y
  // la salida se registra con el botón, como antes.
  const acreditadoQr = (cobro: CobroMercadoPago) => {
    if (cobro.salidaRegistrada) { setCobroQr(null); setPagoConSalida({ medio: 'QR', cobro }); }
    else setCobroQr(cobro);
  };

  const dueDate = registration ? estimatedDueDate(registration) : null;
  const overdueDays = dueDate
    ? Math.floor((new Date().setHours(0, 0, 0, 0) - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isOverdue = !registration?.retired && overdueDays > 0;

  const duration =
    registration?.ticketTimeType === 'SEMANA_Y_DIA'
      ? `${registration.weeks ?? 0} semana/s y ${registration.days ?? 0} día/s`
      : registration?.ticketTimeType === 'MES_Y_DIA'
        ? `${registration.months ?? 0} mes/es y ${registration.days ?? 0} día/s`
        : registration?.ticketTimeType === 'SEMANA'
          ? `${registration.weeks ?? 0} semana/s`
          : registration?.ticketTimeType === 'MES'
            ? `${registration.months ?? 0} mes/es`
            : `${registration?.days ?? 0} día/s`;

  const handleRegisterExit = () => {
    if (!registration) return;
    if (!pagado && !medio) return;
    startTransition(async () => {
      if (!pagado && medio === 'QR') {
        const r = await crearCobroMercadoPagoAction(registration.id, 'ABONO');
        if (r.error || !r.cobro) toast.error(r.error ?? 'No se pudo generar el QR.');
        else { setMedio(null); setCobroQr(r.cobro); }
      } else if (!pagado && medio === 'ALIAS') {
        const r = await iniciarCobroAliasAction(registration.id, 'ABONO');
        if (r.error || !r.datos) toast.error(r.error ?? 'No se pudo esperar la transferencia.');
        else {
          setMedio(null);
          if (['CONFIRMADO', 'PAGADO_OTRO_MEDIO'].includes(r.datos.estado)) terminadoAlias(r.datos);
          else setCobroAlias(r.datos);
        }
      } else {
        const result = await updateTicketRegistrationForDayStatusAction(registration.id, pagado
          ? { retired: true }
          : { paid: true, paymentMetodo: medio as 'CASH' | 'TRANSFER', retired: true });
        if ('error' in result && result.error) {
          toast.error(result.error);
        } else {
          terminar();
        }
      }
    });
  };

  return (
    <>
      <ActionDialog open={open} onOpenChange={next => { if (!next && pagoConSalida) terminar(); else onOpenChange(next); }}>
        <ActionDialogContent className="md:max-w-[920px]">
          <ActionDialogHeader
            title={registration?.retired ? 'Detalle de estadía' : 'Estadía activa'}
            description={`Ticket por ${registration ? ticketTimeTypeLabel[registration.ticketTimeType] : '—'}`}
          />
          {registration && <>
            <ActionDialogBody className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:items-start md:gap-6">
              <section aria-label="Resumen de la estadía" className="shrink-0 rounded-[18px] border border-border bg-gm-surface-2 p-3.5 short:p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {registration.vehiclePlateCustomer ? <PlateChip plate={registration.vehiclePlateCustomer} /> : <span className="gm-mono text-base font-semibold">Sin patente</span>}
                  <Badge variant={pagado ? 'green' : 'blue'}>{pagado ? 'Pagado' : 'Pendiente de pago'}</Badge>
                </div>
                <div className="my-3 h-px bg-border short:my-2.5" />
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{pagado ? 'Importe de la estadía' : 'Falta cobrar'}</p>
                <p className="gm-mono mt-1 text-[38px] font-bold leading-none tracking-tight short:text-[32px]">{ars(registration.price)}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">{duration} · {registration.vehicleType === 'CAMIONETA' ? 'Camioneta' : 'Automóvil'}</p>
                {registration.paid && registration.paymentMetodo && <p className="mt-1 text-xs text-muted-foreground">Pagó con {metodoLabel[registration.paymentMetodo]}</p>}
              </section>

              <div className="flex min-w-0 flex-col gap-4 short:gap-3">
                {pagoConSalida ? (pagoConSalida.medio === 'QR' ? <PagoQrRecibido cobro={pagoConSalida.cobro} onCerrar={terminar} /> : <PagoRecibido cobro={pagoConSalida.cobro} onCerrar={terminar} />) : cobroAlias ? <CobroAliasPanel key={cobroAlias.id} cobro={cobroAlias} onTerminado={terminadoAlias} onCancelado={() => setCobroAlias(null)} /> : cobroQr ? <CobroQrMercadoPago cobro={cobroQr} onAcreditado={acreditadoQr} onCancelar={() => setCobroQr(null)} /> : !pagado && !registration.retired ? <fieldset className="min-w-0 space-y-2">
                  <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">¿Cómo paga?</legend>
                  <PaymentMethodChoices value={medio} onChange={setMedio} disabled={isPending} aliasDisponible={!!alias?.disponible} />
                  {medio === 'TRANSFER' && <p className="text-xs text-muted-foreground">Confirmá solo si ya viste la transferencia acreditada en la cuenta.</p>}
                </fieldset> : null}
                <details open={pagado || registration.retired || escritorio ? true : undefined} className="group">
                  <summary className="cursor-pointer py-1 text-xs text-muted-foreground group-open:mb-2">Datos de la estadía</summary>
                <section aria-label="Datos de la estadía" className="rounded-[18px] border border-border bg-gm-surface-2 p-3.5 short:p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Cliente</p>
                  <p className="mt-1 text-[14px] font-medium">{[registration.firstNameCustomer, registration.lastNameCustomer].filter(Boolean).join(' ') || 'Sin nombre cargado'}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div className="min-w-0"><dt className="text-muted-foreground">Desde</dt><dd className="gm-mono mt-1 text-[14px] font-semibold">{formatDate(registration.dateNow)}</dd></div>
                    <div className="min-w-0"><dt className="text-muted-foreground">Vence (estimado)</dt><dd className={`gm-mono mt-1 text-[14px] font-semibold ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>{formatDate(dueDate)}</dd></div>
                  </dl>
                  {isOverdue && <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 text-xs leading-relaxed text-destructive">Venció hace {overdueDays} día{overdueDays > 1 ? 's' : ''}. No se agrega recargo automático. Cualquier adicional se acuerda y registra aparte.</p>}
                  {registration.description && <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer py-1 hover:text-foreground">Detalle del ticket</summary><p className="mt-1 break-words leading-relaxed">{registration.description}</p></details>}
                </section>
                </details>

                {registration.paid && registration.boxList && <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Landmark className="size-3.5" aria-hidden />Caja #{registration.boxList.boxNumber}</span>
                  <span className="gm-mono">{formatDate(registration.boxList.date ?? registration.dateNow)}</span>
                </div>}

                {deliveryEnabled && <section aria-label="Comprobantes del ticket" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-1">
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ReceiptText className="size-3.5" aria-hidden />Comprobantes</span>
                  <Button variant="ghost" size="sm" className="min-h-11 px-2 text-xs text-gm-yellow" onClick={() => { setReceiptKind('ENTRY'); setReceiptId(registration.id); onOpenChange(false); }}>Ver entrada</Button>
                  {registration.retired && <Button variant="ghost" size="sm" className="min-h-11 px-2 text-xs text-gm-yellow" onClick={() => { setReceiptKind('EXIT'); setReceiptId(registration.id); onOpenChange(false); }}>Ver salida</Button>}
                </section>}
              </div>
            </ActionDialogBody>
            <ActionDialogFooter>
              {registration.retired ? <>
                <p className="mr-auto text-center text-sm text-muted-foreground">Salida ya registrada.</p>
                <ActionDialogSecondaryButton onClick={() => onOpenChange(false)}>Cerrar</ActionDialogSecondaryButton>
              </> : !esperando && !pagoConSalida ? <ActionDialogPrimaryButton disabled={isPending || (!pagado && !medio)} onClick={handleRegisterExit} detail={`${registration.vehiclePlateCustomer || 'Sin patente'} · ${pagado ? 'Ya pagado' : ars(registration.price)}`}>
                {isPending ? 'Procesando…' : pagado ? 'Registrar salida' : medio === 'QR' ? 'Generar QR' : medio === 'ALIAS' ? 'Esperar transferencia' : medio ? 'Cobrar y registrar salida' : 'Elegí cómo paga'}
              </ActionDialogPrimaryButton> : null}
            </ActionDialogFooter>
          </>}
        </ActionDialogContent>
      </ActionDialog>

      {deliveryEnabled && <ParkingReceiptDelivery registrationId={receiptId} kind={receiptKind} showDisabledMessage onDismiss={() => setReceiptId(null)} />}
    </>
  );
}
