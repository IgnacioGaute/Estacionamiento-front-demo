'use client';

// Comprobantes: las estadías del día con su comprobante de entrada y, si ya salieron, el de salida,
// para reenviarlos o imprimirlos. Mismo lenguaje que Movimientos (filtros-historial.tsx): buscador,
// el día en un toque (Hoy · Ayer · Otro día) y el estado con su cantidad (Todas · En la playa ·
// Salieron). Cada estadía muestra la chapa, cuándo entró y salió y quién lo registró.

import { useContext, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { CalendarDays, Receipt, ReceiptText, Search } from 'lucide-react';
import { receiptHistoryAction, type ConteoComprobantes, type FilaComprobante } from '@/actions/tickets/receipt-history.action';
import { AppDatePicker } from '@/components/app-date-picker';
import { PlateChip } from '@/components/plate-chip';
import { VehicleTypeLabelsContext } from '@/components/vehicle-type-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComprobantesCargando } from './cargando';
import { BuscadorHistorial, ChipFiltro, EstadoVacio, Segmentado, VerMas } from './filtros-historial';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';

dayjs.extend(utc);
dayjs.extend(timezone);
const enfoque = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';
const diaLegible = (dia: string) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(dayjs(dia).toDate());

type Dia = 'HOY' | 'AYER' | 'OTRO';
type Estado = 'TODAS' | 'ADENTRO' | 'SALIO';

export function DepartureHistory({ registrations, dailyRegistrations, onReceipt, today, barcodeTicketsEnabled = true }: {
  today: string;
  barcodeTicketsEnabled?: boolean;
  registrations: TicketRegistration[];
  dailyRegistrations: TicketRegistrationForDay[];
  onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void;
}) {
  const tiposVehiculo = useContext(VehicleTypeLabelsContext);
  const [dia, setDia] = useState<Dia>('HOY');
  const [otroDia, setOtroDia] = useState(today);
  const ayer = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD');
  const date = dia === 'HOY' ? today : dia === 'AYER' ? ayer : otroDia;
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState<Estado>('TODAS');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<FilaComprobante[]>([]);
  const [total, setTotal] = useState(0);
  const [conteo, setConteo] = useState<ConteoComprobantes | null>(null);
  // Arranca cargando: si no, el primer cuadro mostraba «No hay comprobantes» antes de la consulta.
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  // Una entrada o salida nueva vuelve a pedir la primera página.
  useEffect(() => { setRecarga((n) => n + 1); }, [registrations, dailyRegistrations]);

  const clave = `${date}|${query}|${estado}|${recarga}`;
  const claveRef = useRef(clave);
  useEffect(() => {
    if (claveRef.current !== clave) {
      claveRef.current = clave;
      if (page !== 1) { setPage(1); return; }
    }
    let vigente = true;
    setPending(true);
    const timer = setTimeout(() => {
      receiptHistoryAction(date, query, page, estado === 'TODAS' ? undefined : estado).then((result) => {
        if (!vigente) return;
        setTotal(result.meta.totalItems);
        if (result.conteo) setConteo(result.conteo);
        setRows((previas) => page === 1 ? result.data : [...previas, ...result.data.filter((r) => !previas.some((p) => p.id === r.id))]);
        setError('');
      }).catch(() => { if (vigente) { if (page === 1) setRows([]); setError('No se pudieron cargar los comprobantes.'); } })
        .finally(() => { if (vigente) setPending(false); });
    }, page === 1 ? 250 : 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [clave, date, query, estado, page]);

  const nombreVehiculo = (code?: string | null) => {
    if (!code) return null;
    const conocido = tiposVehiculo.find((t) => t.code === code)?.name;
    if (conocido) return conocido;
    const texto = code.replace(/_/g, ' ').toLocaleLowerCase('es-AR');
    return texto.charAt(0).toLocaleUpperCase('es-AR') + texto.slice(1);
  };
  const conFiltro = !!query.trim() || estado !== 'TODAS';

  return (
    <section aria-label="Comprobantes" className="min-w-0 space-y-4">
      <div className="space-y-3 rounded-[22px] border border-gm-line bg-card p-3 sm:p-4">
        <BuscadorHistorial value={query} onChange={setQuery} etiqueta="Buscar comprobantes"
          placeholder={barcodeTicketsEnabled ? 'Buscar patente, ticket o apellido' : 'Buscar patente o apellido'} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmentado etiqueta="Día" valor={dia} onChange={setDia} opciones={[
            { id: 'HOY', texto: 'Hoy' }, { id: 'AYER', texto: 'Ayer' },
            { id: 'OTRO', texto: <><CalendarDays className="size-4" aria-hidden />Otro día</> },
          ]} />
          {dia === 'OTRO' && (
            <AppDatePicker value={otroDia} title="Fecha de comprobantes" max={today} onChange={setOtroDia} trigger={
              <button type="button" className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border-[1.5px] border-gm-line-strong px-3 text-sm font-semibold hover:border-gm-yellow/50', enfoque)}>
                <span className="text-muted-foreground">Día</span><span className="gm-mono">{diaLegible(otroDia)}</span>
              </button>
            } />
          )}
          <div className="hidden flex-1 sm:block" />
          <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
            <ChipFiltro activo={estado === 'TODAS'} onClick={() => setEstado('TODAS')} cuenta={conteo?.todas}>Todas</ChipFiltro>
            <ChipFiltro activo={estado === 'ADENTRO'} onClick={() => setEstado(estado === 'ADENTRO' ? 'TODAS' : 'ADENTRO')} cuenta={conteo?.adentro}>En la playa</ChipFiltro>
            <ChipFiltro activo={estado === 'SALIO'} onClick={() => setEstado(estado === 'SALIO' ? 'TODAS' : 'SALIO')} cuenta={conteo?.salieron}>Salieron</ChipFiltro>
          </div>
        </div>
      </div>

      {pending && !rows.length ? <ComprobantesCargando />
        : error && !rows.length ? <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error}</p>
        : !rows.length ? (
          conFiltro ? (
            <EstadoVacio icono={<Search className="size-7" />} titulo="No hay comprobantes con esta búsqueda" texto={dia === 'HOY' ? 'Hoy' : diaLegible(date)}>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => { setQuery(''); setEstado('TODAS'); }}>Quitar filtros</Button>
            </EstadoVacio>
          ) : (
            <EstadoVacio icono={<ReceiptText className="size-7" />} titulo={dia === 'HOY' ? 'Todavía no hay comprobantes hoy' : 'No hay comprobantes de ese día'}
              texto="Cada entrada y salida deja su comprobante para reenviarlo o imprimirlo.">
              {dia === 'HOY' && <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => setDia('AYER')}>Ver ayer</Button>}
            </EstadoVacio>
          )
        ) : (
          <ul className={cn('space-y-2.5 transition-opacity', pending && page === 1 && 'opacity-60')} aria-busy={pending}>
            {rows.map((row) => <FilaDeComprobante key={row.id} row={row} vehiculo={nombreVehiculo(row.vehicleType)} onReceipt={onReceipt} />)}
          </ul>
        )}
      {error && rows.length > 0 && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <VerMas mostrando={rows.length} total={total} cargando={pending && page > 1} onClick={() => setPage((p) => p + 1)} />
    </section>
  );
}

function FilaDeComprobante({ row, vehiculo, onReceipt }: { row: FilaComprobante; vehiculo: string | null; onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void }) {
  const pase = row.type !== 'Por hora';
  const modalidad = pase ? 'día, semana o mes' : 'por hora';
  const titulo = vehiculo ? `${vehiculo} · ${modalidad}` : modalidad.charAt(0).toUpperCase() + modalidad.slice(1);
  // Las respuestas de versiones anteriores del servidor solo traen `time` (la última hora).
  const entrada = row.entryTime ?? (row.departed ? null : row.time?.slice(0, 5));
  const salida = row.exitTime ?? (row.departed ? row.time?.slice(0, 5) : null);
  const estado = row.departed
    ? <span className="inline-flex h-6 items-center rounded-full bg-gm-surface-2 px-2.5 text-xs font-bold text-gm-texto-2">{pase ? 'Se retiró' : 'Salió'}</span>
    : <span className="inline-flex h-6 items-center rounded-full bg-sky-400/[0.14] px-2.5 text-xs font-bold text-sky-300">En la playa</span>;
  return (
    <li className="grid grid-cols-1 gap-3 rounded-[18px] border border-gm-line bg-card p-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-[18px] sm:px-4">
      <div className="flex items-center justify-between gap-3 sm:contents">
        {row.patente ? <PlateChip plate={row.patente} size="md" /> : <span className="gm-mono min-w-[124px] text-base font-bold">{row.identification}</span>}
        <span className="sm:hidden">{estado}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold">{titulo}</span>
          <span className="hidden sm:inline-flex">{estado}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
          <span>Entró {entrada && <strong className="gm-mono font-bold text-gm-texto-2">{entrada}</strong>} · {row.entryOperatorName || 'operador no registrado'}</span>
          {row.departed && <>
            <span aria-hidden className="text-gm-line-strong">→</span>
            <span>{pase ? 'Se retiró' : 'Salió'} {salida && <strong className="gm-mono font-bold text-gm-texto-2">{salida}</strong>} · {row.exitOperatorName || 'operador no registrado'}</span>
          </>}
        </div>
      </div>
      <div className={cn('grid gap-2 border-t border-gm-line pt-3 sm:flex sm:border-0 sm:pt-0', row.departed ? 'grid-cols-2' : 'grid-cols-1')}>
        <button type="button" onClick={() => onReceipt(row.id, 'ENTRY')} aria-label={`Abrir comprobante de entrada de ${row.identification}`}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-gm-line-strong px-3.5 text-sm font-semibold transition-colors hover:border-gm-yellow/50', enfoque)}>
          <ReceiptText className="size-4 text-gm-yellow" aria-hidden />Entrada
        </button>
        {row.departed && (
          <button type="button" onClick={() => onReceipt(row.id, 'EXIT')} aria-label={`Abrir comprobante de salida de ${row.identification}`}
            className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gm-yellow px-3.5 text-sm font-bold text-gm-ink transition-colors hover:bg-gm-yellow-deep', enfoque)}>
            <Receipt className="size-4" aria-hidden />Salida
          </button>
        )}
      </div>
    </li>
  );
}
