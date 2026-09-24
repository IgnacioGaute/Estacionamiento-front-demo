"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParkingReceiptDelivery } from "@/components/parking-receipt-delivery";
import { DepartureHistory } from './departure-history';
import { cn } from "@/lib/utils";
import { TicketRegistration } from "@/types/ticket-registration.type";
import { Ticket } from "@/types/ticket.type";
import { TicketPriceBracket } from "@/types/ticket-price-bracket.type";
import { TicketRegistrationForDay } from "@/types/ticket-registration-for-day.type";
import { CloseSummary, TicketSchedule } from "@/services/tickets.service";
import { getCloseSummaryAction } from "@/actions/tickets/get-close-summary.action";
import ScannerButton from "../../components/scanner-button";
import { DayRegistrationsPanel } from "./day-registrations-panel";
import { CreateTicketRegistrationDialog } from "../tickets-days-or-weeks/create-ticket-registration-for-day-dialog";
import { ActiveDayTicketDialog } from "./active-day-ticket-dialog";
import { PriceBracketMapDialog } from "./price-bracket-map-dialog";
import { AdvancePaymentDialog } from "./advance-payment-dialog";
import { ActiveTicketsList } from "./active-tickets-list";
import { EntryByPlateDialog } from "./entry-by-plate-dialog";
import { CloseTicketPanel } from "./close-ticket-panel";
import { TurnoBar } from "./turno-bar";
import { useTour, tourHighlight, tourTransition } from "./ticket-tour";
import { useTicketRealtime } from "@/hooks/use-ticket-realtime";
import {
  formatElapsed,
  isBarcodeOrigin,
  isOverdue,
  isTicketActive,
  latestRegistrationForTicket,
  upsertRegistration,
} from "@/utils/ticket-registration.utils";
import {
  Car,
  Clock,
  CalendarDays,
  QrCode,
  CircleDollarSign,
  Timer,
  AlertTriangle,
  Barcode,
  Banknote,
  ArrowLeft,
  Search,
  Settings,
} from "lucide-react";

const OVERDUE_CHECK_INTERVAL_MS = 20_000;
const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);

// Desactivado a pedido — se dejó el componente sin borrar para reactivarlo después.
const TURNO_BAR_ENABLED = true;

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = "America/Argentina/Buenos_Aires";


// Fecha estimada de vencimiento: fecha de alta + la duración comprada. Cada tipo usa SOLO los
// campos que le corresponden — mezclar semanas/días de un tipo que no los usa da una fecha mal.
function dayRegistrationDueDate(r: TicketRegistrationForDay): Date | null {
  if (!r.dateNow) return null;
  const dueDate = new Date(r.dateNow);
  if (r.ticketTimeType === "MES" || r.ticketTimeType === "MES_Y_DIA") {
    dueDate.setMonth(dueDate.getMonth() + (r.months ?? 0));
    if (r.ticketTimeType === "MES_Y_DIA") {
      dueDate.setDate(dueDate.getDate() + (r.days ?? 0));
    }
  } else {
    const totalDays =
      r.ticketTimeType === "SEMANA"
        ? (r.weeks ?? 0) * 7
        : r.ticketTimeType === "SEMANA_Y_DIA"
          ? (r.weeks ?? 0) * 7 + (r.days ?? 0)
          : r.days ?? 0; // DIA
    dueDate.setDate(dueDate.getDate() + totalDays);
  }
  return dueDate;
}

// Un abono por día/semana/mes sigue "en el playón" mientras no se haya registrado su salida —
// pasar la fecha comprada NO lo saca de la lista ni cambia lo que se cobra (este flujo no tiene
// ninguna conexión con la escalera de tarifas por hora): solo queda marcado como vencido.
function isDayRegistrationActive(r: TicketRegistrationForDay) {
  return !r.retired;
}

function isDayRegistrationOverdue(r: TicketRegistrationForDay) {
  if (r.retired) return false;
  const dueDate = dayRegistrationDueDate(r);
  if (!dueDate) return false;
  return dueDate.getTime() < new Date().setHours(0, 0, 0, 0);
}

export default function CardTicket({
  initialRegistrations,
  ticketCatalog,
  priceBrackets,
  registrationsForDay,
  schedule,
  isAdmin,
  barcodeTicketsEnabled,
}: {
  initialRegistrations: TicketRegistration[];
  ticketCatalog: Ticket[];
  priceBrackets: TicketPriceBracket[];
  registrationsForDay: TicketRegistrationForDay[];
  schedule: TicketSchedule | null;
  isAdmin: boolean;
  barcodeTicketsEnabled: boolean;
}) {
  const [registrations, setRegistrations] =
    useState<TicketRegistration[]>(initialRegistrations);
  const [isScanning, setIsScanning] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<{ id: string; kind: 'ENTRY' | 'EXIT' } | null>(null);
  const receiptDeliveryEnabled = !!(schedule?.receiptDelivery?.whatsapp || schedule?.receiptDelivery?.qr || schedule?.receiptDelivery?.print);
  const [justScannedTicketId, setJustScannedTicketId] = useState<string | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<{
    id: string;
    codeBar: string;
    vehicleType: string;
    existing: TicketRegistration | null;
  } | null>(null);
  const [closePanelOpen, setClosePanelOpen] = useState(false);
  const [closePanelTargetId, setClosePanelTargetId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string;
    kind: "BARCODE" | "PLATE";
    codeBar?: string;
    vehicleType?: string;
  } | null>(null);
  const [previewSummary, setPreviewSummary] = useState<CloseSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Solo se usa por debajo de `sm` — de `sm` para arriba las dos columnas se ven juntas como
  // siempre y esto queda sin efecto.
  const [mobileTab, setMobileTab] = useState<"ingreso" | "activos">("ingreso");
  const [openDayRegistrationId, setOpenDayRegistrationId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"hourly" | "daily" | "receipts">("hourly");
  useEffect(() => {
    if (!receiptDeliveryEnabled && sidebarTab === 'receipts') setSidebarTab('hourly');
  }, [receiptDeliveryEnabled, sidebarTab]);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  // El diálogo de alta por día/semana/mes también tiene que silenciar el lector USB mientras
  // está abierto — si no, tipear la patente dispara el escáner.
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const isDialogOpen = advanceTarget !== null || closePanelOpen || dayDialogOpen || receiptTarget !== null;

  const selectSidebarTab = (tab: "hourly" | "daily" | "receipts") => {
    if (tab === sidebarTab) return;
    const order = ['hourly', 'daily', 'receipts'];
    setFlipDirection(order.indexOf(tab) > order.indexOf(sidebarTab) ? "next" : "prev");
    setSidebarTab(tab);
  };

  const activeDayRegistrations = registrationsForDay.filter(isDayRegistrationActive);
  const overdueDayRegistrations = activeDayRegistrations.filter(isDayRegistrationOverdue);
  const openDayRegistration =
    registrationsForDay.find((r) => r.id === openDayRegistrationId) ?? null;
  const prevLatestIdRef = useRef<string | null>(null);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  // En celular cada sección vive en una pestaña: el tour tiene que abrir la que
  // corresponde antes de cada paso, si no el foco cae sobre algo oculto.
  const tourSteps = useMemo(
    () => [
      { key: 'entrada', title: 'Registrá una entrada', desc: 'Buscá un cliente frecuente o completá patente y vehículo. Podés guardar su teléfono con código de país: aparecerá en frecuentes desde la primera visita.' },
      ...(barcodeTicketsEnabled ? [{ key: 'entrada', title: 'También podés usar tickets físicos', desc: 'Elegí Ticket en el formulario o usá el lector. El primer escaneo registra la entrada; el siguiente prepara la salida para que revises y confirmes el cobro.' }] : []),
      { key: 'salida', title: 'Cobrá la salida', desc: 'Buscá la patente o el ticket, revisá el tiempo, el importe y los anticipos, elegí el medio de pago y confirmá. El tour no registra ni cobra nada.' },
      { key: 'alta-abono', title: 'Día, semana o mes', desc: `Desde acá creás una estadía larga: elegí el período, cantidad, vehículo y si ya está pagada.${isAdmin ? ' Dentro del formulario tenés un enlace para crear o editar sus precios.' : ''}` },
      { key: 'ticket', title: 'El último movimiento', desc: receiptDeliveryEnabled ? 'Acá queda el resumen de la última operación. Si cerraste la entrega, usá Volver a abrir comprobante: no vuelve a registrar ni cobrar.' : 'Acá queda el resumen de la última entrada o salida, con identificación, horarios e importe cuando corresponda.' },
      { key: 'occupancy', title: 'Vehículos por hora', desc: 'Buscá por patente o ticket y seleccioná un vehículo para ver su detalle y preparar la salida. La lista se puede desplazar para ver más vehículos.' },
      { key: 'abonos', title: 'Tus estadías largas', desc: `En Día/Sem/Mes podés buscar y abrir cada abono: ver duración, vencimiento, pago y registrar su salida.${receiptDeliveryEnabled ? ' En su detalle también podés abrir el comprobante de entrada.' : ''} Que venza no significa que el vehículo se haya retirado.` },
      ...(receiptDeliveryEnabled ? [
        { key: 'comprobantes', title: 'Comprobantes, sin perderlos', desc: 'La pestaña de arriba reúne estadías con entrada o salida de hoy. Usá la fecha para ver otro día, Hoy para volver y el buscador para encontrar patente, ticket o apellido.' },
        { key: 'comprobantes', title: 'Elegí entrada o salida', desc: 'Cada fila permite abrir Entrada y, si el vehículo ya se retiró, Salida. La entrega muestra solo los medios activos: WhatsApp requiere confirmar el envío, QR abre el enlace en el celular e impresión usa la impresora instalada. Desde el enlace público se puede descargar PDF o imagen.' },
      ] : []),
      { key: 'precios', title: 'Consultá antes de cobrar', desc: 'Consultar precios te permite revisar las tarifas de la playa. Los precios de Día/Sem/Mes son distintos de los precios por duración.' },
      ...(isAdmin ? [{ key: 'admin', title: 'Configuración de la playa', desc: 'Administrar tickets abre tarifas, forma de cobro, tipos de vehículo y precios de Día/Sem/Mes. En Comprobantes elegís WhatsApp, QR o impresora y el ancho del papel. Podés activar varios medios o ninguno.' }] : []),
      ...(TURNO_BAR_ENABLED ? [{ key: 'turno', title: 'Revisá tu turno', desc: 'Desde Turno actual revisás la caja y accedés a la apertura o cierre. Antes de cerrar, contá el efectivo y revisá las diferencias. Este panel es independiente del cobro de vehículos.' }] : []),
    ].map((step) => ({
      ...step,
      onEnter: () => {
        setMobileTab(['occupancy', 'abonos', 'comprobantes', 'precios', 'admin'].includes(step.key) ? 'activos' : 'ingreso');
        if (step.key === 'occupancy') setSidebarTab('hourly');
        if (step.key === 'abonos') setSidebarTab('daily');
        if (step.key === 'comprobantes') setSidebarTab('receipts');
        if (step.key === 'ticket') setSelectedTarget(null);
      },
    })),
    [barcodeTicketsEnabled, receiptDeliveryEnabled, isAdmin],
  );
  const tour = useTour(tourSteps);

  // router.refresh() re-renders the server-fetched props in place — sync
  // them into state so the update actually shows up (state initializers only
  // run once on mount, they don't pick up later prop changes on their own).
  useEffect(() => {
    setRegistrations(initialRegistrations);
  }, [initialRegistrations]);

  // Actualizaciones en vivo por websocket (entrada, salida, o estadía planificada guardada
  // desde cualquier pestaña/dispositivo) — se mezclan sin pisar algo más nuevo que ya haya
  // llegado por router.refresh().
  const handleRealtimeUpdate = useCallback((incoming: TicketRegistration) => {
    setRegistrations((prev) => upsertRegistration(prev, incoming));
  }, []);
  useTicketRealtime(handleRealtimeUpdate);

  // Si el flujo por código de barras está apagado desde Admin, no se muestra nada de él acá.
  const visibleRegistrations = barcodeTicketsEnabled
    ? registrations
    : registrations.filter((r) => !isBarcodeOrigin(r));

  // Reloj compartido (no uno por casillero) para calcular en vivo qué tickets activos ya se
  // pasaron de la duración que avisaron, sin depender del servidor.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), OVERDUE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Avisa una sola vez por registro cuando cruza a "vencido" — no avisa por lo que ya estaba
  // vencido al cargar la página (evita spam apenas se abre/refresca).
  const overdueToastedRef = useRef<Set<string>>(new Set());
  const seededOverdueRef = useRef(false);
  useEffect(() => {
    const currentlyOverdue = visibleRegistrations.filter((r) => isOverdue(r, now));
    if (!seededOverdueRef.current) {
      overdueToastedRef.current = new Set(currentlyOverdue.map((r) => r.id));
      seededOverdueRef.current = true;
      return;
    }
    for (const r of currentlyOverdue) {
      if (!overdueToastedRef.current.has(r.id)) {
        overdueToastedRef.current.add(r.id);
        toast.warning(
          `Ticket ${r.ticket?.codeBar ?? r.codeBarTicket ?? ""} se pasó de la duración avisada ("${r.expectedBracketLabel}").`
        );
      }
    }
    const activeIds = new Set(visibleRegistrations.filter((r) => !r.departureTime && !r.departureDay).map((r) => r.id));
    for (const id of overdueToastedRef.current) {
      if (!activeIds.has(id)) overdueToastedRef.current.delete(id);
    }
  }, [visibleRegistrations, now]);

  const latestRegistration =
    visibleRegistrations.length > 0
      ? [...visibleRegistrations].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0]
      : null;

  // Briefly pulse the sidebar chip for whatever ticket just landed a new registration.
  useEffect(() => {
    const currentId = latestRegistration?.id ?? null;
    const prevId = prevLatestIdRef.current;
    prevLatestIdRef.current = currentId;
    if (currentId && prevId && currentId !== prevId && latestRegistration) {
      const matched = ticketCatalog.find(
        (t) => t.id === latestRegistration.ticket?.id || t.codeBar === latestRegistration.codeBarTicket
      );
      if (matched) {
        setJustScannedTicketId(matched.id);
        const timer = setTimeout(() => setJustScannedTicketId(null), 2200);
        return () => clearTimeout(timer);
      }
    }
  }, [latestRegistration?.id]);

  const formatDate = (date: string | Date) => {
    if (typeof date === "string") {
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year}`;
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Al elegir un vehículo activo de la lista, se pide su resumen de cierre (mismo endpoint
  // que ya usa CloseTicketPanel) para mostrar toda la info — entrada, tiempo transcurrido,
  // tarifa y monto a cobrar — antes de decidir cobrar la salida.
  const loadPreview = (target: { id: string; kind: "BARCODE" | "PLATE"; codeBar?: string; vehicleType?: string }) => {
    setSelectedTarget(target);
    // En mobile, "Activos" y el detalle viven en pestañas separadas — elegir un vehículo ahí
    // tiene que llevar a la pestaña donde se ve su ficha, si no parece que no pasó nada.
    setMobileTab("ingreso");
    setPreviewLoading(true);
    setPreviewSummary(null);
    getCloseSummaryAction(target.id).then((data) => {
      setPreviewLoading(false);
      if (!data) {
        toast.error("No se pudo cargar el vehículo.");
        setSelectedTarget(null);
        return;
      }
      setPreviewSummary(data);
    });
  };
  const clearPreview = () => {
    setSelectedTarget(null);
    setPreviewSummary(null);
  };

  // Al elegir un vehículo activo (en mobile eso además cambia de pestaña), llevar el arranque
  // de su ficha al tope de la pantalla — si no, según dónde haya quedado el scroll de "Activos"
  // puede aparecer fuera de vista. "start" en vez de "center": la ficha es más alta que la
  // pantalla, así que centrarla completa dejaba "Cobrar salida" tapado debajo del borde.
  // Hay que esperar a que termine de cargar el resumen antes de scrollear: si se scrollea
  // mientras todavía se ve el skeleton, el "scroll anchoring" del navegador vuelve a mover la
  // página cuando el contenido real (más alto) reemplaza al skeleton, dejando todo como si
  // nunca hubiera scrolleado.
  useEffect(() => {
    if (!selectedTarget || previewLoading) return;
    const raf = requestAnimationFrame(() => {
      selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedTarget?.id, previewLoading]);

  // Antes se usaba `latestRegistration?.ticket?.vehicleType` como proxy de "recién entró" —
  // funcionaba para tickets por código de barras (ticket se pone en null al salir), pero los
  // tickets por patente nunca tienen `ticket` poblado, así que siempre se leían como "salida".
  // Lo correcto es mirar directamente si todavía no registró salida.
  const isDayTicket = !!latestRegistration && !latestRegistration.departureTime && !latestRegistration.departureDay;
  const isLatestPatenteOrigin = !!latestRegistration && !latestRegistration.ticket && !latestRegistration.codeBarTicket;
  const todayStr = dayjs().tz(TZ).format("DD/MM/YYYY");
  const sortedCatalog = [...ticketCatalog].sort(
    (a, b) => parseInt(a.codeBar, 10) - parseInt(b.codeBar, 10)
  );
  const activeTickets = sortedCatalog.filter((t) => isTicketActive(t, registrations));
  // El número del tab "Por hora" cuenta estadías abiertas (patente + código de barras), que es
  // lo que lista ActiveTicketsList — no los casilleros del catálogo.
  const activeHourlyCount = visibleRegistrations.filter(
    (r) => !r.departureTime && !r.departureDay,
  ).length;

  return (
    <>
      <header className="mx-auto mb-5 max-w-[1180px] space-y-4 sm:mb-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Estacionamiento · {todayStr}</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tickets y patentes</h1>
            <p className="mt-2 text-sm text-muted-foreground">Registrá una entrada o cobrá una salida.</p>
          </div>
          <div className="shrink-0">{tour.node}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-gm-yellow"><Car className="size-5" /></span>
            <div><p className="text-sm font-medium">{activeHourlyCount + activeDayRegistrations.length} vehículos activos</p><p className="text-xs text-muted-foreground">En esta playa</p></div>
          </div>
          {TURNO_BAR_ENABLED && <div ref={tour.refFor('turno')} style={tour.isActive('turno') ? { ...tourTransition, ...tourHighlight } : tourTransition}><TurnoBar /></div>}
        </div>
      </header>

      <div className="mx-auto mb-4 grid max-w-[1180px] grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 sm:hidden" aria-label="Secciones de tickets">
        <button type="button" aria-pressed={mobileTab === "ingreso"} onClick={() => setMobileTab("ingreso")} className={cn("min-h-12 rounded-xl px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", mobileTab === "ingreso" ? "bg-gm-yellow text-gm-ink" : "text-muted-foreground")}>Entrada y salida</button>
        <button type="button" aria-pressed={mobileTab === "activos"} onClick={() => setMobileTab("activos")} className={cn("min-h-12 rounded-xl px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", mobileTab === "activos" ? "bg-gm-yellow text-gm-ink" : "text-muted-foreground")}>Activos <span className="ml-1 rounded-md bg-foreground/10 px-1.5 py-0.5 text-xs">{activeHourlyCount + activeDayRegistrations.length}</span></button>
      </div>

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-5 lg:gap-7">
        <div className={cn("w-full min-w-0 flex-1 sm:min-w-[320px]", mobileTab !== "ingreso" && "hidden sm:block")}>
          {barcodeTicketsEnabled && <ScannerButton hideControls isDialogOpen={isDialogOpen} onScanningChange={setIsScanning} onTicketRegistered={() => router.refresh()} />}

          <section aria-label="Registrar entradas y salidas" className="mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">¿Qué necesitás hacer?</h2>
            <div ref={tour.refFor('salida')} style={tour.isActive('salida') ? { ...tourTransition, ...tourHighlight } : tourTransition} className="grid gap-3 xl:grid-cols-2">
              <EntryByPlateDialog ticketEntryEnabled={barcodeTicketsEnabled} onGoToRegistration={(id) => { setClosePanelTargetId(id); setClosePanelOpen(true); }} onTicketRegistered={() => router.refresh()} triggerRef={(el) => tour.refFor("entrada")(el)} triggerStyle={tour.isActive("entrada") ? { ...tourTransition, ...tourHighlight } : tourTransition} />
              <button type="button" onClick={() => { setClosePanelTargetId(null); setClosePanelOpen(true); }} className="flex min-h-[88px] w-full min-w-0 items-center gap-3 rounded-xl border border-gm-line-strong bg-secondary px-4 py-4 text-left transition-colors hover:border-gm-yellow/60 hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-gm-yellow"><Banknote className="size-5" /></span>
                <span className="min-w-0"><span className="block text-base font-semibold">Cobrar salida</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Buscá la patente o el ticket</span></span>
              </button>
            </div>
            {barcodeTicketsEnabled && <p role="status" className="mt-3 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground"><Barcode className={cn("size-4 shrink-0", isScanning && "text-gm-yellow")} />{isScanning ? "Leyendo ticket…" : "También podés usar el lector de tickets."}</p>}
            <div ref={tour.refFor('alta-abono')} style={tour.isActive('alta-abono') ? { ...tourTransition, ...tourHighlight } : tourTransition} className="mt-4 border-t border-border pt-4"><CreateTicketRegistrationDialog isAdmin={isAdmin} setIsDialogOpen={setDayDialogOpen} /></div>
          </section>

          {!selectedTarget ? (
            <section ref={(el) => tour.refFor("ticket")(el)} style={tour.isActive("ticket") ? { ...tourTransition, ...tourHighlight } : tourTransition} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><h2 className="text-sm font-semibold">Último movimiento</h2><Clock className="size-4 text-muted-foreground" /></div>
              {latestRegistration ? (
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">{isLatestPatenteOrigin ? "Patente / identificación" : "Ticket"}</p><p className="break-words text-3xl font-semibold tracking-tight">{latestRegistration.ticket?.codeBar || latestRegistration.codeBarTicket || latestRegistration.licensePlateOriginal || latestRegistration.lastNameCustomer || "Sin patente"}</p></div>
                    <Badge variant={isDayTicket ? "green" : "yellow"}>{isDayTicket ? "Entrada registrada" : "Salida registrada"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">{isDayTicket ? "Entrada" : "Salida"}</p><p className="mt-1 font-medium tabular-nums">{isDayTicket ? latestRegistration.entryTime : latestRegistration.departureTime}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDate(isDayTicket ? latestRegistration.entryDay : latestRegistration.departureDay)}</p></div>
                    <div><p className="text-xs text-muted-foreground">{isDayTicket ? "Vehículo" : "Importe registrado"}</p><p className="mt-1 break-words font-medium">{isDayTicket ? (latestRegistration.vehicleType || latestRegistration.ticket?.vehicleType || "Sin especificar").replaceAll("_", " ") : money(latestRegistration.price)}</p></div>
                  </div>
                  {latestRegistration.description && <p className="break-words text-sm text-muted-foreground">{latestRegistration.description}</p>}
                  {latestRegistration.expectedBracketLabel && <p className="text-sm text-muted-foreground">Duración avisada: <span className="text-foreground">{latestRegistration.expectedBracketLabel}</span></p>}
                  {latestRegistration.priceBracketLabel && !isDayTicket && <p className="text-sm text-muted-foreground">Tarifa aplicada: {latestRegistration.priceBracketLabel}</p>}
                  {receiptDeliveryEnabled && <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => setReceiptTarget({ id: latestRegistration.id, kind: isDayTicket ? 'ENTRY' : 'EXIT' })}><QrCode className="mr-2 size-4" />Volver a abrir comprobante</Button>}
                  {(latestRegistration.exceededExpectedStay || latestRegistration.priceBracketFallbackUsed) && <p className="rounded-xl border border-gm-orange/30 bg-gm-orange/10 p-3 text-sm">{latestRegistration.priceBracketFallbackUsed ? "La estadía superó los precios por duración configurados. Revisá la tarifa aplicada." : "El vehículo superó la duración avisada."}</p>}
                  {isDayTicket && <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => loadPreview({ id: latestRegistration.id, kind: isLatestPatenteOrigin ? "PLATE" : "BARCODE", codeBar: latestRegistration.ticket?.codeBar || latestRegistration.codeBarTicket, vehicleType: latestRegistration.vehicleType || latestRegistration.ticket?.vehicleType })}>Ver vehículo y consultar importe</Button>}
                </div>
              ) : <div className="px-5 py-8 text-center"><span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-secondary"><Car className="size-6 text-muted-foreground" /></span><p className="font-medium">Todo listo para la primera entrada</p><p className="mt-2 text-sm text-muted-foreground">Tocá “Registrar entrada” para comenzar.</p></div>}
            </section>
          ) : (
            <section ref={selectedDetailRef} className="scroll-mt-5 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-2 sm:px-5"><button type="button" onClick={clearPreview} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Volver al último movimiento</button></div>
              {previewLoading || !previewSummary ? <p role="status" className="p-8 text-center text-sm text-muted-foreground">Consultando vehículo e importe…</p> : (
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">{selectedTarget.kind === "BARCODE" ? "Ticket seleccionado" : "Vehículo seleccionado"}</p><h2 className="break-words text-3xl font-semibold tracking-tight">{selectedTarget.kind === "BARCODE" ? selectedTarget.codeBar : previewSummary.registration.licensePlateOriginal || previewSummary.registration.lastNameCustomer || "Sin patente"}</h2></div><Badge variant={isOverdue(previewSummary.registration, now) ? "red" : "green"}>{isOverdue(previewSummary.registration, now) ? "Tiempo avisado superado" : "En la playa"}</Badge></div>
                  <div className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm"><div><p className="text-xs text-muted-foreground">Entrada</p><p className="mt-1 font-medium">{previewSummary.registration.entryTime}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(previewSummary.registration.entryDay)}</p></div><div><p className="text-xs text-muted-foreground">Tiempo estacionado</p><p className="mt-1 font-medium">{formatElapsed(previewSummary.elapsedMinutes)}</p></div><div className="col-span-2"><p className="text-xs text-muted-foreground">Tipo de vehículo</p><p className="mt-1 break-words">{(selectedTarget.vehicleType || previewSummary.registration.vehicleType || "Sin especificar").replaceAll("_", " ")}</p></div></div>
                  {previewSummary.registration.expectedBracketLabel && <p className="text-sm text-muted-foreground">Duración avisada: {previewSummary.registration.expectedBracketLabel}</p>}
                  {receiptDeliveryEnabled && <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => setReceiptTarget({ id: previewSummary.registration.id, kind: 'ENTRY' })}><QrCode className="mr-2 size-4" />Abrir comprobante de entrada</Button>}
                  {previewSummary.previewBracket.usedFallback && <p className="rounded-xl bg-gm-orange/10 p-3 text-sm">La estadía superó los precios por duración configurados. Revisá el importe antes de cobrar.</p>}
                  <div className="rounded-xl border border-gm-yellow/20 bg-gm-yellow/5 p-4"><p className="text-sm text-muted-foreground">Importe a cobrar ahora</p><p className="mt-1 break-words text-4xl font-semibold tracking-tight text-gm-yellow">{money(previewSummary.saldoACobrar)}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{previewSummary.previewBracket.label}</p>{previewSummary.totalCollectedSoFar > 0 && <p className="mt-2 text-sm">Anticipo descontado: {money(previewSummary.totalCollectedSoFar)}</p>}</div>
                  <div className="space-y-2"><Button className="min-h-12 w-full rounded-xl text-sm" onClick={() => { setClosePanelTargetId(previewSummary.registration.id); setClosePanelOpen(true); }}><Banknote className="mr-2 size-4" />Continuar con el cobro</Button><Button variant="outline" className="min-h-12 w-full whitespace-normal rounded-xl" onClick={() => setAdvanceTarget({ id: previewSummary.registration.id, codeBar: selectedTarget.codeBar ?? "", vehicleType: selectedTarget.vehicleType ?? previewSummary.registration.vehicleType ?? "", existing: previewSummary.registration })}>Registrar anticipo o avisar duración</Button></div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Sidebar: vehicles currently parked ───────────────── */}
        <div
          ref={(el) => { ['occupancy', 'abonos', 'comprobantes'].forEach(key => tour.refFor(key)(el)); }}
          style={
            ['occupancy', 'abonos', 'comprobantes'].some(tour.isActive)
              ? { ...tourTransition, ...tourHighlight }
              : tourTransition
          }
          className={cn(
            "w-full sm:w-[300px] shrink-0 rounded-[20px] border border-border bg-card/50 p-5 [@media(max-height:850px)]:p-3.5 sm:sticky sm:top-6",
            mobileTab !== "activos" && "hidden sm:block",
          )}
        >
          <button
            onClick={() => {
              setClosePanelTargetId(null);
              setClosePanelOpen(true);
            }}
            className="sm:hidden mb-4 inline-flex w-full h-[72px] items-center gap-3 rounded-[24px] border border-gm-line-strong bg-card/40 px-6 text-left backdrop-blur-xl transition-all duration-300 hover:border-gm-orange/50 hover:bg-gm-orange/10"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gm-line-strong text-muted-foreground">
              <Search className="size-[18px]" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="gm-display text-[14px] font-semibold text-foreground">Buscar y cerrar ticket</span>
              <span className="text-[11.5px] font-normal normal-case text-muted-foreground">Patente o código</span>
            </span>
          </button>

          <div
            className={cn(
              "mb-3 flex items-center gap-4 border-b border-border pb-3",
              isAdmin ? "justify-between" : "justify-end",
            )}
          >
            {isAdmin && (
              <Link
                href="/admin/tickets"
                ref={tour.refFor('admin')}
                style={tour.isActive('admin') ? { ...tourTransition, ...tourHighlight } : tourTransition}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-gm-yellow"
              >
                <Settings className="size-3.5" />
                Administrar tickets
              </Link>
            )}
            <div ref={tour.refFor('precios')} style={tour.isActive('precios') ? { ...tourTransition, ...tourHighlight } : tourTransition}><PriceBracketMapDialog brackets={priceBrackets} schedule={schedule} /></div>
          </div>

          <div role="tablist" aria-label="Vehículos y comprobantes" className="isolate grid min-w-0 grid-cols-2 gap-x-2 gap-y-2 px-1 pb-1">
            {receiptDeliveryEnabled && <button type="button" role="tab" aria-selected={sidebarTab === 'receipts'} onClick={() => selectSidebarTab('receipts')} className={cn(
              "relative z-10 col-span-2 mx-auto flex min-h-11 w-[min(70%,180px)] items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition-[transform,background-color,box-shadow,color] duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] active:translate-y-3 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sidebarTab === 'receipts' ? "translate-y-2 bg-gm-yellow text-gm-ink shadow-[0_5px_0_0_hsl(var(--background)),0_9px_18px_-8px_hsl(var(--gm-yellow)/.35)]" : "bg-gm-surface-2 text-muted-foreground hover:bg-gm-yellow/10 hover:text-gm-yellow"
            )}><QrCode className="size-3.5 shrink-0" />Comprobantes</button>}
            {([{ value: 'hourly', label: 'Por hora', count: activeHourlyCount }, { value: 'daily', label: 'Día/Sem/Mes', count: activeDayRegistrations.length }] as const).map(item => <button key={item.value} type="button" role="tab" aria-selected={sidebarTab === item.value} onClick={() => selectSidebarTab(item.value)} className={cn(
              "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sidebarTab === item.value ? "bg-gm-yellow text-gm-ink" : "bg-gm-surface-2 text-muted-foreground hover:text-foreground",
              sidebarTab === 'receipts' && (item.value === 'hourly' ? "translate-y-1 -rotate-2 scale-y-90 origin-bottom-left" : "translate-y-1 rotate-2 scale-y-90 origin-bottom-right")
            )}><span className="whitespace-nowrap">{item.label}</span><span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] tabular-nums">{item.count}</span></button>)}
          </div>

          {/* Como pasar la hoja de un libro: la franja entrante gira sobre el borde por el que
              "entró" (izquierda si se avanzó a Día/Sem/Mes, derecha si se volvió a Por hora). */}
          <div className="mt-4" style={{ perspective: "1400px" }}>
          <div
            key={sidebarTab}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: flipDirection === "next" ? "left center" : "right center",
              animation: `${flipDirection === "next" ? "gm-page-flip-next" : "gm-page-flip-prev"} 480ms cubic-bezier(.25,.75,.35,1) both`,
            }}
          >
          {sidebarTab === "hourly" ? (
          <>
          <ActiveTicketsList
            ticketCatalog={barcodeTicketsEnabled ? sortedCatalog : []}
            registrations={visibleRegistrations}
            now={now}
            onSelect={(target) =>
              loadPreview({ id: target.id, kind: "BARCODE", codeBar: target.codeBar, vehicleType: target.vehicleType })
            }
            onSelectPlate={(id) => loadPreview({ id, kind: "PLATE" })}
          />
          {barcodeTicketsEnabled && (
            <div className="border-t border-border pt-3.5 mb-4 [@media(max-height:850px)]:pt-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10.5px] uppercase tracking-[0.08em] font-bold text-muted-foreground">
                  Vehículos en el playón
                </h3>
                <div className="flex items-center gap-2">
                  {isAdmin && <Link href="/admin/tickets?crear=ticket" className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-gm-yellow/10 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow" aria-label="Crear tarjeta física">+ Crear</Link>}
                <span className="gm-mono text-[10.5px] text-muted-foreground">
                  {activeTickets.length}/{sortedCatalog.length}
                </span>
                </div>
              </div>
              <p className="mb-2.5 text-[10px] text-muted-foreground">
                Ocupación por ticket de código de barras.
              </p>

              {sortedCatalog.length > 0 && (
                <>
                  <div className="h-[6px] rounded-full bg-gm-surface-3 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gm-yellow to-gm-orange transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.round((activeTickets.length / sortedCatalog.length) * 100)}%` }}
                    />
                  </div>
                  <p className="mb-4 text-[11px] text-muted-foreground">
                    {Math.round((activeTickets.length / sortedCatalog.length) * 100)}% de los tickets circulando en el playón
                  </p>
                </>
              )}

              {sortedCatalog.length > 0 ? (
                <div className="grid grid-cols-5 gap-[7px] mb-4 [@media(max-height:850px)]:mb-2">
                  {sortedCatalog.map((t) => {
                    const active = isTicketActive(t, registrations);
                    const justScanned = t.id === justScannedTicketId;
                    const activeRegistration = active ? latestRegistrationForTicket(t, registrations) : null;
                    const overdue = activeRegistration ? isOverdue(activeRegistration, now) : false;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!activeRegistration}
                        onClick={() =>
                          activeRegistration &&
                          setAdvanceTarget({
                            id: activeRegistration.id,
                            codeBar: t.codeBar,
                            vehicleType: t.vehicleType,
                            existing: activeRegistration,
                          })
                        }
                        title={
                          overdue
                            ? `Ticket ${t.codeBar} · se pasó de la duración avisada`
                            : active
                            ? `Ticket ${t.codeBar} · activo · tocá para avisar duración / cobrar por adelantado`
                            : `Ticket ${t.codeBar} · inactivo`
                        }
                        style={
                          overdue
                            ? { animation: "gm-chip-overdue 1.3s ease-in-out infinite" }
                            : justScanned
                            ? { animation: "gm-chippulse 1.1s ease-in-out 2" }
                            : undefined
                        }
                        className={cn(
                          // `min-w-0` es lo que impide que un código largo empuje su
                          // celda: sin eso el botón crece hasta el ancho del texto,
                          // se sale de la columna y rompe la grilla.
                          "h-[30px] [@media(max-height:850px)]:h-[24px] min-w-0 px-1 rounded-[7px] grid place-items-center gm-mono font-bold border transition-shadow duration-300",
                          // Los tickets suelen ser de 3 dígitos, pero el código de barras
                          // lo carga el usuario y puede ser largo: se achica la letra en
                          // vez de recortar, así el operador lo sigue leyendo entero.
                          t.codeBar.length <= 5 ? "text-[10px]" : t.codeBar.length <= 8 ? "text-[8.5px]" : "text-[7px]",
                          overdue
                            ? "text-white bg-gradient-to-br from-destructive to-[hsl(10_78%_40%)] border-destructive/60 cursor-pointer"
                            : active
                            ? "text-gm-ink bg-gradient-to-br from-gm-yellow to-gm-orange border-gm-yellow/60 cursor-pointer"
                            : "text-muted-foreground bg-gm-surface-2 border-border cursor-default",
                        )}
                      >
                        {/* Red de contención: si ni con la letra chica entra, corta con
                            puntos suspensivos en lugar de desbordar. El código completo
                            sigue estando en el title del botón. */}
                        <span className="w-full truncate text-center">{t.codeBar}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-gm-surface-2/40 p-4 text-center text-[12px] text-muted-foreground mb-4">
                  No hay tickets registrados.
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 [@media(max-height:850px)]:gap-1 text-[11.5px] text-muted-foreground border-t border-border pt-3.5 [@media(max-height:850px)]:pt-2">
            {barcodeTicketsEnabled && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded shrink-0 bg-gm-yellow/85 shadow-[0_0_8px_hsl(var(--gm-yellow)/0.5)]" />
                Activo · sin salida registrada
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded shrink-0 bg-destructive/85 shadow-[0_0_8px_hsl(var(--destructive)/0.5)]" />
              Activo · se pasó de la duración avisada
            </div>
            {barcodeTicketsEnabled && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded shrink-0 border border-border bg-gm-surface-2" />
                Inactivo · con salida registrada
              </div>
            )}
          </div>
          </>
          ) : (
            sidebarTab === 'receipts' && receiptDeliveryEnabled ? <DepartureHistory today={dayjs(now).tz(TZ).format('YYYY-MM-DD')} registrations={registrations} dailyRegistrations={registrationsForDay} onReceipt={(id, kind) => setReceiptTarget({ id, kind })} /> : <DayRegistrationsPanel
              active={activeDayRegistrations}
              overdue={overdueDayRegistrations}
              isOverdue={isDayRegistrationOverdue}
              onSelect={setOpenDayRegistrationId}
            />
          )}
          </div>
          </div>
        </div>
      </div>

      {receiptTarget && <ParkingReceiptDelivery registrationId={receiptTarget.id} kind={receiptTarget.kind} showDisabledMessage onDismiss={() => setReceiptTarget(null)} />}

      <AdvancePaymentDialog
        registrationId={advanceTarget?.id ?? null}
        codeBar={advanceTarget?.codeBar}
        vehicleType={advanceTarget?.vehicleType}
        existingRegistration={advanceTarget?.existing ?? null}
        priceBrackets={priceBrackets}
        open={advanceTarget !== null}
        onOpenChange={(open) => !open && setAdvanceTarget(null)}
        onSuccess={() => {
          clearPreview();
          router.refresh();
        }}
      />

      <ActiveDayTicketDialog
        deliveryEnabled={receiptDeliveryEnabled}
        registration={openDayRegistration}
        open={openDayRegistrationId !== null}
        onOpenChange={(next) => { if (!next) setOpenDayRegistrationId(null); }}
      />

      <CloseTicketPanel
        open={closePanelOpen}
        initialRegistrationId={closePanelTargetId}
        onOpenChange={(open) => {
          setClosePanelOpen(open);
          if (!open) setClosePanelTargetId(null);
        }}
        onSuccess={() => {
          clearPreview();
          router.refresh();
        }}
      />
    </>
  );
}
