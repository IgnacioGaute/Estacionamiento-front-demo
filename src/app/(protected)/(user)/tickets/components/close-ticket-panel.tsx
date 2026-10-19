'use client';
import { CashAmountField } from '@/components/cash-amount-field';
import { discountRegistrationAction } from '@/actions/tickets/discount-registration.action';
import { DataLoading } from '@/components/ui/data-loading';

import { PricingBreakdown, formatImporte } from '@/components/pricing-breakdown';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';
import { PlateChip } from '@/components/plate-chip';
import { VehicleTypeBadge } from '@/components/vehicle-type-badge';

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
import { PaymentMethodChoices, MedioSalida } from './payment-method-choices';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { AlertTriangle, Barcode, ChevronDown, ChevronRight, BadgePercent, CircleX, LogOut, Timer } from 'lucide-react';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroQrMercadoPago, PagoQrRecibido } from './cobro-qr-mercadopago';
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
import { CorregirEntrada } from './corregir-entrada';
import { pagoParcialEfectivoAction } from '@/actions/tickets/pago-parcial.action';
import { EditarDatosEstadia } from './editar-datos-estadia';
import { EliminarEstadia } from './eliminar-estadia';
import { PlateCameraScanButton } from './plate-camera-scan-button';
import { estadiasLargas, useConfirmadas } from './estadias-largas';
import { SeFueAntes } from './se-fue-antes';

// Efectivo y transferencia los declara el cajero; QR y alias los verifica el sistema contra
// MercadoPago. Los cuatro se eligen igual (tocar y confirmar abajo) para que el botón principal
// diga siempre qué va a pasar antes de que pase. AMBOS reparte el saldo como en la cuenta de un
// inquilino: se escribe el efectivo y el resto va por transferencia, QR o alias, así el reparto
// siempre cierra.
type Medio = MedioSalida;


const etiqueta = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';
const miles = (valor: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);

// Patente como chapa; las fichas y las estadías sin patente con su propio distintivo.
function Identidad({ r, size = 'sm', highlight }: { r: TicketRegistration; size?: 'sm' | 'md'; highlight?: string }) {
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
  return <PlateChip plate={r.licensePlateOriginal || '—'} size={size} highlight={highlight} />;
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
  onCorregido,
  onEliminada,
  onSeFueAntes,
}: {
  summary: CloseSummary;
  // Solo cuando se puede corregir la entrada (no mientras se espera un QR o una transferencia).
  onCorregido?: (summary: CloseSummary) => void;
  onEliminada?: () => void;
  // Abre «Se fue antes» (cobrar la tarifa que le correspondía). Mismas condiciones que corregir.
  onSeFueAntes?: () => void;
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
        <div className={cn('flex-wrap items-center gap-3 rounded-2xl border border-border bg-gm-surface-2 py-2.5 pl-2.5 pr-3.5', compacto ? 'flex md:hidden' : 'hidden short:flex md:short:hidden')}>
          <Identidad r={r} />
          <span className="gm-mono min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">{formatElapsed(summary.elapsedMinutes)}</span>
          <span className="gm-mono text-[19px] font-bold">{formatImporte(importe)}</span>
          {summary.previewBracket.usedFallback && <p className="w-full text-xs text-gm-orange">El tiempo supera los precios cargados. Revisá el importe antes de cobrar.</p>}
        </div>
      )}
      <div className={cn('rounded-[18px] border border-border bg-gm-surface-2 p-3.5 short:p-3', compacto ? 'hidden md:block' : compactoEnBajas && 'short:hidden md:short:block')}>
        <div className="flex items-center gap-3">
          {/* El tipo va debajo de la patente: así la fila de abajo queda para las acciones, juntas. */}
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <Identidad r={r} size="md" />
            <VehicleTypeBadge code={r.vehicleType ?? r.ticket?.vehicleType} />
          </div>
          <div className="ml-auto min-w-0 text-right">
            <p className="gm-mono text-base font-semibold">{formatElapsed(summary.elapsedMinutes)}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">{detalle}</p>
          </div>
        </div>
        {onCorregido && <CorregirEntrada summary={summary} onCorregido={onCorregido} />}
        {/* Las acciones en una fila, una al lado de la otra («Corregir», «Se fue antes», eliminar). El
            que se abre (formulario o confirmación) se marca con data-abierto y ocupa la fila: el resto
            se esconde por CSS, sin estado compartido que pueda quedar desfasado si uno se desmonta. */}
        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-1 [&:has(>[data-abierto])>:not([data-abierto])]:hidden">
          {onCorregido && <EditarDatosEstadia key={summary.registration.id} summary={summary} onCorregido={onCorregido} />}
          {onSeFueAntes && (
            <button type="button" onClick={onSeFueAntes} aria-label="Se fue antes: registrar la salida con la tarifa que le correspondía"
              className="group inline-flex h-11 shrink-0 items-center rounded-full focus-visible:outline-none">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gm-line-strong px-3 text-[12.5px] font-semibold text-[#D9D1C3] transition-colors group-hover:border-gm-yellow/40 group-hover:text-foreground group-focus-visible:ring-2 group-focus-visible:ring-gm-yellow">
                <LogOut className="size-3.5" aria-hidden />Se fue antes
              </span>
            </button>
          )}
          {onEliminada && <EliminarEstadia summary={summary} onEliminada={onEliminada} />}
        </div>
        <div className="my-3 h-px bg-border short:my-2.5" />
        {/* Con importes muy largos el botón baja a otra línea en vez de pisar el número. */}
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className={etiqueta}>{saldo > 0 ? 'Falta cobrar' : 'Total de la estadía'}</p>
            <p className="gm-mono mt-1 text-[30px] font-bold leading-none tracking-tight">{formatImporte(importe)}</p>
          </div>
          {summary.previewBracket.breakdown && (
            <button
              type="button"
              onClick={onVerCalculo}
              aria-expanded={calculoAbierto}
              className="-mb-2 -mr-1 ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-[13px] font-semibold text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
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
  onSalidaSinEntrada,
}: {
  open: boolean;
  barcodeTicketsEnabled?: boolean;
  // Registrar un anticipo o avisar la duración en vez de cobrar ahora: cierra el cobro y lo abre el
  // que usa el panel (el inicio, con su diálogo de anticipos).
  onAdvance?: (registration: TicketRegistration) => void;
  // La patente buscada no está adentro: el auto se va sin entrada registrada y se cobra igual.
  onSalidaSinEntrada?: (plate: string) => void;
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
  const { confirmada, confirmar } = useConfirmadas();
  const [summary, setSummary] = useState<CloseSummary | null>(null);
  const [seFueAntesAbierto, setSeFueAntesAbierto] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<Medio | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountReason, setDiscountReason] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  // PREV: cobrar la tarifa anterior (pagó tarde y la estadía pasó de escalón).
  const [discountMode, setDiscountMode] = useState<'AMOUNT' | 'ALL' | 'PREV'>('AMOUNT');
  // El detalle se despliega junto al resumen sin ocultar los medios de pago.
  const [verCalculo, setVerCalculo] = useState(false);
  // Solo para calcular el vuelto en pantalla: no se manda al backend.
  const [pagaCon, setPagaCon] = useState<number | 'OTRO' | null>(null);
  const [otroImporte, setOtroImporte] = useState('');
  // Pago híbrido: lo que entrega en efectivo; la transferencia es el resto del saldo.
  const [efectivoHibrido, setEfectivoHibrido] = useState('');
  // Con qué paga el resto: transferencia ya verificada (se cierra junto con el efectivo), QR o alias.
  const [restoPor, setRestoPor] = useState<'TRANSFER' | 'QR' | 'ALIAS'>('TRANSFER');
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  // La transferencia al alias: si la empresa la tiene (adicional + activada) y el cobro en curso.
  const [alias, setAlias] = useState<DisponibilidadAlias | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);
  const aliasEsperando = !!cobroAlias && ['ESPERANDO', 'REVISION'].includes(cobroAlias.estado);
  // Transferencia o QR que registró la salida: se muestra la confirmación y el diálogo se cierra solo.
  const [pagoConSalida, setPagoConSalida] = useState<
    | ({ registrationId: string } & ({ medio: 'ALIAS'; cobro: CobroAlias } | { medio: 'QR'; cobro: CobroMercadoPago }))
    | null
  >(null);

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
    setShowDiscount(false);
    setDiscountReason('');
    setDiscountAmount('');
    setDiscountMode('AMOUNT');
    setVerCalculo(false);
    setPagaCon(null);
    setOtroImporte('');
    setEfectivoHibrido('');
    setRestoPor('TRANSFER');
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
      setPagoConSalida({ registrationId: cobro.registrationId, medio: 'ALIAS', cobro });
      return;
    }
    // Pago recibido pero quedó saldo (la tarifa subió), o se cobró por otro medio: se recarga la
    // estadía y el cajero sigue desde ahí.
    setCobroAlias(cobro);
    loadSummary(cobro.registrationId);
  };

  // Como con el alias: si el pago no dejó saldo, el sistema ya registró la salida y queda la
  // confirmación que se cierra sola. Si quedó saldo (la tarifa subió mientras pagaba), se recarga
  // la estadía para cobrar la diferencia.
  const acreditadoQr = (registrationId: string, cobro: CobroMercadoPago) => {
    if (cobro.salidaRegistrada) {
      toast.success('Salida registrada exitosamente');
      setCobroQr(null);
      setPagoConSalida({ registrationId, medio: 'QR', cobro });
      return;
    }
    setCobroQr(cobro);
    loadSummary(registrationId);
  };

  const pedirQr = async (id: string) => {
    const r = await crearCobroMercadoPagoAction(id);
    if (r.error || !r.cobro) {
      toast.error(r.error ?? 'No se pudo generar el QR.');
      return;
    }
    setPaymentMethod(null);
    setCobroQr(r.cobro);
  };
  const generarQr = () => {
    if (!summary) return;
    startTransition(() => pedirQr(summary.registration.id));
  };

  // Pago híbrido con QR o alias: esos cobros se acreditan después, así que primero se registra el
  // efectivo (sin la salida) y después el QR o el alias piden el saldo que queda. Al acreditarse
  // registran la salida como siempre; si no se paga, el efectivo ya quedó cobrado.
  const cobrarEfectivoYSeguir = (medio: 'QR' | 'ALIAS') => {
    if (!summary) return;
    const id = summary.registration.id;
    const efectivo = Number(efectivoHibrido);
    startTransition(async () => {
      const r = await pagoParcialEfectivoAction(id, { importe: efectivo, expectedPrice: summary.previewBracket.price, expectedCollected: summary.totalCollectedSoFar });
      if (r.error || !r.summary) {
        toast.error(r.error ?? 'No se pudo cobrar el efectivo.');
        const refreshed = await getCloseSummaryAction(id);
        if (refreshed) setSummary(refreshed);
        return;
      }
      setSummary(r.summary);
      toast.success(`Efectivo cobrado: ${formatImporte(efectivo)}. Falta ${formatImporte(r.summary.saldoACobrar)} ${medio === 'QR' ? 'por QR' : 'al alias'}.`);
      if (medio === 'QR') await pedirQr(id);
      else {
        const a = await iniciarCobroAliasAction(id);
        if (a.error || !a.datos) { toast.error(a.error ?? 'No se pudo empezar a esperar la transferencia.'); return; }
        setPaymentMethod(null);
        if (a.datos.estado === 'CONFIRMADO' || a.datos.estado === 'PAGADO_OTRO_MEDIO') terminadoAlias(a.datos);
        else setCobroAlias(a.datos);
      }
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
    setEfectivoHibrido('');
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

  const aplicarDescuento = () => {
    if (!summary || !discountValid) return;
    startTransition(async () => {
      const result = await discountRegistrationAction(summary.registration.id, { monto: discount,
        motivo: discountReason, expectedPrice: summary.previewBracket.price, expectedCollected: summary.totalCollectedSoFar });
      if (result.error || !result.summary) {
        toast.error(result.error ?? 'No se pudo aplicar el descuento.');
        const refreshed = await getCloseSummaryAction(summary.registration.id);
        if (refreshed) setSummary(refreshed);
        return;
      }
      setSummary(result.summary);
      resetCobro();
      toast.success('Descuento aplicado. Confirmá el cobro o la salida.');
    });
  };

  const handleClose = (closeType: 'PAYMENT' | 'NO_CHARGE', metodo?: 'CASH' | 'TRANSFER', refundMetodo?: 'CASH' | 'TRANSFER', pagos?: { metodo: 'CASH' | 'TRANSFER'; importe: number }[]) => {
    if (!summary) return;
    startTransition(async () => {
      const data = await closeRegistrationAction(summary.registration.id, {
        closeType,
        expectedPrice: summary.previewBracket.price,
        expectedCollected: summary.totalCollectedSoFar,
        refundMetodo,
        metodo,
        pagos,
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
    else if (paymentMethod === 'AMBOS') {
      if (errorHibrido) return;
      // Con transferencia ya verificada se cierra todo junto; QR y alias se acreditan después.
      if (restoPor === 'TRANSFER') handleClose('PAYMENT', undefined, undefined, [{ metodo: 'CASH', importe: efectivoParte }, { metodo: 'TRANSFER', importe: restoParte }]);
      else cobrarEfectivoYSeguir(restoPor);
    } else if (paymentMethod === 'QR') generarQr();
    else if (paymentMethod === 'ALIAS') iniciarAlias();
  };

  // Con un QR o una transferencia esperando no se ofrecen los otros medios: o se paga ese, o se
  // cancela. Si el pago entró y aún así quedó un saldo —la tarifa subió mientras pagaba— vuelven a
  // aparecer para cobrar la diferencia.
  const enEspera = cobroQr?.estado === 'PENDIENTE' || aliasEsperando;
  const saldo = summary?.saldoACobrar ?? 0;
  const tarifaAnterior = summary?.tarifaAnterior ?? null;
  const motivoTarifaAnterior = tarifaAnterior ? `Se cobra la tarifa anterior (${tarifaAnterior.etiqueta}): demoró en pagar` : '';
  const elegirDescuento = (modo: 'AMOUNT' | 'ALL' | 'PREV') => {
    setDiscountMode(modo);
    // El motivo sugerido acompaña a la tarifa anterior; si el cajero escribió otro, se respeta.
    if (modo === 'PREV' && !discountReason.trim()) setDiscountReason(motivoTarifaAnterior);
    if (modo !== 'PREV' && discountReason === motivoTarifaAnterior) setDiscountReason('');
  };
  const discount = discountMode === 'ALL' ? saldo : discountMode === 'PREV' ? tarifaAnterior?.descuento ?? 0 : Number(discountAmount);
  const discountValid = Number.isInteger(discount) && discount > 0 && discount <= saldo && !!discountReason.trim();
  const mostrarMedios = !!summary && saldo > 0 && !enEspera && !pagoConSalida;
  const sugeridos = pagosSugeridos(saldo);
  const recibido = pagaCon === 'OTRO' ? (otroImporte ? Number(otroImporte) : null) : pagaCon;
  const vuelto = recibido !== null ? calcularVuelto(saldo, recibido) : null;
  const efectivoParte = efectivoHibrido ? Number(efectivoHibrido) : 0;
  const restoParte = Math.max(0, saldo - efectivoParte);
  const restoMedios: { id: typeof restoPor; texto: string; detalle: string }[] = [
    { id: 'TRANSFER', texto: 'Transferencia', detalle: 'por transferencia' },
    { id: 'QR', texto: 'QR', detalle: 'por QR' },
    ...(alias?.disponible ? [{ id: 'ALIAS' as const, texto: 'Al alias', detalle: 'al alias' }] : []),
  ];
  const restoDetalle = restoMedios.find((m) => m.id === restoPor)?.detalle ?? 'por transferencia';
  const errorHibrido = !efectivoParte
    ? 'Ingresá cuánto entrega en efectivo.'
    : efectivoParte >= saldo
      ? 'El efectivo cubre todo: elegí «Efectivo».'
      : null;

  // La búsqueda trae primero las que coinciden y después las de patente parecida: lo escaneado o
  // escrito puede tener un carácter mal leído, y sin verlas se cobraba como salida sin entrada.
  // Sin buscar nada, primero los de más de 4 h que nadie confirmó: el aviso de la pantalla de inicio
  // manda acá («Revisar») y casi siempre son autos que se fueron sin registrar la salida. No se
  // repiten en la lista de abajo.
  const ahoraLista = Date.now();
  const sinConfirmar = query.trim() ? [] : estadiasLargas(results.filter((r) => !r.parecida), ahoraLista).filter(({ r }) => !confirmada(r.id, ahoraLista));
  const idsSinConfirmar = new Set(sinConfirmar.map(({ r }) => r.id));
  const coinciden = results.filter((r) => !r.parecida && !idsSinConfirmar.has(r.id));
  const parecidas = results.filter((r) => r.parecida);
  const fila = (r: TicketRegistration) => {
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
          {/* Como en Registrar entrada, se marca lo que coincide con lo buscado (en las parecidas no hay). */}
          <Identidad r={r} highlight={r.parecida ? undefined : query.trim()} />
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
  };

  const titulo = pagoConSalida
    ? 'Salida registrada'
    : cobroQr?.estado === 'PENDIENTE'
      ? 'Cobrar con QR'
      : aliasEsperando
        ? 'Transferencia al alias'
        : 'Cobrar salida';

  const botonPrincipal = (() => {
    if (!summary || pagoConSalida || enEspera) return null;
    if (saldo > 0 && showDiscount)
      return (
        <ActionDialogPrimaryButton disabled={isPending || !discountValid} onClick={aplicarDescuento} detail={discountValid ? `${formatImporte(discount)} de descuento · quedan ${formatImporte(saldo - discount)}` : 'Indicá importe y motivo'}>
          {isPending ? 'Aplicando…' : 'Aplicar descuento'}
        </ActionDialogPrimaryButton>
      );
    if (saldo > 0) {
      const texto: Record<Medio, { accion: string; detalle: string }> = {
        CASH: { accion: 'Cobrar y registrar salida', detalle: `${formatImporte(saldo)} en efectivo` },
        TRANSFER: { accion: 'Cobrar y registrar salida', detalle: `${formatImporte(saldo)} por transferencia` },
        QR: { accion: 'Mostrar el QR', detalle: `${formatImporte(saldo)} · se acredita solo` },
        ALIAS: { accion: 'Esperar la transferencia', detalle: `${formatImporte(saldo)} al alias` },
        AMBOS: {
          accion: restoPor === 'QR' ? 'Cobrar efectivo y mostrar el QR' : restoPor === 'ALIAS' ? 'Cobrar efectivo y esperar la transferencia' : 'Cobrar y registrar salida',
          detalle: errorHibrido ? 'Indicá el efectivo' : `${formatImporte(efectivoParte)} en efectivo · ${formatImporte(restoParte)} ${restoDetalle}`,
        },
      };
      const elegido = paymentMethod ? texto[paymentMethod] : null;
      return (
        <ActionDialogPrimaryButton disabled={isPending || !elegido || (paymentMethod === 'AMBOS' && !!errorHibrido)} onClick={confirmarMedio} detail={elegido?.detalle ?? formatImporte(saldo)}>
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
            <div className="sticky top-0 z-10 -mt-1 flex shrink-0 gap-2 bg-card pt-1">
              {/* Mismo campo que Registrar entrada: en mayúsculas y con la patente grande, así lo que
                  escribe o lee la cámara se compara de un vistazo con la del auto. */}
              <div className="relative min-w-0 flex-1">
                <input
                  autoFocus
                  aria-label="Buscar vehículo"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={50}
                  className="gm-mono h-[60px] w-full rounded-2xl border-2 border-gm-line-strong bg-gm-surface-2 pl-4 pr-12 text-[24px] font-bold uppercase tracking-[0.1em] text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-gm-yellow focus:shadow-[0_0_0_4px_hsl(var(--gm-yellow)/0.14)] short:h-[52px] short:text-[21px]"
                  placeholder={barcodeTicketsEnabled ? 'Patente, ficha, casillero o apellido' : 'Patente o apellido'}
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value.toUpperCase())}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Borrar y buscar otra"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CircleX className="size-[18px]" aria-hidden />
                  </button>
                )}
              </div>
              {/* En el celular, la cámara escribe la patente en el buscador: se ven las que coinciden y las parecidas. */}
              <PlateCameraScanButton variant="square" onRecognized={(plate) => handleSearchChange(plate.toUpperCase())} />
            </div>
            {sinConfirmar.length > 0 && (
              <section aria-label="Autos sin confirmar" className="shrink-0 overflow-hidden rounded-2xl border border-violet-400/30 bg-violet-400/[0.06]">
                <div className="flex min-h-11 items-center justify-between gap-3 pl-3.5 pr-1.5">
                  <p className="text-[12.5px] font-semibold text-violet-100">Sin confirmar · más de 4 h · {sinConfirmar.length}</p>
                  {sinConfirmar.length > 1 && (
                    <button type="button" onClick={() => confirmar(sinConfirmar.map(({ r }) => r.id))}
                      className="min-h-11 shrink-0 rounded-xl px-3 text-[12.5px] font-semibold text-violet-200 transition-colors hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                      Siguen todos
                    </button>
                  )}
                </div>
                <ul>
                  {sinConfirmar.map(({ r, minutos }) => (
                    <li key={r.id} className="flex items-center gap-1 border-t border-violet-400/15 pr-2">
                      <button type="button" onClick={() => loadSummary(r.id)}
                        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow">
                        <Identidad r={r} />
                        <span className="min-w-0 flex-1">
                          <span className="gm-mono block text-[15px] font-semibold text-violet-200">{formatElapsed(minutos)}</span>
                          <span className="block truncate text-[12.5px] text-muted-foreground">Entró {cuandoEntro(r)}</span>
                        </span>
                        <span className="shrink-0 text-[12.5px] font-bold text-gm-yellow">Cobrar</span>
                      </button>
                      <button type="button" onClick={() => confirmar([r.id])} aria-label={`${r.licensePlateOriginal || r.lastNameCustomer || 'Este vehículo'} sigue en la playa`}
                        className="min-h-11 shrink-0 rounded-xl border border-gm-line-strong px-3 text-[12.5px] font-semibold text-[#D9D1C3] transition-colors hover:border-violet-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                        Sigue
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {coinciden.length > 0 && (
              <>
                <p className={etiqueta}>{query.trim() ? `Coinciden · ${coinciden.length}` : sinConfirmar.length ? `Los demás · ${coinciden.length}` : `Adentro ahora · ${coinciden.length}`}</p>
                <ul className="shrink-0 overflow-hidden rounded-2xl border border-border bg-gm-surface-2">
                  {coinciden.map(fila)}
                </ul>
              </>
            )}
            {parecidas.length > 0 && (
              <>
                <div className="space-y-0.5">
                  <p className={etiqueta}>{parecidas.length === 1 ? 'Patente parecida' : `Patentes parecidas · ${parecidas.length}`}</p>
                  <p className="text-[12.5px] text-muted-foreground">No coinciden exacto, pero puede ser el mismo auto con un carácter mal leído.</p>
                </div>
                <ul className="shrink-0 overflow-hidden rounded-2xl border border-dashed border-gm-line-strong bg-gm-surface-2">
                  {parecidas.map(fila)}
                </ul>
              </>
            )}
            {coinciden.length === 0 && !sinConfirmar.length && (isPending && !parecidas.length ? <DataLoading label="Buscando vehículos…" /> : <>
              {!parecidas.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {query.trim() ? (barcodeTicketsEnabled ? 'No encontramos ese vehículo. Revisá la patente o el número de ticket.' : 'No encontramos ese vehículo. Revisá la patente o el apellido.') : 'No hay vehículos adentro.'}
                </p>
              )}
              {/* Un auto que se va sin entrada registrada: se cobra igual con la hora en que llegó. */}
              {onSalidaSinEntrada && query.replace(/[^A-Za-z0-9]/g, '').length >= 5 && (
                <button type="button" onClick={() => onSalidaSinEntrada(query.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-gm-line-strong px-4 text-[13px] font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
                  {parecidas.length ? 'No es ninguno, se va sin entrada' : 'Se está yendo sin entrada'}: cobrar {query.toUpperCase().replace(/[^A-Z0-9]/g, '')}
                </button>
              )}
            </>)}
          </ActionDialogBody>
        ) : (
          <>
            <ActionDialogBody className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:items-start md:gap-6">
              <div className="flex shrink-0 flex-col gap-4">
                <ResumenEstadia
                  summary={summary}
                  compacto={enEspera || !!pagoConSalida}
                  compactoEnBajas={(!!paymentMethod || showDiscount) && !verCalculo}
                  calculoAbierto={verCalculo}
                  onVerCalculo={() => setVerCalculo((v) => !v)}
                  onCorregido={enEspera || pagoConSalida ? undefined : setSummary}
                  onEliminada={!enEspera && !pagoConSalida && !paymentMethod && !showDiscount ? () => {
                    toast.success('Estadía eliminada');
                    onOpenChange(false);
                    onSuccess?.();
                  } : undefined}
                  onSeFueAntes={enEspera || pagoConSalida ? undefined : () => setSeFueAntesAbierto(true)}
                />
                {verCalculo && <Calculo summary={summary} />}
              </div>

              <div className="flex min-w-0 flex-col gap-4 short:gap-3">
                {/* Pago confirmado y salida registrada: la confirmación queda en el mismo cuadro y el
                    diálogo se cierra solo. */}
                {pagoConSalida ? (
                  pagoConSalida.medio === 'QR' ? (
                    <PagoQrRecibido cobro={pagoConSalida.cobro} onCerrar={cerrarTrasPago} />
                  ) : (
                    <PagoRecibido cobro={pagoConSalida.cobro} onCerrar={cerrarTrasPago} />
                  )
                ) : (
                  <>
                    {/* Acreditado con saldo pendiente queda en pantalla con el tilde de pagado, y el
                        cajero cobra la diferencia con los medios de abajo. */}
                    {cobroQr && (
                      <CobroQrMercadoPago
                        cobro={cobroQr}
                        onAcreditado={(pagado) => acreditadoQr(summary.registration.id, pagado)}
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

                    {mostrarMedios && showDiscount ? (
                      <div className="space-y-3 rounded-2xl border border-border bg-gm-surface-2/50 p-3.5">
                        <p className="flex items-center gap-2 text-sm font-semibold"><BadgePercent className="size-[18px] text-gm-yellow" aria-hidden />Descuento</p>
                        <div className={cn('grid gap-2', tarifaAnterior ? 'grid-cols-3' : 'grid-cols-2')}>
                          {([...(tarifaAnterior ? [{ id: 'PREV', label: 'Tarifa anterior' }] : []), { id: 'AMOUNT', label: 'Un importe' }, { id: 'ALL', label: 'Todo el saldo' }] as { id: 'AMOUNT' | 'ALL' | 'PREV'; label: string }[]).map(option =>
                            <button key={option.id} type="button" disabled={isPending} aria-pressed={discountMode === option.id} onClick={() => elegirDescuento(option.id)} className="min-h-11 rounded-xl border border-border px-2 text-sm font-semibold leading-tight aria-pressed:border-gm-yellow/50 aria-pressed:bg-gm-yellow/10 aria-pressed:text-gm-yellow">{option.label}</button>)}
                        </div>
                        {discountMode === 'PREV' && tarifaAnterior ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-gm-line-strong bg-card px-3.5 py-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold">Se cobra {tarifaAnterior.etiqueta}</p>
                              <p className="text-xs text-muted-foreground">Descuento de {formatImporte(tarifaAnterior.descuento)} sobre {formatImporte(summary!.previewBracket.price)}</p>
                            </div>
                            <strong className="gm-mono shrink-0 text-lg">{formatImporte(tarifaAnterior.precio)}</strong>
                          </div>
                        ) : discountMode === 'AMOUNT' ? <CashAmountField compact id="discount-amount" label="Importe del descuento" value={discountAmount} onChange={setDiscountAmount} disabled={isPending} max={saldo} /> : <p className="text-sm text-muted-foreground">Se descuentan {formatImporte(saldo)} de saldo pendiente.</p>}
                        <label htmlFor="discount-reason" className="block text-xs font-semibold">Motivo del descuento</label>
                        <input id="discount-reason" value={discountReason} onChange={e => setDiscountReason(e.target.value)} disabled={isPending} maxLength={255} placeholder="Ej.: beneficio para cliente frecuente" className="h-12 w-full rounded-xl border border-gm-line-strong bg-gm-surface-2 px-3 text-base outline-none focus:border-gm-yellow" />
                        {discount > 0 && discount <= saldo && <p className="text-sm font-semibold">Quedan por cobrar: {formatImporte(saldo - discount)}</p>}
                        <p className="text-xs text-muted-foreground">Después confirmás el cobro o la salida.</p>
                        <ActionDialogSecondaryButton tone="ghost" className="sm:w-full" disabled={isPending} onClick={() => { setShowDiscount(false); setDiscountReason(''); setDiscountAmount(''); }}>Volver a cobrar</ActionDialogSecondaryButton>
                      </div>
                    ) : mostrarMedios ? (
                      <>
                        <fieldset className="min-w-0 space-y-2">
                          <legend className="sr-only">Medio de pago</legend>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                              onClick={() => { setShowDiscount(true); setPaymentMethod(null); elegirDescuento(tarifaAnterior ? 'PREV' : 'AMOUNT'); }}
                              className="-my-2 -mr-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <BadgePercent className="size-4" aria-hidden />
                              Descuento
                            </button>
                          </div>
                          <PaymentMethodChoices compact hibrido value={paymentMethod} onChange={setPaymentMethod} disabled={isPending} aliasDisponible={!!alias?.disponible} />
                        </fieldset>

                        {paymentMethod === 'AMBOS' ? (
                          <div className="space-y-2.5 rounded-2xl border border-border bg-gm-surface-2/50 p-3 short:space-y-2">
                            <CashAmountField compact id="efectivo-hibrido" label="En efectivo" value={efectivoHibrido} onChange={setEfectivoHibrido} disabled={isPending} max={saldo} />
                            <div className="space-y-2 border-t border-dashed border-gm-line-strong pt-2.5">
                              <p className="flex items-center justify-between gap-2">
                                <span className="text-[13.5px] font-semibold">El resto</span>
                                <span className="gm-mono text-[20px] font-bold leading-none">{formatImporte(restoParte)}</span>
                              </p>
                              <div role="group" aria-label="Cómo paga el resto" className={cn('grid gap-2', restoMedios.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                                {restoMedios.map((m) => (
                                  <button key={m.id} type="button" aria-pressed={restoPor === m.id} disabled={isPending} onClick={() => setRestoPor(m.id)}
                                    className={cn('h-11 rounded-xl border-[1.5px] px-1 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                                      restoPor === m.id ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                                    {m.texto}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {errorHibrido && efectivoHibrido
                              ? <p role="alert" className="text-xs text-gm-orange">{errorHibrido}</p>
                              : <p className="text-xs text-muted-foreground">
                                  {restoPor === 'TRANSFER'
                                    ? 'Confirmá después de contar el efectivo y ver la transferencia acreditada.'
                                    : `Se cobra el efectivo y después ${restoPor === 'QR' ? 'se genera el QR' : 'se espera la transferencia al alias'} por el resto. Al acreditarse, la salida se registra sola.`}
                                </p>}
                          </div>
                        ) : paymentMethod === 'CASH' ? (
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
    {/* «Se fue antes» registra la salida en su propio diálogo: al terminar, el cobro ya no tiene qué cobrar. */}
    <SeFueAntes
      registration={summary?.registration ?? null}
      open={seFueAntesAbierto}
      onOpenChange={setSeFueAntesAbierto}
      onRegistrada={() => { onOpenChange(false); onSuccess?.(); }}
    />
    <ParkingReceiptDelivery registrationId={receiptId} kind="EXIT" onDismiss={() => setReceiptId(null)} />
    </>
  );
}
