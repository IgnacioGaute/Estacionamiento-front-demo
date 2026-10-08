'use client';
import LatticeLoader from '@/components/ui/lattice-loader';
import { DataLoading } from '@/components/ui/data-loading';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { appCalendarClassNames } from '@/components/app-date-picker';
import * as DateDialog from '@radix-ui/react-dialog';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { BoxList, CobroInquilinoDia } from '@/types/box-list.type';
import { findBoxByDate } from '@/services/box-lists.service';
import generateBoxList from '@/utils/generate-box-list';
import { useSession } from 'next-auth/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Printer, Wallet, Info } from 'lucide-react';
import { getShiftsEnabledAction } from '@/actions/turnos/shifts-enabled.action';
import { CompactPagination } from '@/components/compact-pagination';
import { ResumenCajaNeto } from '@/components/resumen-caja-neto';

dayjs.extend(utc);
dayjs.extend(timezone);

interface BoxListDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);

const hora = (iso: string) =>
  dayjs(iso).tz('America/Argentina/Buenos_Aires').format('HH:mm');

// Lo cobrado a inquilinos en el día, por medio de pago (solo con la sección habilitada). El
// efectivo ya está sumado en el total de arriba; transferencia y MercadoPago no pasan por el cajón.
const MEDIOS_INQUILINOS: { id: CobroInquilinoDia['metodo']; label: string }[] = [
  { id: 'CASH', label: 'Efectivo' },
  { id: 'TRANSFER', label: 'Transferencia' },
  { id: 'MERCADOPAGO', label: 'MercadoPago' },
  { id: 'CHECK', label: 'Cheque' },
];

function CobrosInquilinosDelDia({ cobros }: { cobros: CobroInquilinoDia[] }) {
  const porMedio = MEDIOS_INQUILINOS.map((m) => ({
    ...m,
    total: cobros.filter((c) => c.metodo === m.id).reduce((s, c) => s + c.monto, 0),
  })).filter((m) => m.total !== 0 || m.id === 'CASH' || m.id === 'TRANSFER');
  const recibos = new Set(cobros.filter((c) => c.tipo === 'PAGO').map((c) => c.numero ?? c.id)).size;
  const total = cobros.reduce((s, c) => s + c.monto, 0);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Cobros a inquilinos</div>
        <div className="text-[11px] text-muted-foreground">
          {recibos ? `${recibos} ${recibos === 1 ? 'recibo' : 'recibos'} · ${ars(total)}` : 'Sin cobros en el día'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {porMedio.map((m) => (
          <div key={m.id} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
            <div className="text-[11px] text-muted-foreground">{m.label}</div>
            <div className="gm-mono gm-tnum mt-0.5 text-[14px] font-semibold text-foreground">{ars(m.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoxListDialog({ open, setOpen }: BoxListDialogProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [boxData, setBoxData] = useState<BoxList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shiftsEnabled, setShiftsEnabled] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [turnPage, setTurnPage] = useState(0);
  const turns = boxData?.turnosDelDia ?? [];
  const currentTurnPage = Math.min(turnPage, Math.max(0, Math.ceil(turns.length / 3) - 1));
  const requestId = useRef(0);
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setShiftsEnabled(false);
    getShiftsEnabledAction().then(enabled => {
      if (active) setShiftsEnabled(enabled);
    }).catch(() => { if (active) setShiftsEnabled(false); });
    return () => { active = false; };
  }, [open, session?.token]);

  const fetchData = async (date: Date) => {
    const id = ++requestId.current;
    setLoading(true);
    setTurnPage(0);
    setBoxData(null);
    setError(null);
    try {
      const formattedDay = dayjs(date)
        .tz('America/Argentina/Buenos_Aires')
        .format('YYYY-MM-DD');
      const response = await findBoxByDate(formattedDay, session?.token);
      if (id !== requestId.current) return;
      if (!response || !response.data) {
        setError('No hay datos disponibles para la fecha seleccionada.');
        setBoxData(null);
      } else {
        setError(null);
        setBoxData(response.data);
      }
    } catch (err) {
      if (id !== requestId.current) return;
      console.error(err);
      setError('Ocurrió un error al obtener los datos.');
      setBoxData(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchData(selectedDate);
    return () => { requestId.current++; };
  }, [open, selectedDate, session?.token]);


  const handlePrintPdf = async () => {
    if (!boxData) {
      setError('No hay datos disponibles para generar el PDF.');
      return;
    }
    setPrinting(true);
    try {
      await generateBoxList(boxData, session?.user.email || '');
    } catch (err) {
      console.error(err);
      setError('Error al generar o enviar el PDF.');
    } finally {
      setPrinting(false);
    }
  };

  const dateKey = dayjs(selectedDate).format('YYYY-MM-DD');
  const todayKey = dayjs().format('YYYY-MM-DD');
  const dateLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate);

  const formattedSelectedDate = dayjs(selectedDate)
    .tz('America/Argentina/Buenos_Aires')
    .format('DD/MM/YYYY');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <FileText className="size-4" />
            </span>
            <div>
              <DialogTitle>Planilla diaria de caja</DialogTitle>
              <DialogDescription className="mt-0.5">
                Efectivo, cobros digitales y comisiones estimadas de la fecha que elijas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/20 p-3">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" aria-label="Día anterior" onClick={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').toDate())}><ChevronLeft className="size-4" /></Button>
              <DateDialog.Root open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <DateDialog.Trigger asChild>
                  <Button variant="outline" aria-label={`Cambiar fecha: ${formattedSelectedDate}`} className="h-11 gap-3 rounded-xl bg-background px-4 font-semibold tabular-nums">
                    <CalendarDays className="size-4 text-gm-yellow" />{formattedSelectedDate}
                  </Button>
                </DateDialog.Trigger>
                <DateDialog.Portal>
                  <DateDialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
                  <DateDialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[71] w-[292px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl focus:outline-none">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2"><DateDialog.Title className="text-sm font-semibold">Fecha de la planilla</DateDialog.Title><DateDialog.Close className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-gm-yellow">Cerrar</DateDialog.Close></div>
                  <Calendar
                    mode="single" locale={es} weekStartsOn={1} initialFocus
                    selected={selectedDate} defaultMonth={selectedDate} toMonth={new Date()}
                    disabled={{ after: new Date() }}
                    onSelect={date => { if (date) { setSelectedDate(dayjs(date).hour(12).toDate()); setDatePickerOpen(false); } }}
                    className="p-3"
                    classNames={appCalendarClassNames}
                  />
                  <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-4 py-2"><span className="text-xs text-muted-foreground">Hasta el día de hoy</span><Button size="sm" variant="ghost" className="text-gm-yellow" onClick={() => { setSelectedDate(new Date()); setDatePickerOpen(false); }}>Ir a hoy</Button></div>
                  </DateDialog.Content>
                </DateDialog.Portal>
              </DateDialog.Root>
              <Button size="icon" variant="ghost" aria-label="Día siguiente" disabled={dateKey >= todayKey} onClick={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').toDate())}><ChevronRight className="size-4" /></Button>
            </div>
            <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
              {[{ label: 'Hoy', days: 0 }, { label: 'Ayer', days: 1 }].map(item => <Button key={item.label} size="sm" aria-pressed={dateKey === dayjs().subtract(item.days, 'day').format('YYYY-MM-DD')} variant={dateKey === dayjs().subtract(item.days, 'day').format('YYYY-MM-DD') ? 'default' : 'ghost'} className="rounded-lg px-5" onClick={() => setSelectedDate(dayjs().subtract(item.days, 'day').toDate())}>{item.label}</Button>)}
            </div>
          </div>
          <section className="min-w-0 space-y-4" aria-busy={loading} aria-label="Resumen de caja">
          {boxData && (
            <div key={dateKey} className="overflow-hidden rounded-2xl border border-border bg-background/40 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumen diario</p><h3 className="mt-1 text-base font-semibold capitalize">{dateLabel}</h3></div>
                <span className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 font-mono text-xs text-muted-foreground">{formattedSelectedDate}</span>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-gm-yellow/10 via-transparent to-transparent px-5 py-7 sm:px-6 sm:py-9">
                <Wallet aria-hidden className="pointer-events-none absolute -right-4 top-3 size-36 -rotate-12 text-gm-yellow/[0.04]" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><span className="size-2 rounded-full bg-gm-yellow" /> Efectivo neto del día</div>
                  <p className="mt-4 break-words text-4xl font-bold tracking-tight text-foreground tabular-nums sm:text-5xl">{ars(boxData.totalPrice)}</p>
                  <p className="mt-3 text-sm text-muted-foreground">Entradas menos salidas · Pesos argentinos</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-dashed border-border bg-secondary/15 px-5 py-4 sm:px-6">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">Este total resume el movimiento de efectivo de la fecha; no representa el saldo disponible en el cajón.{shiftsEnabled && ' No incluye el fondo inicial ni los retiros al cerrar el turno.'}</p>
              </div>
              {boxData.resumenCaja && <ResumenCajaNeto resumen={boxData.resumenCaja} />}
            </div>
          )}

          {boxData && Array.isArray(boxData.cobrosInquilinos) && (
            <CobrosInquilinosDelDia cobros={boxData.cobrosInquilinos} />
          )}

          {shiftsEnabled && boxData && boxData.turnosDelDia && boxData.turnosDelDia.length > 0 && (
            <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Efectivo del día por turno
              </div>
              {turns.slice(currentTurnPage * 3, (currentTurnPage + 1) * 3).map((t) => (
                <div key={t.turnoId ?? 'sin-turno'} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {t.turno
                        ? `${t.turno.nombre} · ${t.turno.usuarioApertura ? `${t.turno.usuarioApertura.firstName} ${t.turno.usuarioApertura.lastName}` : 'Operador no disponible'}`
                        : 'Sin turno asignado'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {hora(t.desde)} – {hora(t.hasta)} · {t.movimientos} {t.movimientos === 1 ? 'movimiento' : 'movimientos'}
                      {t.abarcaOtrosDias && ' · abarca otras fechas'}
                    </div>
                  </div>
                  <div className="gm-mono gm-tnum shrink-0 text-[13px] font-semibold text-foreground">
                    {ars(t.efectivoDelDia)}
                  </div>
                </div>
              ))}
              <CompactPagination page={currentTurnPage} total={turns.length} pageSize={3} onChange={setTurnPage} />
              <p className="border-t border-border/60 pt-2 text-[11px] leading-snug text-muted-foreground">
                Un día puede incluir varios turnos, y un turno puede abarcar varios días. El administrador consulta los cierres en Caja → Turnos e historial.
              </p>
            </div>
          )}

          {loading && <DataLoading label="Cargando planilla…" />}
          {error && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-[#F08775]">
              {error}
            </div>
          )}
          </section>
        </div>

        <DialogFooter className="mt-1 gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          <Button onClick={handlePrintPdf} disabled={!boxData || loading || printing}>
            {printing ? <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} /> : <Printer className="size-4" />}
            {printing ? 'Preparando PDF…' : 'Imprimir planilla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
