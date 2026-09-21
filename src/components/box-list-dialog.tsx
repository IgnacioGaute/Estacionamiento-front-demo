'use client';
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
import { Button } from '@/components/ui/button';
import { BoxList } from '@/types/box-list.type';
import { findBoxByDate } from '@/services/box-lists.service';
import generateBoxList from '@/utils/generate-box-list';
import { useSession } from 'next-auth/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FileText, Printer } from 'lucide-react';
import { es } from 'date-fns/locale';
import { CompactPagination } from '@/components/compact-pagination';

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

export function BoxListDialog({ open, setOpen }: BoxListDialogProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [boxData, setBoxData] = useState<BoxList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnPage, setTurnPage] = useState(0);
  const turns = boxData?.turnosDelDia ?? [];
  const currentTurnPage = Math.min(turnPage, Math.max(0, Math.ceil(turns.length / 3) - 1));
  const requestId = useRef(0);
  const { data: session } = useSession();

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
    try {
      await generateBoxList(boxData, session?.user.email || '');
    } catch (err) {
      console.error(err);
      setError('Error al generar o enviar el PDF.');
    }
  };

  const formattedSelectedDate = dayjs(selectedDate)
    .tz('America/Argentina/Buenos_Aires')
    .format('DD/MM/YYYY');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <FileText className="size-4" />
            </span>
            <div>
              <DialogTitle>Planilla diaria de caja</DialogTitle>
              <DialogDescription className="mt-0.5">
                Consultá los movimientos de una fecha. Imprimir esta planilla no cierra ningún turno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <Calendar
            mode="single"
            locale={es}
            selected={selectedDate}
            onSelect={(day) => { if (day && day <= new Date()) setSelectedDate(day); }}
            disabled={(day) => day > new Date()}
            modifiers={{ today: new Date() }}
            modifiersClassNames={{
              today:    'bg-gm-yellow/20 text-gm-yellow font-bold ring-1 ring-gm-yellow/40',
              selected: 'bg-gm-yellow text-gm-ink font-bold',
            }}
            className="rounded-md border border-border bg-gm-surface-2 p-2 w-full"
            classNames={{
              months:   'w-full',
              month:    'w-full space-y-2',
              caption:  'flex justify-center relative items-center pb-1',
              caption_label: 'text-[13px] font-bold capitalize',
              nav_button_previous: 'absolute left-0',
              nav_button_next: 'absolute right-0',
              table:    'w-full border-collapse',
              head_row: 'grid grid-cols-7',
              head_cell: 'text-[11px] font-medium text-muted-foreground text-center py-1',
              row:      'grid grid-cols-7 mt-0.5',
              cell:     'text-center text-[12.5px] p-0 relative aspect-square flex items-center justify-center',
              day:      'h-8 w-8 p-0 font-normal rounded-md hover:bg-white/[0.08] transition-colors mx-auto flex items-center justify-center',
            }}
          />

          {/* Selected date indicator */}
          <div className="flex items-center justify-between rounded-md border border-border bg-gm-surface-2 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Fecha seleccionada
            </span>
            <span className="gm-mono gm-tnum text-[13px] font-semibold text-foreground">
              {formattedSelectedDate}
            </span>
          </div>

          {boxData && (
            <div className="rounded-md border border-border bg-gm-surface-2 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Efectivo neto del día
              </div>
              <div className="gm-display gm-tnum mt-1 text-[24px] font-bold text-gm-yellow leading-none">
                {ars(boxData.totalPrice)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Entradas menos salidas de efectivo de este día. No incluye el fondo inicial ni los retiros al cerrar: no es el dinero disponible en el cajón.</p>
            </div>
          )}

          {boxData && boxData.turnosDelDia && boxData.turnosDelDia.length > 0 && (
            <div className="rounded-md border border-border bg-gm-surface-2 p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Efectivo del día por turno
              </div>
              {turns.slice(currentTurnPage * 3, (currentTurnPage + 1) * 3).map((t) => (
                <div key={t.turnoId ?? 'sin-turno'} className="flex items-start justify-between gap-3 border-t border-border/60 pt-2 first:border-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-foreground">
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
                Un día puede incluir varios turnos, y un turno puede abarcar varios días. El administrador consulta los cierres en Historial de turnos.
              </p>
            </div>
          )}

          {loading && <p role="status" className="text-sm text-muted-foreground">Cargando movimientos del día…</p>}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-[#F08775]">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          <Button onClick={handlePrintPdf} disabled={!boxData || loading}>
            <Printer className="size-4" />
            Imprimir planilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
