"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { OfflineConsultation } from '@/components/offline-consultation';
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "sonner";
import { ParkingReceiptDelivery } from "@/components/parking-receipt-delivery";
import { formatImporte } from "@/components/pricing-breakdown";
import { useTenant } from "@/components/tenant-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { DepartureHistory } from './departure-history';
import { cn } from "@/lib/utils";
import { TicketRegistration } from "@/types/ticket-registration.type";
import { Ticket } from "@/types/ticket.type";
import { TicketPriceBracket } from "@/types/ticket-price-bracket.type";
import { TicketRegistrationForDay } from "@/types/ticket-registration-for-day.type";
import { TicketSchedule } from "@/services/tickets.service";
import ScannerButton from "../../components/scanner-button";
import { CreateTicketRegistrationDialog } from "../tickets-days-or-weeks/create-ticket-registration-for-day-dialog";
import { ActiveDayTicketDialog } from "./active-day-ticket-dialog";
import { PriceBracketMapDialog } from "./price-bracket-map-dialog";
import { AdvancePaymentDialog } from "./advance-payment-dialog";
import { ScanPlateAction } from './scan-plate-action';
import { EntryByPlateDialog } from "./entry-by-plate-dialog";
import { CloseTicketPanel } from "./close-ticket-panel";
import { TurnoBar } from "./turno-bar";
import { useTour } from "./ticket-tour";
import { useTicketRealtime } from "@/hooks/use-ticket-realtime";
import { useMediaQuery } from "@/hooks/use-media-query";
import { isBarcodeOrigin, isOverdue, minutesSinceEntry, upsertRegistration } from "@/utils/ticket-registration.utils";
import { estadiaLargaActiva as isDayRegistrationActive, estadiaLargaVencida as isDayRegistrationOverdue } from "@/utils/estadia-larga";
import { EncabezadoVista, estaAdentro, FichasEnElPlayon, InicioHero, MostradorDock, normalizar, TodosLosVehiculos, VehiculoFila, type FiltroVehiculos } from "./inicio";
import { AccionesEscritorio, BuscadorRapido, TableroPlaya, TarjetaAdentro, UltimosMovimientos, type FiltroTablero } from "./escritorio";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Barcode,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Map,
  Receipt,
  Settings,
} from "lucide-react";

const OVERDUE_CHECK_INTERVAL_MS = 20_000;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// Desde este ancho la pantalla es la de computadora (mostrador + tablero); por debajo, la del celular.
const ESCRITORIO = "(min-width: 1024px)";

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = "America/Argentina/Buenos_Aires";

type Vista = "inicio" | "vehiculos" | "comprobantes";

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
  const [registrations, setRegistrations] = useState<TicketRegistration[]>(initialRegistrations);
  const TURNO_BAR_ENABLED = schedule?.shiftsEnabled === true;
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
  const [entryScanRequest, setEntryScanRequest] = useState<{ plate: string; sequence: number } | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [plateScanBusy, setPlateScanBusy] = useState(false);
  const [scannedDayRegistration, setScannedDayRegistration] = useState<TicketRegistrationForDay | null>(null);
  const [closePanelOpen, setClosePanelOpen] = useState(false);
  const [closePanelTargetId, setClosePanelTargetId] = useState<string | null>(null);
  const [openDayRegistrationId, setOpenDayRegistrationId] = useState<string | null>(null);
  // La barra de abajo y la columna de la computadora abren los mismos diálogos: cada toque suma.
  const [entradaSignal, setEntradaSignal] = useState(0);
  const [estadiaSignal, setEstadiaSignal] = useState(0);
  // El diálogo de alta por día/semana/mes también tiene que silenciar el lector USB mientras
  // está abierto — si no, tipear la patente dispara el escáner.
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const isDialogOpen = entryDialogOpen || plateScanBusy || advanceTarget !== null || closePanelOpen || dayDialogOpen || receiptTarget !== null;

  // El inicio, la lista completa y el historial de comprobantes son tres vistas de la misma
  // pantalla: se pasa de una a otra con un deslizamiento (hacia la derecha al entrar, a la
  // izquierda al volver), sin recargar nada.
  const [vista, setVista] = useState<Vista>("inicio");
  const [filtro, setFiltro] = useState<FiltroVehiculos>("hora");
  const [filtroTablero, setFiltroTablero] = useState<FiltroTablero>("todos");
  const buscadorRef = useRef<HTMLInputElement>(null);
  // Hasta montar se dibujan las dos pantallas y el CSS muestra la que va (así la primera imagen ya
  // es la correcta); después queda solo una, sin duplicar listas, ids ni efectos.
  const esEscritorio = useMediaQuery(ESCRITORIO);
  const atajos = esEscritorio === true;
  const [direccion, setDireccion] = useState<"adelante" | "atras">("adelante");
  const vistaRef = useRef<Vista>("inicio");
  vistaRef.current = vista;
  const arribaRef = useRef<HTMLDivElement | null>(null);
  const irA = useCallback((siguiente: Vista, conFiltro?: FiltroVehiculos) => {
    setDireccion(siguiente === "inicio" ? "atras" : "adelante");
    setVista(siguiente);
    if (conFiltro) setFiltro(conFiltro);
    // Arriba de todo del contenedor que desplaza (el documento o el del layout), sin esconder la
    // barra de la app como haría scrollIntoView.
    requestAnimationFrame(() => {
      let el = arribaRef.current?.parentElement ?? null;
      while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      (el ?? window).scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const activeDayRegistrations = registrationsForDay.filter(isDayRegistrationActive);
  const overdueDayRegistrations = activeDayRegistrations.filter(isDayRegistrationOverdue);
  const openDayRegistration =
    (scannedDayRegistration?.id === openDayRegistrationId ? scannedDayRegistration : registrationsForDay.find((r) => r.id === openDayRegistrationId)) ?? null;
  const prevLatestIdRef = useRef<string | null>(null);
  const router = useRouter();
  const session = useSession();
  const isMobile = useIsMobile();
  const { reconocimientoPatentes } = useTenant();

  // Cada paso del tour abre la vista donde está lo que señala.
  const tourSteps = useMemo(
    () => [
      { key: 'entrada', title: 'Registrá una entrada', desc: 'Buscá un cliente frecuente o completá patente y vehículo. Podés guardar su teléfono con código de país: aparecerá en frecuentes desde la primera visita.' },
      ...(barcodeTicketsEnabled ? [{ key: 'entrada', title: 'También podés usar tickets físicos', desc: 'Elegí Ticket en el formulario o usá el lector. El primer escaneo registra la entrada; el siguiente prepara la salida para que revises y confirmes el cobro.' }] : []),
      { key: 'salida', title: 'Cobrá la salida', desc: 'Buscá la patente o el ticket, o tocá un vehículo de la lista. Revisá el tiempo, el importe y los anticipos, elegí el medio de pago y confirmá. El tour no registra ni cobra nada.' },
      { key: 'alta-abono', title: 'Día, semana o mes', desc: `Desde Estadía larga creás una estadía de días, semanas o meses: elegí la duración, el vehículo y si ya está pagada.${isAdmin ? ' Dentro del formulario tenés Administrar precios.' : ''}` },
      { key: 'ticket', title: 'Lo último que pasó', desc: receiptDeliveryEnabled ? 'Acá quedan las últimas entradas y salidas, con su hora e importe. Con Comprobante lo volvés a abrir: no vuelve a registrar ni cobrar.' : 'Acá quedan las últimas entradas y salidas, con su hora e importe.' },
      { key: 'occupancy', title: 'Todos los vehículos', desc: 'Se agrupan por hace cuánto están y el color lo dice: verde menos de 1 h, azul de 1 a 4 h, violeta más de 4 h. La línea de abajo de cada uno se llena a medida que se acerca al tramo siguiente; en naranja, los que se pasaron del tiempo avisado. Tocá uno para cobrarlo.' },
      { key: 'abonos', title: 'Tus estadías largas', desc: `En Día/Sem/Mes podés buscar y abrir cada abono: ver duración, vencimiento, pago y registrar su salida.${receiptDeliveryEnabled ? ' En su detalle también podés abrir el comprobante de entrada.' : ''} Que venza no significa que el vehículo se haya retirado.` },
      ...(receiptDeliveryEnabled ? [
        { key: 'comprobantes', title: 'Comprobantes, sin perderlos', desc: 'Acá están las estadías con entrada o salida del día. Usá la fecha para ver otro día y el buscador para encontrar patente, ticket o apellido. Cada fila abre la Entrada y, si ya se retiró, la Salida.' },
      ] : []),
      { key: 'precios', title: 'Consultá antes de cobrar', desc: 'Tarifas te muestra los precios de la playa. Los precios de Día/Sem/Mes son distintos de los precios por duración.' },
      ...(isAdmin ? [{ key: 'admin', title: 'Configuración de la playa', desc: 'Administrar tarifas reúne los precios por tiempo y los pases de día, semana o mes. Podés editar un borrador, probar cuánto cobrarías y aplicar los cambios juntos.' }] : []),
      ...(TURNO_BAR_ENABLED ? [{ key: 'turno', title: 'Revisá tu turno', desc: 'Desde tu turno revisás la caja y accedés a la apertura o cierre. Antes de cerrar, contá el efectivo y revisá las diferencias.' }] : []),
    ].map((step) => ({
      ...step,
      desc: barcodeTicketsEnabled ? step.desc : step.desc.replaceAll("patente o el ticket", "patente o el apellido").replaceAll("patente o ticket", "patente o apellido").replaceAll("patente, ticket o apellido", "patente o apellido"),
      onEnter: () => {
        if (step.key === 'occupancy') irA('vehiculos', 'hora');
        else if (step.key === 'abonos') irA('vehiculos', 'dia');
        else if (step.key === 'comprobantes') irA('comprobantes');
        else if (vistaRef.current !== 'inicio') irA('inicio');
      },
    })),
    [barcodeTicketsEnabled, receiptDeliveryEnabled, isAdmin, TURNO_BAR_ENABLED, irA],
  );
  const tour = useTour(tourSteps);
  // Hay accesos que existen dos veces (en la barra del celular y en la columna de la computadora):
  // el tour señala el que se ve.
  const refVisible = (key: string) => (el: HTMLElement | null) => {
    if (!el || el.getClientRects().length === 0) return;
    tour.refFor(key)(el);
  };

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

  // Reloj compartido para calcular en vivo los tiempos y qué vehículos ya se pasaron de la
  // duración que avisaron, sin depender del servidor.
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
        const quien = r.ticket?.codeBar ?? r.codeBarTicket ? `El ticket ${r.ticket?.codeBar ?? r.codeBarTicket}` : r.licensePlateOriginal ?? 'Un vehículo';
        toast.warning(`${quien} se pasó de la duración avisada ("${r.expectedBracketLabel}").`);
      }
    }
    const activeIds = new Set(visibleRegistrations.filter(estaAdentro).map((r) => r.id));
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

  // Briefly pulse the ticket chip for whatever ticket just landed a new registration.
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

  const abrirCobro = (id: string | null) => {
    setClosePanelTargetId(id);
    setClosePanelOpen(true);
  };
  const abrirEntrada = () => setEntradaSignal((n) => n + 1);
  const abrirEstadia = () => setEstadiaSignal((n) => n + 1);
  const abrirAnticipo = (r: TicketRegistration) => setAdvanceTarget({
    id: r.id,
    codeBar: r.ticket?.codeBar ?? r.codeBarTicket ?? "",
    vehicleType: r.vehicleType ?? r.ticket?.vehicleType ?? "",
    existing: r,
  });
  // Desde el buscador de la computadora: la entrada se abre con lo que se escribió.
  const entrarCon = (texto: string) => {
    const patente = normalizar(texto);
    if (patente) setEntryScanRequest((previous) => ({ plate: patente, sequence: (previous?.sequence ?? 0) + 1 }));
    else abrirEntrada();
  };

  // Atajos de la computadora: «/» busca, «E» registra una entrada, «S» cobra una salida. Se
  // escuchan antes que el lector USB (que toma cualquier tecla fuera de un campo) y se cortan ahí,
  // así una letra nunca se confunde con un código; nunca mientras se escribe o hay un diálogo.
  const dialogoAbiertoRef = useRef(isDialogOpen);
  dialogoAbiertoRef.current = isDialogOpen;
  useEffect(() => {
    if (!atajos) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const destino = e.target as HTMLElement | null;
      if (destino?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (dialogoAbiertoRef.current || document.querySelector('[role="dialog"][data-state="open"]')) return;
      const tecla = e.key.toLowerCase();
      const accion = e.key === "/" ? () => buscadorRef.current?.focus()
        : tecla === "e" ? () => setEntradaSignal((n) => n + 1)
        : tecla === "s" ? () => { setClosePanelTargetId(null); setClosePanelOpen(true); }
        : null;
      if (!accion) return;
      e.preventDefault();
      e.stopPropagation();
      accion();
    };
    window.addEventListener("keydown", alTeclear, true);
    return () => window.removeEventListener("keydown", alTeclear, true);
  }, [atajos]);

  const sortedCatalog = [...ticketCatalog].sort(
    (a, b) => parseInt(a.codeBar, 10) - parseInt(b.codeBar, 10)
  );
  const activosPorHora = visibleRegistrations.filter(estaAdentro);
  const excedidos = activosPorHora.filter((r) => isOverdue(r, now)).length;
  const total = activosPorHora.length + activeDayRegistrations.length;
  const ultimasEntradas = [...activosPorHora]
    .sort((a, b) => (minutesSinceEntry(a, now) ?? 0) - (minutesSinceEntry(b, now) ?? 0))
    .slice(0, 2);

  // La última operación en una línea: entrada (todavía adentro) o salida, con su importe.
  const ultimaEsEntrada = !!latestRegistration && estaAdentro(latestRegistration);
  const ultimaIdentidad = latestRegistration
    ? (latestRegistration.ticket?.codeBar || latestRegistration.codeBarTicket
      ? `Ficha ${latestRegistration.ticket?.codeBar ?? latestRegistration.codeBarTicket}`
      : latestRegistration.licensePlateOriginal || latestRegistration.lastNameCustomer || "Sin patente")
    : "";
  const ultimaHora = latestRegistration ? (ultimaEsEntrada ? latestRegistration.entryTime : latestRegistration.departureTime)?.slice(0, 5) : "";

  const horaActual = Number(dayjs(now).tz(TZ).format("H"));
  const saludo = horaActual < 12 ? "Buen día" : horaActual < 20 ? "Buenas tardes" : "Buenas noches";
  const nombre = session.data?.user?.firstName;
  const hoy = dayjs(now).tz(TZ);
  const fechaLarga = `${DIAS[hoy.day()]} ${hoy.date()} ${MESES[hoy.month()]}`;
  const puedeEscanear = isMobile && !!reconocimientoPatentes;
  const accesoTarifas = "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-3.5 text-[13px] font-semibold text-[#D9D1C3] transition-colors hover:border-gm-yellow/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow";
  const lector = barcodeTicketsEnabled && (
    <p role="status" className="flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
      <Barcode className={cn("size-4 shrink-0", isScanning && "text-gm-yellow")} aria-hidden />
      {isScanning ? "Leyendo ticket…" : "Lector de tickets listo: escaneá en cualquier momento."}
    </p>
  );

  const inicio = (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13.5px] text-muted-foreground">
            {saludo}{nombre ? `, ${nombre}` : ""} <span className="text-[#6F665A]">· {fechaLarga}</span>
          </p>
          <div className="flex shrink-0 flex-col items-end">{tour.node}</div>
        </div>
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[40px]">{barcodeTicketsEnabled ? "Tickets y patentes" : "Entradas y salidas"}</h1>
        <div className="flex flex-wrap gap-2">
          <span ref={refVisible('precios')} className="inline-flex">
            <PriceBracketMapDialog brackets={priceBrackets} schedule={schedule} renderTrigger={(abrir) => (
              <button type="button" onClick={abrir} className={accesoTarifas}><Map className="size-4 text-gm-yellow" aria-hidden />Ver tarifas</button>
            )} />
          </span>
          {isAdmin && (
            <Link href="/admin/tarifas" ref={refVisible('admin')} className={accesoTarifas}><Settings className="size-4 text-gm-yellow" aria-hidden />Administrar tarifas</Link>
          )}
        </div>
      </header>

      <InicioHero
        total={total}
        porHora={activosPorHora}
        ahora={now}
        excedidos={excedidos}
        vencidas={overdueDayRegistrations.length}
        turno={TURNO_BAR_ENABLED ? <span ref={refVisible('turno')} className="inline-flex"><TurnoBar variant="pill" /></span> : null}
        onExcedidos={() => irA('vehiculos', 'excedidos')}
        onVencidas={() => irA('vehiculos', 'dia')}
        onZona={() => irA('vehiculos', 'hora')}
      />

      {latestRegistration && (
        <div ref={refVisible('ticket')} className="flex min-h-12 items-center gap-2.5 px-1">
          <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-full", ultimaEsEntrada ? "bg-sky-400/15 text-sky-400" : "bg-emerald-400/15 text-emerald-400")}>
            {ultimaEsEntrada ? <ArrowDownLeft className="size-4" strokeWidth={2.6} aria-hidden /> : <ArrowUpRight className="size-4" strokeWidth={2.6} aria-hidden />}
          </span>
          <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">
            Última {ultimaEsEntrada ? "entrada" : "salida"} <strong className="gm-mono text-foreground">{ultimaIdentidad}</strong> · {ultimaHora}
            {!ultimaEsEntrada && <> · <strong className="gm-mono text-foreground">{formatImporte(latestRegistration.price)}</strong></>}
          </p>
          {receiptDeliveryEnabled && (
            <button type="button" onClick={() => setReceiptTarget({ id: latestRegistration.id, kind: ultimaEsEntrada ? 'ENTRY' : 'EXIT' })} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-gm-yellow">
              Comprobante
            </button>
          )}
        </div>
      )}

      {/* Estadía larga es una operación como entrar o salir: se destaca. Comprobantes es consulta. */}
      <div className={cn("grid gap-2.5", receiptDeliveryEnabled ? "grid-cols-2" : "grid-cols-1")}>
        <button
          type="button"
          ref={refVisible('alta-abono')}
          onClick={abrirEstadia}
          className="group relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-[22px] border-[1.5px] border-gm-yellow/60 bg-gm-yellow/[0.1] p-3.5 text-left transition-colors hover:bg-gm-yellow/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow active:scale-[0.98]"
        >
          <CalendarDays aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 size-20 text-gm-yellow/[0.12]" strokeWidth={1.5} />
          <span className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-full bg-gm-yellow text-gm-ink"><CalendarPlus className="size-5" aria-hidden /></span>
            <ArrowUpRight className="size-[18px] text-gm-yellow transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </span>
          <span className="relative">
            <span className="gm-display block text-[17px] tracking-[0.04em]">Estadía larga</span>
            <span className="block text-xs text-[#D9D1C3]">Por día, semana o mes</span>
          </span>
        </button>
        {receiptDeliveryEnabled && (
          <button
            type="button"
            onClick={() => irA('comprobantes')}
            className="group flex min-h-[104px] flex-col justify-between rounded-[22px] border border-border bg-card p-3.5 text-left transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow active:scale-[0.98]"
          >
            <span className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-full bg-background text-gm-yellow"><Receipt className="size-5" aria-hidden /></span>
              <ChevronRight className="size-[18px] text-[#6F665A] transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
            <span>
              <span className="gm-display block text-[17px] tracking-[0.04em]">Comprobantes</span>
              <span className="block text-xs text-muted-foreground">Historial para reenviar</span>
            </span>
          </button>
        )}
      </div>

      {/* Prepara el acceso sin conexión (pide datos al servidor): una sola vez, en la pantalla que quedó. */}
      {esEscritorio === false && <OfflineConsultation revision={registrations} />}

      <section aria-labelledby="ultimas-entradas" className="flex flex-col gap-2.5">
        <h2 id="ultimas-entradas" className="px-1 text-lg font-bold">Últimas entradas</h2>
        {ultimasEntradas.length ? (
          ultimasEntradas.map((r) => <VehiculoFila key={r.id} r={r} ahora={now} onSelect={(v) => abrirCobro(v.id)} />)
        ) : (
          <p className="rounded-[20px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay vehículos adentro. Tocá Entrada para registrar el primero.
          </p>
        )}
        {total > 0 && (
          <button type="button" onClick={() => irA('vehiculos', 'hora')} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-border text-sm font-bold transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            {total === 1 ? "Ver el vehículo" : `Ver los ${total} vehículos`}
            <ArrowRight className="size-4 text-gm-yellow" aria-hidden />
          </button>
        )}
      </section>
      {lector}
    </div>
  );

  const fichas = barcodeTicketsEnabled && sortedCatalog.length > 0 ? (
    <FichasEnElPlayon
      catalogo={sortedCatalog}
      registros={registrations}
      ahora={now}
      recienEscaneada={justScannedTicketId}
      isAdmin={isAdmin}
      onFicha={(t, r) => setAdvanceTarget({ id: r.id, codeBar: t.codeBar, vehicleType: t.vehicleType, existing: r })}
    />
  ) : null;

  const vehiculos = (
    <TodosLosVehiculos
      activos={activosPorHora}
      ahora={now}
      filtro={filtro}
      onFiltro={setFiltro}
      onSelect={(r) => abrirCobro(r.id)}
      onVolver={() => irA('inicio')}
      diaActivos={activeDayRegistrations}
      diaVencidos={overdueDayRegistrations}
      esDiaVencido={isDayRegistrationOverdue}
      onSelectDia={setOpenDayRegistrationId}
      listaRef={refVisible('occupancy')}
      diaRef={refVisible('abonos')}
      acciones={tour.node}
      fichas={fichas}
    />
  );

  const comprobantes = (
    <div ref={refVisible('comprobantes')} className="flex flex-col gap-4">
      <EncabezadoVista titulo="Comprobantes" onVolver={() => irA('inicio')} acciones={tour.node} />
      <div className="rounded-[20px] border border-border bg-card p-4">
        <DepartureHistory
          barcodeTicketsEnabled={barcodeTicketsEnabled}
          today={dayjs(now).tz(TZ).format('YYYY-MM-DD')}
          registrations={registrations}
          dailyRegistrations={registrationsForDay}
          onReceipt={(id, kind) => setReceiptTarget({ id, kind })}
        />
      </div>
    </div>
  );

  // ── Computadora: mostrador a la izquierda, la playa entera a la derecha ──
  const accesoEscritorio = "inline-flex h-12 shrink-0 items-center gap-2 rounded-[16px] border-[1.5px] border-gm-line-strong bg-card px-4 text-sm font-semibold text-[#D9D1C3] transition-colors hover:border-gm-yellow/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow";
  const escritorio = (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] text-muted-foreground">
            {saludo}{nombre ? `, ${nombre}` : ""} <span className="text-[#6F665A]">· {fechaLarga}</span>
          </p>
          <h1 className="mt-1.5 text-[40px] font-bold leading-[1.05] tracking-tight">{barcodeTicketsEnabled ? "Tickets y patentes" : "Entradas y salidas"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <BuscadorRapido
            inputRef={buscadorRef}
            activos={activosPorHora}
            diaActivos={activeDayRegistrations}
            esDiaVencido={isDayRegistrationOverdue}
            registros={visibleRegistrations}
            ahora={now}
            ticketsHabilitados={barcodeTicketsEnabled}
            comprobantes={receiptDeliveryEnabled}
            atajo={atajos}
            onCobrar={(id) => abrirCobro(id)}
            onAbrirDia={setOpenDayRegistrationId}
            onComprobante={(id, kind) => setReceiptTarget({ id, kind })}
            onEntrada={entrarCon}
          />

          <span ref={refVisible('precios')} className="inline-flex">
            <PriceBracketMapDialog brackets={priceBrackets} schedule={schedule} renderTrigger={(abrir) => (
              <button type="button" onClick={abrir} className={accesoEscritorio}><Map className="size-4 text-gm-yellow" aria-hidden />Ver tarifas</button>
            )} />
          </span>
          {isAdmin && (
            <Link href="/admin/tarifas" ref={refVisible('admin')} className={accesoEscritorio}><Settings className="size-4 text-gm-yellow" aria-hidden />Administrar tarifas</Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[320px_minmax(0,1fr)] items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside aria-label="Mostrador" className="flex min-w-0 flex-col gap-3.5">
          <TarjetaAdentro
            total={total}
            porHora={activosPorHora.length}
            largas={activeDayRegistrations.length}
            excedidos={excedidos}
            vencidas={overdueDayRegistrations.length}
            turno={TURNO_BAR_ENABLED ? <span ref={refVisible('turno')} className="inline-flex"><TurnoBar variant="pill" /></span> : null}
            filtro={filtroTablero}
            onFiltro={setFiltroTablero}
          />
          <AccionesEscritorio
            onEntrada={abrirEntrada}
            onSalida={() => abrirCobro(null)}
            onEstadia={abrirEstadia}
            entradaRef={refVisible('entrada')}
            salidaRef={refVisible('salida')}
            estadiaRef={refVisible('alta-abono')}
            ticketsHabilitados={barcodeTicketsEnabled}
            atajos={atajos}
          />
          <UltimosMovimientos
            refEl={refVisible('ticket')}
            registros={visibleRegistrations}
            ahora={now}
            comprobantes={receiptDeliveryEnabled}
            onComprobante={(id, kind) => setReceiptTarget({ id, kind })}
            onTodos={() => irA('comprobantes')}
          />
          {lector && <div className="px-1">{lector}</div>}
          {esEscritorio === true && <OfflineConsultation revision={registrations} />}
        </aside>

        <TableroPlaya
          tableroRef={refVisible('occupancy')}
          estadiasRef={refVisible('abonos')}
          activos={activosPorHora}
          ahora={now}
          diaActivos={activeDayRegistrations}
          esDiaVencido={isDayRegistrationOverdue}
          filtro={filtroTablero}
          onFiltro={setFiltroTablero}
          onCobrar={(r) => abrirCobro(r.id)}
          onAbrirDia={setOpenDayRegistrationId}
          debajo={fichas}
        />
      </div>
    </div>
  );

  const animacion = cn(
    "animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none",
    direccion === "adelante" ? "slide-in-from-right-8" : "slide-in-from-left-8",
  );

  return (
    <>
      <div ref={arribaRef} />
      {barcodeTicketsEnabled && <ScannerButton hideControls isDialogOpen={isDialogOpen} onScanningChange={setIsScanning} onTicketRegistered={() => router.refresh()} />}

      {esEscritorio !== true && (
        <div className="mx-auto max-w-2xl overflow-x-clip pb-36 lg:hidden">
          <div key={vista} className={animacion}>
            {vista === "inicio" ? inicio : vista === "vehiculos" ? vehiculos : comprobantes}
          </div>
        </div>
      )}

      {/* En la computadora el tablero ya muestra todos los vehículos: no hay vista aparte. */}
      {esEscritorio !== false && (
        <div className="hidden lg:block">
          <div key={vista === "comprobantes" ? "comprobantes" : "tablero"} className={animacion}>
            {vista === "comprobantes" ? <div className="mx-auto max-w-3xl">{comprobantes}</div> : escritorio}
          </div>
        </div>
      )}

      {esEscritorio !== true && (
        <MostradorDock
          onEntrada={abrirEntrada}
          onSalida={() => abrirCobro(null)}
          entradaRef={refVisible('entrada')}
          salidaRef={refVisible('salida')}
          escanear={puedeEscanear ? (
            <ScanPlateAction
              variant="dock"
              onBusyChange={setPlateScanBusy}
              onEntry={(plate) => setEntryScanRequest((previous) => ({ plate, sequence: (previous?.sequence ?? 0) + 1 }))}
              onHourlyExit={(id) => abrirCobro(id)}
              onDailyExit={(registration) => { setScannedDayRegistration(registration); setOpenDayRegistrationId(registration.id); }}
            />
          ) : null}
        />
      )}

      <EntryByPlateDialog
        showTrigger={false}
        openSignal={entradaSignal}
        scanRequest={entryScanRequest}
        onOpenChange={setEntryDialogOpen}
        ticketEntryEnabled={barcodeTicketsEnabled}
        onGoToRegistration={(id) => abrirCobro(id)}
        onTicketRegistered={() => router.refresh()}
      />
      <CreateTicketRegistrationDialog isAdmin={isAdmin} setIsDialogOpen={setDayDialogOpen} showTrigger={false} openSignal={estadiaSignal} />

      {receiptTarget && <ParkingReceiptDelivery registrationId={receiptTarget.id} kind={receiptTarget.kind} showDisabledMessage onDismiss={() => setReceiptTarget(null)} />}

      <AdvancePaymentDialog
        registrationId={advanceTarget?.id ?? null}
        codeBar={advanceTarget?.codeBar}
        vehicleType={advanceTarget?.vehicleType}
        existingRegistration={advanceTarget?.existing ?? null}
        priceBrackets={priceBrackets}
        open={advanceTarget !== null}
        onOpenChange={(open) => !open && setAdvanceTarget(null)}
        onSuccess={() => router.refresh()}
      />

      <ActiveDayTicketDialog
        deliveryEnabled={receiptDeliveryEnabled}
        registration={openDayRegistration}
        open={openDayRegistrationId !== null}
        onOpenChange={(next) => { if (!next) { setOpenDayRegistrationId(null); setScannedDayRegistration(null); } }}
      />

      <CloseTicketPanel
        barcodeTicketsEnabled={barcodeTicketsEnabled}
        open={closePanelOpen}
        initialRegistrationId={closePanelTargetId}
        onAdvance={abrirAnticipo}
        onOpenChange={(open) => {
          setClosePanelOpen(open);
          if (!open) setClosePanelTargetId(null);
        }}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
