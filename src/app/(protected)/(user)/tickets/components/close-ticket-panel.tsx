'use client';
import { DataLoading } from '@/components/ui/data-loading';

import { PricingBreakdown, formatImporte } from '@/components/pricing-breakdown';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';
import { PlateChip } from '@/components/plate-chip';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { PaymentMethodChoices, MedioCobro } from './payment-method-choices';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { AlertTriangle, Barcode, ChevronDown, ChevronRight, Gift, Search, Timer } from 'lucide-react';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';
import { CobroAliasPanel, PagoRecibido } from './cobro-alias';
import { CobroAlias, DisponibilidadAlias } from '@/types/verificacion-alias.type';
import {
  cobroAliasDeEstadiaAction,
  disponibilidadAliasAction,
  iniciarCobroAliasAction,
} from '@/actions/mercadopago/verificacion-alias.action';
import { CloseSummary } from '@/services/tickets.service';
import { minutesSinceEntry, isOverdue, isBarcodeOrigin } from '@/utils/ticket-registration.utils';
import { calcularVuelto, pagosSugeridos } from '@/utils/vuelto';
import { cuandoEntro, formatEstadia as formatElapsed } from '@/utils/estadia';

// Efectivo y transferencia los declara el cajero; QR y alias los verifica el sistema contra
// MercadoPago. Los cuatro se eligen igual (tocar y confirmar abajo) para que el botón principal
// diga siempre qué va a pasar antes de que pase.
type Medio = MedioCobro;


const etiqueta = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';
const miles = (valor: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);

// Patente como chapa; las fichas y las estadías sin patente con su propio distintivo.
function Identidad({ r, size = 'sm' }: { r: TicketRegistration; size?: 'sm' | 'md' }) {
  const alto = size === 'md' ? 'h-[38px] min-w-[124px]' : 'h-[33px] min-w-[96px]';
  if (isBarcodeOrigin(r))
    return (
      <span className={cn('gm-mono inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[7px] border-[1.5px] border-gm-line-strong bg-gm-surface-3 px-2 font-bold', alto, size === 'md' ? 'text-[17px]' : 'text-[14px]')}>
        <Barcode className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">Ticket</span>
        {r.ticket?.codeBar ?? r.codeBarTicket ?? '—'}
      </span>
    );
  if (r.noPlate)
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-muted-foreground/60 px-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground', alto)}>
        Sin patente
      </span>
    );
  return <PlateChip plate={r.licensePlateOriginal || '—'} size={size} />;
}

function Calculo({ summary }: { summary: CloseSummary }) {
  if (!summary.previewBracket.breakdown) return null;
  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {summary.pricingDayTypeBasis === 'SPLIT'
          ? 'Cada parte de la estadía usa el precio de día o noche que le corresponde.'
          : `Se usa el precio de la hora de ${summary.pricingDayTypeBasis === 'ENTRY' ? 'entrada' : 'salida'}.`}{' '}
        {summary.tariffSnapshotUsed
          ? 'Se respetan los precios guardados cuando ingresó.'
          : 'Este ingreso es anterior al sistema de precios guardados: usa los precios actuales.'}
      </p>
      <PricingBreakdown lines={summary.previewBracket.breakdown} total={summary.previewBracket.price} />
    </div>
  );
}

// La estadía en un bloque: quién, cuánto tiempo y cuánto falta cobrar, una sola vez. En el celular,
// mientras se espera un QR o una transferencia, se achica a una línea para dejarle lugar al cobro.
function ResumenEstadia({
  summary,
  compacto,
  compactoEnBajas,
  onVerCalculo,
  calculoAbierto,
}: {
  summary: CloseSummary;
  compacto: boolean;
  // Solo en celulares bajos: con el medio ya elegido el importe está en el botón de abajo, y la
  // línea deja lugar para el vuelto.
  compactoEnBajas: boolean;
  onVerCalculo: () => void;
  calculoAbierto: boolean;
}) {
  const r = summary.registration;
  const saldo = summary.saldoACobrar;
  const importe = saldo > 0 ? saldo : summary.previewBracket.price;
  const detalle = [`Entró ${cuandoEntro(r)}`, r.noPlate ? r.lastNameCustomer : null, r.casilleroNumber ? `Casillero ${r.casilleroNumber}` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      {(compacto || compactoEnBajas) && (
        <div className={cn('items-center gap-3 rounded-2xl border border-border bg-gm-surface-2 py-2.5 pl-2.5 pr-3.5', compacto ? 'flex md:hidden' : 'hidden short:flex md:short:hidden')}>
          <Identidad r={r} />
          <span className="gm-mono min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">{formatElapsed(summary.elapsedMinutes)}</span>
          <span className="gm-mono text-[19px] font-bold">{formatImporte(importe)}</span>
        </div>
      )}
      <div className={cn('rounded-[18px] border border-border bg-gm-surface-2 p-3.5 short:p-3', compacto ? 'hidden md:block' : compactoEnBajas && 'short:hidden md:short:block')}>
        <div className="flex items-center gap-3">
          <Identidad r={r} size="md" />
          <div className="ml-auto min-w-0 text-right">
            <p className="gm-mono text-base font-semibold">{formatElapsed(summary.elapsedMinutes)}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">{detalle}</p>
          </div>
        </div>
        <div className="my-3 h-px bg-border short:my-2.5" />
        {/* Con importes muy largos el botón baja a otra línea en vez de pisar el número. */}
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className={etiqueta}>{saldo > 0 ? 'Falta cobrar' : 'Total de la estadía'}</p>
            <p className="gm-mono mt-0.5 text-[38px] font-bold leading-none tracking-tight short:text-[32px]">{formatImporte(importe)}</p>
          </div>
          {summary.previewBracket.breakdown && (
            <button
              type="button"
              onClick={onVerCalculo}
              aria-expanded={calculoAbierto}
              className="-mb-2 -mr-1 ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 px-1 text-[13.5px] font-semibold text-gm-yellow md:hidden"
            >
              {calculoAbierto ? 'Ocultar' : 'Ver cálculo'}
              <ChevronDown className={cn('size-4 transition-transform', calculoAbierto && 'rotate-180')} aria-hidden />
            </button>
          )}
        </div>
        {summary.totalCollectedSoFar > 0 && (
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Total {formatImporte(summary.previewBracket.price)} · ya pagó por adelantado {formatImporte(summary.totalCollectedSoFar)}
          </p>
        )}
        {summary.previewBracket.usedFallback && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-gm-orange">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            El tiempo supera los precios cargados. Revisá el importe antes de cobrar.
          </p>
        )}
      </div>
    </>
  );
}

export function CloseTicketPanel({
  open,
  onOpenChange,
  onSuccess,
  initialRegistrationId,
  barcodeTicketsEnabled = true,
  onAdvance,
}: {
  open: boolean;
  barcodeTicketsEnabled?: boolean;
  // Registrar un anticipo o avisar la duración en vez de cobrar ahora: cierra el cobro y lo abre el
  // que usa el panel (el inicio, con su diálogo de anticipos).
  onAdvance?: (registration: TicketRegistration) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialRegistrationId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const summaryRequest = useRef(0);
  const searchRequest = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TicketRegistration[]>([]);
  const [summary, setSummary] = useState<CloseSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Medio | null>(null);
  const [showCourtesy, setShowCourtesy] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState('');
  // En el celular el cálculo reemplaza a los medios de pago en vez de alargar el diálogo.
  const [verCalculo, setVerCalculo] = useState(false);
  // Solo para calcular el vuelto en pantalla: no se manda al backend.
  const [pagaCon, setPagaCon] = useState<number | 'OTRO' | null>(null);
  const [otroImporte, setOtroImporte] = useState('');
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  // La transferencia al alias: si la empresa la tiene (adicional + activada) y el cobro en curso.
  const [alias, setAlias] = useState<DisponibilidadAlias | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);
  const aliasEsperando = !!cobroAlias && ['ESPERANDO', 'REVISION'].includes(cobroAlias.estado);
  // Transferencia confirmada con la salida registrada: se muestra y el diálogo se cierra solo.
  const [pagoConSalida, setPagoConSalida] = useState<CobroAlias | null>(null);

  // Al cerrar (solo, con «Listo» o con la X): lo mismo que después de un cobro en efectivo,
  // el comprobante de salida y refrescar la lista.
  const cerrarTrasPago = () => {
    const pago = pagoConSalida;
    if (!pago) return;
    setPagoConSalida(null);
    setReceiptId(pago.registrationId);
    onOpenChange(false);
    onSuccess?.();
  };
  // Se entró desde un vehículo ya elegido y el resumen todavía está cargando. No alcanza con
  // mirar `initialRegistrationId`: al volver a buscar ese prop sigue puesto y el buscador nunca
  // aparecería.
  const [abriendoDirecto, setAbriendoDirecto] = useState(false);

  const resetCobro = () => {
    setPaymentMethod(null);
    setShowCourtesy(false);
    setCourtesyReason('');
    setVerCalculo(false);
    setPagaCon(null);
    setOtroImporte('');
  };

  const resetAll = () => {
    summaryRequest.current++;
    searchRequest.current++;
    setQuery('');
    setResults([]);
    setSummary(null);
    resetCobro();
    setCobroQr(null);
    setCobroAlias(null);
    setPagoConSalida(null);
    setAbriendoDirecto(false);
  };

  // Abre la espera de la transferencia. No registra nada: el cobro y la salida se registran cuando
  // el sistema encuentra la transferencia (o el cajero la elige entre varias).
  const iniciarAlias = () => {
    if (!summary) return;
    startTransition(async () => {
      const r = await iniciarCobroAliasAction(summary.registration.id);
      if (r.error || !r.datos) {
        toast.error(r.error ?? 'No se pudo empezar a esperar la transferencia.');
        return;
      }
      setPaymentMethod(null);
      if (r.datos.estado === 'CONFIRMADO' || r.datos.estado === 'PAGADO_OTRO_MEDIO') terminadoAlias(r.datos);
      else setCobroAlias(r.datos);
    });
  };

  const terminadoAlias = (cobro: CobroAlias) => {
    if (cobro.estado === 'CONFIRMADO' && cobro.salidaRegistrada) {
      // El aviso de siempre abajo; la confirmación del pago queda en el cuadro hasta que se cierra.
      toast.success('Salida registrada exitosamente');
      setCobroAlias(null);
      setPagoConSalida(cobro);
      return;
    }
    // Pago recibido pero quedó saldo (la tarifa subió), o se cobró por otro medio: se recarga la
    // estadía y el cajero sigue desde ahí.
    setCobroAlias(cobro);
    loadSummary(cobro.registrationId);
  };

  // El pago por QR entra como un cobro más de la estadía, no como el cierre: cuando se acredita,
  // se vuelve a pedir el resumen y el saldo pasa a cero. El cajero cierra con «no queda saldo».
  const generarQr = () => {
    if (!summary) return;
    startTransition(async () => {
      const r = await crearCobroMercadoPagoAction(summary.registration.id);
      if (r.error || !r.cobro) {
        toast.error(r.error ?? 'No se pudo generar el QR.');
        return;
      }
      setPaymentMethod(null);
      setCobroQr(r.cobro);
    });
  };

  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }
    resetAll();
    void disponibilidadAliasAction().then((r) => setAlias(r.datos ?? null));
    if (initialRegistrationId) {
      setAbriendoDirecto(true);
      loadSummary(initialRegistrationId);
    } else {
      // Sin ticket puntual preseleccionado, el buscador arranca poblado con todos los
      // vehículos activos en vez de esperar a que se escriba algo.
      handleSearchChange('');
    }
  }, [open, initialRegistrationId]);

  // Si el saldo cambia (la tarifa subió, entró un pago) la cuenta del vuelto ya no vale.
  useEffect(() => {
    setPagaCon(null);
    setOtroImporte('');
  }, [summary?.saldoACobrar]);

  const loadSummary = (id: string) => {
    const request = ++summaryRequest.current;
    startTransition(async () => {
      const data = await getCloseSummaryAction(id);
      if (request !== summaryRequest.current) return;
      setAbriendoDirecto(false);
      if (!data) {
        toast.error('No se pudo cargar la estadía.');
        return;
      }
      setSummary(data);
      // Si esta estadía ya estaba esperando una transferencia (se cerró la pantalla, se cortó la
      // conexión), se retoma desde el estado real del backend.
      const previo = await cobroAliasDeEstadiaAction(id);
      if (request !== summaryRequest.current) return;
      if (previo.datos && ['ESPERANDO', 'REVISION'].includes(previo.datos.estado)) setCobroAlias(previo.datos);
    });
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const request = ++searchRequest.current;
    startTransition(async () => {
      const data = await searchActiveRegistrationsAction(value);
      if (request === searchRequest.current) setResults(data);
    });
  };

  const volverABuscar = () => {
    resetAll();
    handleSearchChange('');
  };

  const handleClose = (closeType: 'PAYMENT' | 'NO_CHARGE' | 'COURTESY', metodo?: 'CASH' | 'TRANSFER', refundMetodo?: 'CASH' | 'TRANSFER') => {
    if (!summary) return;
    if (closeType === 'COURTESY' && !courtesyReason.trim()) {
      toast.error('Ingresá el motivo de la cortesía.');
      return;
    }
    startTransition(async () => {
      const data = await closeRegistrationAction(summary.registration.id, {
        closeType,
        expectedPrice: summary.previewBracket.price,
        expectedCollected: summary.totalCollectedSoFar,
        refundMetodo,
        metodo,
        motivo: closeType === 'COURTESY' ? courtesyReason : undefined,
      });
      if (!data || 'error' in data) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'Error desconocido');
        const refreshed = await getCloseSummaryAction(summary.registration.id);
        if (refreshed) setSummary(refreshed);
        setPaymentMethod(null);
      } else {
        toast.success('Salida registrada exitosamente');
        if (data.registrationId) setReceiptId(data.registrationId);
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  const confirmarMedio = () => {
    if (paymentMethod === 'CASH' || paymentMethod === 'TRANSFER') handleClose('PAYMENT', paymentMethod);
    else if (paymentMethod === 'QR') generarQr();
    else if (paymentMethod === 'ALIAS') iniciarAlias();
  };

  // Con un QR o una transferencia esperando no se ofrecen los otros medios: o se paga ese, o se
  // cancela. Si el pago entró y aún así quedó un saldo —la tarifa subió mientras pagaba— vuelven a
  // aparecer para cobrar la diferencia.
  const enEspera = cobroQr?.estado === 'PENDIENTE' || aliasEsperando;
  const saldo = summary?.saldoACobrar ?? 0;
  const mostrarMedios = !!summary && saldo > 0 && !enEspera && !pagoConSalida;
  const sugeridos = pagosSugeridos(saldo);
  const recibido = pagaCon === 'OTRO' ? (otroImporte ? Number(otroImporte) : null) : pagaCon;
  const vuelto = recibido !== null ? calcularVuelto(saldo, recibido) : null;

  const titulo = pagoConSalida
    ? 'Salida registrada'
    : cobroQr?.estado === 'PENDIENTE'
      ? 'Cobrar con QR'
      : aliasEsperando
        ? 'Transferencia al alias'
        : 'Cobrar salida';

  const botonPrincipal = (() => {
    if (!summary || pagoConSalida || enEspera) return null;
    if (saldo > 0 && showCourtesy)
      return (
        <ActionDialogPrimaryButton disabled={isPending || !courtesyReason.trim()} onClick={() => handleClose('COURTESY')} detail={`Cortesía de ${formatImporte(saldo)}`}>
          {isPending ? 'Registrando…' : 'Registrar salida sin cobrar'}
        </ActionDialogPrimaryButton>
      );
    if (saldo > 0) {
      const texto: Record<Medio, { accion: string; detalle: string }> = {
        CASH: { accion: 'Cobrar y registrar salida', detalle: `${formatImporte(saldo)} en efectivo` },
        TRANSFER: { accion: 'Cobrar y registrar salida', detalle: `${formatImporte(saldo)} por transferencia` },
        QR: { accion: 'Mostrar el QR', detalle: `${formatImporte(saldo)} · se acredita solo` },
        ALIAS: { accion: 'Esperar la transferencia', detalle: `${formatImporte(saldo)} al alias` },
      };
      const elegido = paymentMethod ? texto[paymentMethod] : null;
      return (
        <ActionDialogPrimaryButton disabled={isPending || !elegido} onClick={confirmarMedio} detail={elegido?.detalle ?? formatImporte(saldo)}>
          {isPending ? (paymentMethod === 'QR' ? 'Generando…' : 'Registrando…') : (elegido?.accion ?? 'Elegí cómo paga')}
        </ActionDialogPrimaryButton>
      );
    }
    if (summary.cambioARetornar > 0)
      return (
        <>
          <ActionDialogSecondaryButton disabled={isPending} onClick={() => handleClose('NO_CHARGE', undefined, 'TRANSFER')} className="order-last sm:order-none">
            Devolver por transferencia
          </ActionDialogSecondaryButton>
          <ActionDialogPrimaryButton disabled={isPending} onClick={() => handleClose('NO_CHARGE', undefined, 'CASH')} detail={`${formatImporte(summary.cambioARetornar)} en efectivo`}>
            Devolver y registrar salida
          </ActionDialogPrimaryButton>
        </>
      );
    return (
      <ActionDialogPrimaryButton disabled={isPending} onClick={() => handleClose('NO_CHARGE')} detail="No queda saldo">
        {isPending ? 'Registrando…' : 'Registrar salida'}
      </ActionDialogPrimaryButton>
    );
  })();

  return (
    <><ActionDialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o && pagoConSalida) { cerrarTrasPago(); return; } if (!o) resetAll(); onOpenChange(o); }}>
      <ActionDialogContent className={summary ? 'md:max-w-[920px]' : undefined}>
        <ActionDialogHeader
          title={titulo}
          description={!summary && !abriendoDirecto ? 'Elegí el vehículo que se va' : undefined}
          onBack={summary && !enEspera && !pagoConSalida ? volverABuscar : undefined}
          backLabel="Volver a buscar"
          backDisabled={isPending}
        />

        {!summary && abriendoDirecto ? (
          // Al entrar desde un vehículo ya elegido no hay nada que buscar: mostrar el buscador
          // mientras carga el resumen hacía aparecer una pantalla intermedia que nadie pidió y
          // que se iba sola.
          <ActionDialogBody className="justify-center">
            <DataLoading label="Cargando la estadía…" />
          </ActionDialogBody>
        ) : !summary ? (
          <ActionDialogBody className="gap-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="sticky top-0 z-10 -mt-1 shrink-0 bg-card pt-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                aria-label="Buscar vehículo"
                spellCheck={false}
                autoComplete="off"
                className="h-14 w-full rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 pl-12 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gm-yellow"
                placeholder={barcodeTicketsEnabled ? 'Patente, ficha, casillero o apellido' : 'Patente o apellido'}
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <>
                <p className={etiqueta}>{query.trim() ? `Coinciden · ${results.length}` : `Adentro ahora · ${results.length}`}</p>
                <ul className="shrink-0 overflow-hidden rounded-2xl border border-border bg-gm-surface-2">
                  {results.map((r) => {
                    const elapsed = minutesSinceEntry(r, Date.now());
                    const overdue = isOverdue(r, Date.now());
                    const detalle = [r.noPlate ? r.lastNameCustomer : null, `Entró ${cuandoEntro(r)}`, r.casilleroNumber ? `Casillero ${r.casilleroNumber}` : null]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <li key={r.id} className="border-b border-border last:border-0">
                        <button
                          type="button"
                          onClick={() => loadSummary(r.id)}
                          className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow"
                        >
                          <Identidad r={r} />
                          <span className="min-w-0 flex-1">
                            <span className="gm-mono block text-[15px] font-semibold">{elapsed !== null ? formatElapsed(elapsed) : '—'}</span>
                            <span className="block truncate text-[12.5px] text-muted-foreground">{detalle}</span>
                          </span>
                          {overdue ? (
                            <span className="shrink-0 rounded-full bg-gm-orange/15 px-2 py-1 text-[11.5px] font-bold text-[#F0714A]">Excedido</span>
                          ) : (
                            <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {results.length === 0 && (isPending ? <DataLoading label="Buscando vehículos…" /> :
              <p className="py-6 text-center text-sm text-muted-foreground">
                {query.trim() ? (barcodeTicketsEnabled ? 'No encontramos ese vehículo. Revisá la patente o el número de ticket.' : 'No encontramos ese vehículo. Revisá la patente o el apellido.') : 'No hay vehículos adentro.'}
              </p>
            )}
          </ActionDialogBody>
        ) : (
          <>
            <ActionDialogBody className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:items-start md:gap-6">
              <div className="flex shrink-0 flex-col gap-4">
                <ResumenEstadia
                  summary={summary}
                  compacto={enEspera || !!pagoConSalida}
                  compactoEnBajas={(!!paymentMethod || showCourtesy) && !verCalculo}
                  calculoAbierto={verCalculo}
                  onVerCalculo={() => setVerCalculo((v) => !v)}
                />
                {/* En computadora hay lugar: el cálculo queda siempre a la vista. */}
                <div className="hidden md:block"><Calculo summary={summary} /></div>
              </div>

              <div className="flex min-w-0 flex-col gap-4 short:gap-3">
                {/* Pago por transferencia confirmado y salida registrada: la confirmación queda en el
                    mismo cuadro, con quién pagó, y el diálogo se cierra solo. */}
                {pagoConSalida ? (
                  <PagoRecibido cobro={pagoConSalida} onCerrar={cerrarTrasPago} />
                ) : (
                  <>
                    {/* Queda en pantalla también después de acreditado: ahí muestra el tilde de pagado,
                        y recién entonces el cajero registra la salida con el botón de abajo. */}
                    {cobroQr && (
                      <CobroQrMercadoPago
                        cobro={cobroQr}
                        onAcreditado={(pagado) => {
                          setCobroQr(pagado);
                          loadSummary(summary.registration.id);
                        }}
                        onCancelar={() => setCobroQr(null)}
                      />
                    )}

                    {cobroAlias && (
                      <CobroAliasPanel
                        key={cobroAlias.id}
                        cobro={cobroAlias}
                        onTerminado={terminadoAlias}
                        onCancelado={() => setCobroAlias(null)}
                      />
                    )}

                    {verCalculo ? (
                      <div className="md:hidden"><Calculo summary={summary} /></div>
                    ) : mostrarMedios && showCourtesy ? (
                      <div className="space-y-2.5 rounded-2xl border border-border bg-gm-surface-2/50 p-3.5">
                        <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                          <Gift className="size-[18px] text-gm-yellow" aria-hidden />
                          Cortesía: sale sin cobrar
                        </p>
                        <label htmlFor="cortesia-motivo" className="block text-[13px] font-semibold">Motivo (obligatorio)</label>
                        <input
                          id="cortesia-motivo"
                          autoFocus
                          value={courtesyReason}
                          onChange={(e) => setCourtesyReason(e.target.value)}
                          disabled={isPending}
                          placeholder="Por qué no se le cobra"
                          className="h-12 w-full rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gm-yellow"
                        />
                        <p className="text-xs text-muted-foreground">Queda registrado con tu usuario.</p>
                        <ActionDialogSecondaryButton tone="ghost" className="sm:w-full" disabled={isPending} onClick={() => { setShowCourtesy(false); setCourtesyReason(''); }}>
                          Volver a cobrar
                        </ActionDialogSecondaryButton>
                      </div>
                    ) : mostrarMedios ? (
                      <>
                        <fieldset className="min-w-0 space-y-2">
                          <legend className="sr-only">Medio de pago</legend>
                          <div className="flex items-center gap-3">
                            <span className={cn(etiqueta, 'mr-auto')} aria-hidden>¿Cómo paga?</span>
                            {onAdvance && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => { const registro = summary.registration; onOpenChange(false); onAdvance(registro); }}
                                className="-my-2 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <Timer className="size-4" aria-hidden />
                                Anticipo
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => { setShowCourtesy(true); setPaymentMethod(null); }}
                              className="-my-2 -mr-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Gift className="size-4" aria-hidden />
                              Cortesía
                            </button>
                          </div>
                          <PaymentMethodChoices value={paymentMethod} onChange={setPaymentMethod} disabled={isPending} aliasDisponible={!!alias?.disponible} />
                        </fieldset>

                        {paymentMethod === 'CASH' ? (
                          <div className="space-y-2.5 rounded-2xl border border-border bg-gm-surface-2/50 p-3 short:space-y-2">
                            <p className="flex items-baseline justify-between gap-2">
                              <span className="text-[13.5px] font-semibold">¿Con cuánto paga?</span>
                              <span className="text-xs text-muted-foreground">Para calcular el vuelto</span>
                            </p>
                            {pagaCon === 'OTRO' ? (
                              <div className="flex gap-2">
                                <label htmlFor="paga-con-otro" className="sr-only">Importe que entrega</label>
                                <input
                                  id="paga-con-otro"
                                  autoFocus
                                  inputMode="numeric"
                                  placeholder="Importe que entrega"
                                  value={otroImporte ? miles(Number(otroImporte)) : ''}
                                  onChange={(e) => setOtroImporte(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                  className="gm-mono h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-gm-yellow bg-gm-surface-2 px-3 text-base font-semibold text-foreground outline-none"
                                />
                                <button type="button" onClick={() => { setPagaCon(null); setOtroImporte(''); }} className="h-11 shrink-0 rounded-xl px-3 text-[13.5px] font-semibold text-muted-foreground hover:text-foreground">
                                  Volver
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2">
                                {[{ valor: saldo, texto: 'Justo' }, ...sugeridos.map((valor) => ({ valor, texto: miles(valor) }))].map(({ valor, texto }) => (
                                  <button
                                    key={valor}
                                    type="button"
                                    aria-pressed={pagaCon === valor}
                                    onClick={() => setPagaCon(pagaCon === valor ? null : valor)}
                                    className={cn(
                                      'h-11 rounded-xl border-[1.5px] px-1 text-[13px] font-semibold transition-colors',
                                      texto !== 'Justo' && 'gm-mono',
                                      pagaCon === valor ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40',
                                    )}
                                  >
                                    {texto}
                                  </button>
                                ))}
                                <button type="button" onClick={() => setPagaCon('OTRO')} className="h-11 rounded-xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 text-[13px] font-semibold transition-colors hover:border-gm-yellow/40">
                                  Otro
                                </button>
                              </div>
                            )}
                            {vuelto !== null && (
                              <p role="status" className="flex items-center justify-between border-t border-dashed border-gm-line-strong pt-2.5">
                                {vuelto >= 0 ? (
                                  <>
                                    <span className="text-[14px] font-semibold">Vuelto</span>
                                    <span className="gm-mono text-[24px] font-bold leading-none text-gm-yellow">{formatImporte(vuelto)}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[14px] font-semibold text-gm-orange">Le falta entregar</span>
                                    <span className="gm-mono text-[20px] font-bold leading-none text-gm-orange">{formatImporte(-vuelto)}</span>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          // Sin medio elegido es solo una guía que ya repiten los botones: en pantallas bajas se omite.
                          <p className={cn('rounded-2xl border border-border bg-gm-surface-2/50 p-3 text-[13px] leading-relaxed text-muted-foreground', !paymentMethod && 'short:hidden')}>
                            {paymentMethod === 'TRANSFER'
                              ? 'Confirmá solo si ya viste la transferencia acreditada en la cuenta.'
                              : paymentMethod === 'QR'
                                ? `Se genera un QR por ${formatImporte(saldo)} para que lo escanee. El pago se acredita solo.`
                                : paymentMethod === 'ALIAS' && alias?.disponible
                                  ? `Le mostrás el alias ${alias.alias} y el sistema detecta la transferencia de ${formatImporte(saldo)}.`
                                  : 'Elegí cómo te paga. Confirmá solo después de recibir el efectivo o verificar la transferencia.'}
                          </p>
                        )}
                      </>
                    ) : !enEspera && saldo === 0 && summary.cambioARetornar > 0 ? (
                      <p className="rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.08] p-3.5 text-[14px] leading-relaxed">
                        Pagó de más por adelantado: hay que devolverle <strong className="gm-mono">{formatImporte(summary.cambioARetornar)}</strong>.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </ActionDialogBody>
            {/* En computadora los botones se alinean con la columna del cobro (300 px de la estadía
                más el espacio entre columnas), no con todo el ancho del diálogo. */}
            <ActionDialogFooter className="md:pl-[348px]">
              {botonPrincipal}
            </ActionDialogFooter>
          </>
        )}
      </ActionDialogContent>
    </ActionDialog>
    <ParkingReceiptDelivery registrationId={receiptId} kind="EXIT" onDismiss={() => setReceiptId(null)} />
    </>
  );
}
