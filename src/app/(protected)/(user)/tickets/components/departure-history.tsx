'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { receiptHistoryAction } from '@/actions/tickets/receipt-history.action';
import { CompactPagination } from '@/components/compact-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatedScrollList } from '@/components/animated-scroll-list';
import { ReceiptText } from 'lucide-react';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';

dayjs.extend(utc);
dayjs.extend(timezone);
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const PAGE_SIZE = 20;

export function DepartureHistory({ registrations, dailyRegistrations, onReceipt, today, barcodeTicketsEnabled = true }: {
  today: string;
  barcodeTicketsEnabled?: boolean;
  registrations: TicketRegistration[];
  dailyRegistrations: TicketRegistrationForDay[];
  onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedDate, setDate] = useState<string | null>(null);
  const date = selectedDate ?? today;
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<{ id: string; identification: string; type: string; departed: boolean; time: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setPending(true);
    const timer = setTimeout(() => {
      receiptHistoryAction(date, query, page + 1).then(result => {
        if (!current) return;
        setRows(result.data); setTotal(result.meta.totalItems); setError('');
      }).catch(() => { if (current) { setRows([]); setError('No se pudieron cargar los comprobantes.'); } })
        .finally(() => { if (current) setPending(false); });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [date, query, page, registrations, dailyRegistrations]);

  return <section aria-label="Comprobantes" className="min-w-0 space-y-3">
      {/* En el celular van apilados: el campo de fecha nativo no se achica por debajo de su ancho
          mínimo, así que al lado del botón lo empujaba fuera de la pantalla. */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground"><span>Fecha de entrada o salida</span><Input aria-label="Fecha de comprobantes" className="min-w-0 w-full" type="date" value={date} onChange={e => { setDate(e.target.value || null); setPage(0); }} /></label>
        <Button variant="outline" className="w-full shrink-0 sm:w-auto" aria-pressed={date === today} onClick={() => { setDate(null); setPage(0); }}>Hoy</Button>
      </div>
      <div className="grid gap-3">
        <label className="space-y-1 text-xs text-muted-foreground"><span>{barcodeTicketsEnabled ? 'Patente, ticket o apellido' : 'Patente o apellido'}</span><Input value={query} placeholder="Buscar comprobantes…" onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{pending ? 'Cargando…' : total} estadías · {date === today ? 'Hoy' : date.split('-').reverse().join('/')}</p>
      <AnimatedScrollList key={`${date}-${query}`} label="Comprobantes: desplazá para ver más">
        {rows.map(row => <div key={row.id} className="min-w-0 rounded-xl border border-border bg-secondary/40 p-3 transition-colors hover:border-gm-yellow/40 hover:bg-gm-yellow/5">
          <div className="flex min-w-0 items-start gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gm-yellow/10 text-gm-yellow"><ReceiptText className="size-4" /></span><div className="min-w-0 flex-1"><p className="break-words text-base font-semibold leading-tight tracking-wide">{row.identification}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{row.type}</p></div></div>
          <p className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground"><span>{row.departed ? 'Salida registrada' : 'En la playa'}</span>{row.time && <span className="tabular-nums">{row.time}</span>}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
            <Button variant="ghost" size="sm" className="min-h-10 w-full min-w-0 rounded-lg bg-background/40 text-xs text-gm-yellow hover:bg-gm-yellow/10" onClick={() => onReceipt(row.id, 'ENTRY')} aria-label={`Abrir comprobante de entrada de ${row.identification}`}>Entrada</Button>
            {row.departed && <Button variant="ghost" size="sm" className="min-h-10 w-full min-w-0 rounded-lg bg-background/40 text-xs text-gm-yellow hover:bg-gm-yellow/10" onClick={() => onReceipt(row.id, 'EXIT')} aria-label={`Abrir comprobante de salida de ${row.identification}`}>Salida</Button>}
          </div>
        </div>)}
      </AnimatedScrollList>
      {!pending && !error && rows.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No hay comprobantes para esta fecha y búsqueda.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!pending && <CompactPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />}
  </section>;
}
