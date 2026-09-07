"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TicketRegistration } from "@/types/ticket-registration.type";
import { Ticket } from "@/types/ticket.type";
import { TicketPriceBracket } from "@/types/ticket-price-bracket.type";
import { CloseSummary } from "@/services/tickets.service";
import { getCloseSummaryAction } from "@/actions/tickets/get-close-summary.action";
import ScannerButton from "../../components/scanner-button";
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
} from "lucide-react";

const OVERDUE_CHECK_INTERVAL_MS = 20_000;

// Desactivado a pedido — se dejó el componente sin borrar para reactivarlo después.
const TURNO_BAR_ENABLED = false;

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = "America/Argentina/Buenos_Aires";

const TOUR_STEPS = [
  {
    key: "entrada",
    title: "Registrar entrada",
    desc: "Tocá acá para dar de alta un vehículo por patente o por ticket (escaneado o escrito a mano). El sistema también escucha el lector de código de barras en todo momento, incluso con este botón sin tocar — pasá el ticket o el recibo y se procesa solo.",
  },
  {
    key: "ticket",
    title: "Último registro",
    desc: "Acá ves el detalle del último ticket procesado: código de barras, horario de entrada y salida, y el precio calculado según tipo de vehículo.",
  },
  {
    key: "occupancy",
    title: "Vehículos en el playón",
    desc: "Todos los tickets del catálogo. Los casilleros en amarillo siguen activos (fueron escaneados y no registraron salida, el vehículo sigue en el playón); los grises están inactivos o libres. Tocá un casillero activo para avisar cuánto tiempo dijo el cliente que se queda, y opcionalmente cobrarle algo por adelantado.",
  },
];

export default function CardTicket({
  initialRegistrations,
  ticketCatalog,
  priceBrackets,
  barcodeTicketsEnabled,
}: {
  initialRegistrations: TicketRegistration[];
  ticketCatalog: Ticket[];
  priceBrackets: TicketPriceBracket[];
  barcodeTicketsEnabled: boolean;
}) {
  const [registrations, setRegistrations] =
    useState<TicketRegistration[]>(initialRegistrations);
  const [isScanning, setIsScanning] = useState(false);
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
  const isDialogOpen = advanceTarget !== null || closePanelOpen;
  const prevLatestIdRef = useRef<string | null>(null);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const tour = useTour(TOUR_STEPS);

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

  return (
    <>
      {/* Tour help button */}
      <div className="flex justify-end mb-2 max-w-[1180px] mx-auto">
        {tour.node}
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto mb-8 [@media(max-height:850px)]:mb-4">
        <nav className="flex items-center gap-1.5 gm-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 [@media(max-height:850px)]:mb-1">
          <span>Estacionamiento</span>
          <span className="opacity-50">/</span>
          <span>Operación</span>
          <span className="opacity-50">/</span>
          <span className="text-foreground">Ingreso</span>
        </nav>
        <div className="flex items-end justify-between gap-4 flex-wrap border-b border-border pb-5 [@media(max-height:850px)]:pb-2.5">
          <div>
            <h1 className="gm-display text-[26px] md:text-[30px] font-bold tracking-[0.01em] text-foreground [@media(max-height:850px)]:text-[20px]">
              Ingreso de vehículos
            </h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[520px] [@media(max-height:850px)]:hidden">
              Identificá cada auto por patente o por ticket. Buscá y cerrá cualquiera desde el panel de la derecha.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 gm-mono text-[11px] text-muted-foreground">
              <span
                className="h-[7px] w-[7px] rounded-full bg-[hsl(120_35%_55%)]"
                style={{ animation: "gm-blink 1.4s steps(2, jump-none) infinite" }}
              />
              Turno activo · {todayStr}
            </div>
            {TURNO_BAR_ENABLED && <TurnoBar />}
          </div>
        </div>
      </div>

      {/* Selector de pestaña — solo en mobile, arriba de las dos columnas. De `sm` para
          arriba queda oculto y las dos columnas se muestran juntas como siempre. */}
      <div className="max-w-[1180px] mx-auto sm:hidden mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card/40 p-1.5">
        <button
          type="button"
          onClick={() => setMobileTab("ingreso")}
          className={cn(
            "gm-display h-11 rounded-xl text-[12.5px] font-semibold transition-colors",
            mobileTab === "ingreso" ? "bg-gm-yellow text-gm-ink" : "text-muted-foreground",
          )}
        >
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("activos")}
          className={cn(
            "gm-display h-11 rounded-xl text-[12.5px] font-semibold transition-colors",
            mobileTab === "activos" ? "bg-gm-yellow text-gm-ink" : "text-muted-foreground",
          )}
        >
          Activos
        </button>
      </div>

      <div className="max-w-[1180px] mx-auto flex gap-7 [@media(max-height:850px)]:gap-4 flex-wrap items-start">
        {/* ── Main column ──────────────────────────────────────── */}
        <div className={cn("flex-1 min-w-0 sm:min-w-[320px]", mobileTab !== "ingreso" && "hidden sm:block")}>
          {/* El lector USB sigue escuchando en segundo plano — sin UI visible, el ingreso
              manual de ticket ahora vive dentro del diálogo "Registrar entrada" de abajo. */}
          {barcodeTicketsEnabled && (
            <ScannerButton
              hideControls
              isDialogOpen={isDialogOpen}
              onScanningChange={setIsScanning}
              onTicketRegistered={() => router.refresh()}
            />
          )}

          <div className="mb-6 [@media(max-height:850px)]:mb-3 flex flex-col sm:flex-row flex-wrap gap-3.5">
            <EntryByPlateDialog
              ticketEntryEnabled={barcodeTicketsEnabled}
              onGoToRegistration={(id) => {
                setClosePanelTargetId(id);
                setClosePanelOpen(true);
              }}
              onTicketRegistered={() => router.refresh()}
              triggerRef={(el) => tour.refFor("entrada")(el)}
              triggerStyle={tour.isActive("entrada") ? { ...tourTransition, ...tourHighlight } : tourTransition}
            />
            {/* En mobile este botón vive en la pestaña "Activos" (junto al buscador tiene más
                sentido ahí) — de `sm` para arriba no hay pestañas y queda acá como siempre. */}
            <button
              onClick={() => {
                setClosePanelTargetId(null);
                setClosePanelOpen(true);
              }}
              className="hidden sm:inline-flex sm:w-auto sm:min-w-[260px] h-[84px] items-center gap-3 rounded-[24px] border border-gm-line-strong bg-card/40 px-6 text-left backdrop-blur-xl transition-all duration-300 hover:border-gm-orange/50 hover:bg-gm-orange/10"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gm-line-strong text-muted-foreground">
                <Search className="size-[18px]" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="gm-display text-[14px] font-semibold text-foreground">Buscar y cerrar ticket</span>
                <span className="text-[11.5px] font-normal normal-case text-muted-foreground">Patente o código</span>
              </span>
            </button>
          </div>

          {!selectedTarget ? (
          <div
            key={latestRegistration?.id ?? "empty"}
            ref={(el) => tour.refFor("ticket")(el)}
            style={{
              ...(tour.isActive("ticket") ? { ...tourTransition, ...tourHighlight } : tourTransition),
              animation: "gm-ticket-rise 560ms cubic-bezier(.2,.7,.3,1) both",
            }}
          >
            <div className="relative flex w-full flex-col sm:flex-row">
              {/* ── Main stub ── */}
              <div
                className="relative flex-1 p-5 sm:p-9 [@media(max-height:850px)]:p-5 overflow-hidden rounded-3xl sm:rounded-r-none border border-border bg-card/50 backdrop-blur-xl"
                style={isScanning ? { animation: "gm-barglow 950ms ease-in-out" } : undefined}
              >
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-gm-yellow/5 via-transparent to-gm-orange/5" />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(100deg, transparent 40%, hsl(var(--gm-yellow) / 0.06) 50%, transparent 60%)",
                    backgroundSize: "250% 100%",
                    animation: "gm-bgsweep 5s ease-in-out infinite",
                  }}
                />
                <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-gm-yellow blur-3xl opacity-[0.07]" />
                <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-gm-orange blur-3xl opacity-[0.07]" />

                <div className="relative z-10 flex h-full flex-col justify-between gap-7 [@media(max-height:850px)]:gap-4">
                  <div className="space-y-4 [@media(max-height:850px)]:space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge variant="yellow">
                        <Car className="mr-1 h-3 w-3" />
                        {isDayTicket ? "INGRESO REGISTRADO" : "SALIDA REGISTRADA"}
                      </Badge>
                      <span className="gm-mono text-xs text-muted-foreground">
                        #GM-{latestRegistration?.id?.slice(-4).toUpperCase() ?? "0000"}
                      </span>
                    </div>

                    <div>
                      <h2 className="gm-display text-4xl [@media(max-height:850px)]:text-2xl font-bold tracking-tight text-foreground">
                        Estaci
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gm-yellow to-gm-orange">
                          onamiento
                        </span>
                      </h2>
                      <p className="mt-2 [@media(max-height:850px)]:mt-1 text-[15px] text-muted-foreground [@media(max-height:850px)]:hidden">
                        Registro de estacionamiento
                      </p>
                    </div>
                  </div>

                  {latestRegistration ? (
                    isDayTicket ? (
                      <>
                        <div className="grid grid-cols-2 gap-6 [@media(max-height:850px)]:gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center text-muted-foreground text-sm">
                              <CalendarDays className="mr-2 h-4 w-4" />
                              ENTRADA
                            </div>
                            <p className="text-foreground font-medium gm-mono gm-tnum">
                              {formatDate(latestRegistration.entryDay)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-muted-foreground text-sm">
                              <Clock className="mr-2 h-4 w-4" />
                              HORARIO
                            </div>
                            <p className="text-foreground font-medium gm-mono gm-tnum">
                              {latestRegistration.entryTime}
                            </p>
                          </div>
                        </div>

                        {latestRegistration.description && (
                          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/40 p-4 [@media(max-height:850px)]:p-2.5 backdrop-blur-md">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gm-yellow/30 bg-gm-yellow/10">
                              <Car className="h-5 w-5 text-gm-yellow" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {latestRegistration.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {latestRegistration.ticket?.vehicleType === "AUTO"
                                  ? "Automóvil"
                                  : "Camioneta"}
                              </p>
                            </div>
                          </div>
                        )}

                        {latestRegistration.expectedBracketLabel && (
                          <p className="text-[11px] text-muted-foreground">
                            Avisó que se queda: <span className="text-foreground font-medium">{latestRegistration.expectedBracketLabel}</span>
                          </p>
                        )}

                        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground border-t border-border pt-3.5 [@media(max-height:850px)]:pt-2 w-full">
                          <span className="h-[7px] w-[7px] rounded-full shrink-0 bg-[hsl(200_60%_60%)] shadow-[0_0_8px_hsl(200_60%_60%/0.7)]" />
                          <span className="font-semibold tracking-[0.03em] uppercase text-foreground">ENTRADA</span>
                          registrada correctamente
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-6 [@media(max-height:850px)]:gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center text-muted-foreground text-sm">
                              <CalendarDays className="mr-2 h-4 w-4" />
                              SALIDA
                            </div>
                            <p className="text-foreground font-medium gm-mono gm-tnum">
                              {formatDate(latestRegistration.departureDay)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-muted-foreground text-sm">
                              <CircleDollarSign className="mr-2 h-4 w-4" />
                              PRECIO
                            </div>
                            <p className="text-foreground font-medium gm-mono gm-tnum text-xl">
                              ${latestRegistration.price}
                            </p>
                            {latestRegistration.priceBracketLabel && (
                              <p className="text-[11px] text-muted-foreground">
                                Tarifa: <span className="text-foreground font-medium">{latestRegistration.priceBracketLabel}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {latestRegistration.exceededExpectedStay && (
                          <div className="flex items-center gap-3 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3 text-[12px] text-foreground">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-gm-orange" />
                            El cliente había avisado "{latestRegistration.expectedBracketLabel}" y se pasó de ese tiempo.
                          </div>
                        )}

                        {latestRegistration.priceBracketFallbackUsed && (
                          <div className="flex items-center gap-3 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3 text-[12px] text-foreground">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-gm-orange" />
                            La estadía superó todas las franjas configuradas. Revisá Tarifas en Admin.
                          </div>
                        )}

                        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/40 p-4 [@media(max-height:850px)]:p-2.5 backdrop-blur-md">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gm-yellow/30 bg-gm-yellow/10">
                            <Timer className="h-5 w-5 text-gm-yellow" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                                  Entrada
                                </p>
                                <p className="text-sm font-medium text-foreground gm-mono gm-tnum">
                                  {latestRegistration.entryTime}
                                </p>
                              </div>
                              <div className="h-px flex-1 bg-border" />
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                                  Salida
                                </p>
                                <p className="text-sm font-medium text-foreground gm-mono gm-tnum">
                                  {latestRegistration.departureTime}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground border-t border-border pt-3.5 [@media(max-height:850px)]:pt-2 w-full">
                          <span className="h-[7px] w-[7px] rounded-full shrink-0 bg-[hsl(120_35%_55%)] shadow-[0_0_8px_hsl(120_35%_55%/0.7)]" />
                          <span className="font-semibold tracking-[0.03em] uppercase text-foreground">SALIDA</span>
                          registrada correctamente
                        </div>
                      </>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 [@media(max-height:850px)]:py-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/40 mb-4">
                        <QrCode className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No hay registros disponibles.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escaneá un código de barras para comenzar.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Barcode stub ── */}
              <div
                className="relative flex w-full sm:w-[240px] shrink-0 flex-col items-center justify-center gap-6 [@media(max-height:850px)]:gap-3 p-8 [@media(max-height:850px)]:p-4 rounded-3xl sm:rounded-l-none border border-border sm:border-l-0 bg-card/30 backdrop-blur-md"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0 10px, hsl(var(--gm-line-strong) / 0.8) 10px 12px)",
                  backgroundSize: "2px 100%",
                  backgroundPosition: "left",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {isLatestPatenteOrigin ? (
                  <span className="grid size-12 place-items-center rounded-2xl border border-border bg-gm-surface-2 text-muted-foreground">
                    <Car className="size-5" />
                  </span>
                ) : (
                  <div className="relative w-full rounded-[14px] border border-border bg-gm-surface-2 p-4 shadow-lg overflow-hidden">
                    <div
                      className="h-16 [@media(max-height:850px)]:h-10 w-full rounded"
                      style={{
                        backgroundColor: "#f2ead9",
                        backgroundImage:
                          "repeating-linear-gradient(90deg, hsl(var(--gm-ink)) 0 3px, transparent 3px 5px, hsl(var(--gm-ink)) 5px 6px, transparent 6px 10px, hsl(var(--gm-ink)) 10px 14px, transparent 14px 17px, hsl(var(--gm-ink)) 17px 19px, transparent 19px 24px)",
                      }}
                    />
                    {isScanning && (
                      <div
                        className="absolute left-4 right-4 top-4 h-[3px] rounded-full bg-gm-yellow"
                        style={{
                          boxShadow: "0 0 12px 2px hsl(var(--gm-yellow) / 0.9)",
                          animation: "gm-scanline 950ms linear",
                        }}
                      />
                    )}
                  </div>
                )}

                <div className="space-y-1 text-center">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {isLatestPatenteOrigin ? "Patente" : "Código"}
                  </p>
                  <p className="gm-mono text-xl font-bold text-foreground gm-tnum">
                    {latestRegistration
                      ? isDayTicket
                        ? latestRegistration.ticket?.codeBar ?? latestRegistration.licensePlateOriginal ?? "—"
                        : latestRegistration.codeBarTicket ?? latestRegistration.licensePlateOriginal ?? "—"
                      : "—"}
                  </p>
                </div>

                {latestRegistration && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div
                      className="h-2 w-2 rounded-full bg-[hsl(120_35%_55%)]"
                      style={{ animation: "gm-blink 1.4s steps(2, jump-none) infinite" }}
                    />
                    <span>Registrado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          ) : (
            <div className="space-y-3" ref={selectedDetailRef}>
              <button
                type="button"
                onClick={clearPreview}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Ver último registro
              </button>

              {previewLoading || !previewSummary ? (
                <div className="flex items-center justify-center rounded-3xl border border-border bg-card/40 p-16 text-sm text-muted-foreground">
                  Cargando…
                </div>
              ) : (
                <div className="relative flex w-full flex-col sm:flex-row">
                  {/* ── Main stub ── */}
                  <div className="relative flex-1 p-5 sm:p-9 [@media(max-height:850px)]:p-5 overflow-hidden rounded-3xl sm:rounded-r-none border border-border bg-card/50 backdrop-blur-xl">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-gm-yellow/5 via-transparent to-gm-orange/5" />
                    <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-gm-yellow blur-3xl opacity-[0.07]" />
                    <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-gm-orange blur-3xl opacity-[0.07]" />

                    <div className="relative z-10 flex h-full flex-col gap-6 [@media(max-height:850px)]:gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant={isOverdue(previewSummary.registration, now) ? "red" : "green"}>
                          {isOverdue(previewSummary.registration, now) ? "VENCIDO" : "EN HORARIO"}
                        </Badge>
                        <span className="gm-mono text-xs text-muted-foreground">
                          #GM-{previewSummary.registration.id.slice(-4).toUpperCase()}
                        </span>
                      </div>

                      <h2 className="gm-display text-4xl [@media(max-height:850px)]:text-2xl font-bold tracking-tight text-foreground">
                        Estaci
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gm-yellow to-gm-orange">
                          onamiento
                        </span>
                      </h2>

                      {isOverdue(previewSummary.registration, now) && (
                        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-[12px] text-foreground">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                          Se pasó de la duración avisada ({previewSummary.registration.expectedBracketLabel}).
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-2.5 sm:gap-4 [@media(max-height:850px)]:gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center text-muted-foreground text-[11px]">
                            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                            ENTRADA
                          </div>
                          <p className="text-foreground font-medium gm-mono gm-tnum text-sm">
                            {previewSummary.registration.entryTime}
                          </p>
                          <p className="text-muted-foreground gm-mono text-[11px]">
                            {formatDate(previewSummary.registration.entryDay)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-muted-foreground text-[11px]">
                            <Timer className="mr-1.5 h-3.5 w-3.5" />
                            TRANSCURRIDO
                          </div>
                          <p
                            className={cn(
                              "font-medium gm-mono gm-tnum text-sm",
                              isOverdue(previewSummary.registration, now) ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {formatElapsed(previewSummary.elapsedMinutes)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-muted-foreground text-[11px]">
                            <Car className="mr-1.5 h-3.5 w-3.5" />
                            TIPO
                          </div>
                          <p className="text-foreground font-medium gm-mono gm-tnum text-sm">
                            {(selectedTarget?.vehicleType ?? previewSummary.registration.vehicleType) === "CAMIONETA"
                              ? "Camioneta"
                              : "Auto"}
                          </p>
                        </div>
                      </div>

                      {previewSummary.registration.expectedBracketLabel && !isOverdue(previewSummary.registration, now) && (
                        <p className="text-[11px] text-muted-foreground">
                          Avisó que se queda:{" "}
                          <span className="text-foreground font-medium">
                            {previewSummary.registration.expectedBracketLabel}
                          </span>
                        </p>
                      )}

                      {previewSummary.previewBracket.usedFallback && (
                        <div className="flex items-center gap-3 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3 text-[12px] text-foreground">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-gm-orange" />
                          La estadía superó todas las franjas configuradas. Revisá Tarifas en Admin.
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-md">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Monto a cobrar</p>
                          <p className="text-[11px] text-muted-foreground">
                            Tarifa: <span className="text-foreground font-medium">{previewSummary.previewBracket.label}</span>
                          </p>
                          {previewSummary.totalCollectedSoFar > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Ya cobrado (anticipo): ${previewSummary.totalCollectedSoFar}
                            </p>
                          )}
                        </div>
                        <p className="text-3xl font-bold text-foreground gm-mono gm-tnum whitespace-nowrap">
                          ${previewSummary.saldoACobrar}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <Button
                          type="button"
                          className="w-full sm:flex-1 sm:min-w-[180px] h-12"
                          onClick={() => {
                            setClosePanelTargetId(previewSummary.registration.id);
                            setClosePanelOpen(true);
                          }}
                        >
                          <Banknote className="mr-2 h-4 w-4" />
                          Cobrar salida
                        </Button>
                        {selectedTarget && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:flex-1 sm:min-w-[180px] h-12"
                            onClick={() =>
                              setAdvanceTarget({
                                id: previewSummary.registration.id,
                                codeBar: selectedTarget.codeBar ?? "",
                                vehicleType: selectedTarget.vehicleType ?? previewSummary.registration.vehicleType ?? "",
                                existing: previewSummary.registration,
                              })
                            }
                          >
                            Anticipo / avisar duración
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Identifier stub ── */}
                  <div
                    className="relative flex w-full sm:w-[240px] shrink-0 flex-col items-center justify-center gap-3 sm:gap-6 p-4 sm:p-8 rounded-3xl sm:rounded-l-none border border-border sm:border-l-0 bg-card/30 backdrop-blur-md"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(180deg, transparent 0 10px, hsl(var(--gm-line-strong) / 0.8) 10px 12px)",
                      backgroundSize: "2px 100%",
                      backgroundPosition: "left",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {selectedTarget?.kind === "BARCODE" ? (
                      <div className="relative w-full rounded-[14px] border border-border bg-gm-surface-2 p-4 shadow-lg overflow-hidden">
                        <div
                          className="h-16 w-full rounded"
                          style={{
                            backgroundColor: "#f2ead9",
                            backgroundImage:
                              "repeating-linear-gradient(90deg, hsl(var(--gm-ink)) 0 3px, transparent 3px 5px, hsl(var(--gm-ink)) 5px 6px, transparent 6px 10px, hsl(var(--gm-ink)) 10px 14px, transparent 14px 17px, hsl(var(--gm-ink)) 17px 19px, transparent 19px 24px)",
                          }}
                        />
                      </div>
                    ) : (
                      <span className="grid size-12 place-items-center rounded-2xl border border-border bg-gm-surface-2 text-muted-foreground">
                        <Car className="size-5" />
                      </span>
                    )}

                    <div className="space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {selectedTarget?.kind === "BARCODE" ? "Código" : "Patente"}
                      </p>
                      <p className="gm-mono text-xl font-bold text-foreground gm-tnum">
                        {selectedTarget?.kind === "BARCODE"
                          ? selectedTarget.codeBar
                          : previewSummary.registration.noPlate
                          ? previewSummary.registration.lastNameCustomer ?? "Sin patente"
                          : previewSummary.registration.licensePlateOriginal ?? "—"}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div
                        className="h-2 w-2 rounded-full bg-[hsl(120_35%_55%)]"
                        style={{ animation: "gm-blink 1.4s steps(2, jump-none) infinite" }}
                      />
                      <span>Registrado</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar: vehicles currently parked ───────────────── */}
        <div
          ref={(el) => tour.refFor("occupancy")(el)}
          style={
            tour.isActive("occupancy")
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
                <span className="gm-mono text-[10.5px] text-muted-foreground">
                  {activeTickets.length}/{sortedCatalog.length}
                </span>
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
                          "h-[30px] [@media(max-height:850px)]:h-[24px] rounded-[7px] grid place-items-center gm-mono text-[10px] font-bold border transition-shadow duration-300",
                          overdue
                            ? "text-white bg-gradient-to-br from-destructive to-[hsl(10_78%_40%)] border-destructive/60 cursor-pointer"
                            : active
                            ? "text-gm-ink bg-gradient-to-br from-gm-yellow to-gm-orange border-gm-yellow/60 cursor-pointer"
                            : "text-muted-foreground bg-gm-surface-2 border-border cursor-default",
                        )}
                      >
                        {t.codeBar}
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
        </div>
      </div>

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
