'use client';

// Movimientos: todo lo que pasó en la playa, guardado en el servidor, con filtros y paginación en
// la consulta (no es el tablero ampliado). Se abre con «Ver movimientos» desde Últimos movimientos y usa
// el mismo lenguaje que Comprobantes. Cada renglón abre el detalle de la operación: cobros con lo
// que entregó el cliente y el vuelto, ajustes, comprobantes y el historial de cambios, con
// «Corregir» y, para administración, la revisión de las correcciones pendientes.
//
// Un operador ve sus operaciones (como en la planilla); administración, las de toda la playa.

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, CalendarRange, ChevronRight, Clock3, Coins, PencilLine, Receipt, SlidersHorizontal, Undo2, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { formatImporte } from '@/components/pricing-breakdown';
import { AppDatePicker } from '@/components/app-date-picker';
import { AnimatedScrollList } from '@/components/animated-scroll-list';
import { CompactPagination } from '@/components/compact-pagination';
import { DataLoading } from '@/components/ui/data-loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { detalleOperacionAction, historialMovimientosAction, resolverCorreccionAction } from '@/actions/operaciones/operaciones.action';
import { getCashContextAction, getOperadoresAction } from '@/actions/turnos/cash-context.action';
import type {
  Correccion, DetalleOperacion, EstadoCorreccionFiltro, FiltrosHistorial, MedioHistorial, MovimientoHistorial, TipoMovimientoHistorial,
} from '@/types/operaciones.type';
import { ComprobantesCargando } from './cargando';
import { CorregirRegistro, horaDe, MEDIO, TIPOS_CORRECCION, type OperacionACorregir, type VehiculoAdentro } from './corregir-registro';

const PAGE_SIZE = 20;
const TZ = 'America/Argentina/Buenos_Aires';

const TIPO: Record<TipoMovimientoHistorial, string> = {
  ENTRADA: 'Entrada', SALIDA: 'Salida', ANTICIPO: 'Anticipo', COBRO_PARCIAL: 'Cobro parcial', DEVOLUCION: 'Devolución', PASE: 'Estadía larga', CORRECCION: 'Corrección',
};
const ICONO: Record<TipoMovimientoHistorial, typeof Wallet> = {
  ENTRADA: ArrowDownLeft, SALIDA: ArrowUpRight, ANTICIPO: Wallet, COBRO_PARCIAL: Coins, DEVOLUCION: Undo2, PASE: CalendarDays, CORRECCION: PencilLine,
};
const ESTADO_FILTRO: Record<Exclude<EstadoCorreccionFiltro, 'SIN'>, { texto: string; clase: string }> = {
  CORREGIDA: { texto: 'Corregida', clase: 'border-gm-yellow/40 text-gm-yellow' },
  PENDIENTE: { texto: 'En revisión', clase: 'border-gm-orange/50 text-gm-orange' },
  RECHAZADA: { texto: 'Rechazada', clase: 'border-border text-muted-foreground' },
};
const ESTADO_CORRECCION: Record<Correccion['estado'], { texto: string; clase: string }> = {
  APLICADA: { texto: 'Aplicada', clase: 'border-gm-ok/40 text-gm-ok' },
  PENDIENTE: { texto: 'Pendiente', clase: 'border-gm-orange/50 text-gm-orange' },
  RECHAZADA: { texto: 'Rechazada', clase: 'border-border text-muted-foreground' },
};

const fechaCorta = (fecha: string) => new Date(fecha).toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'short' });
const fechaHora = (fecha: string) => `${fechaCorta(fecha)} ${horaDe(fecha)}`;
const diaLegible = (dia: string) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(dayjs(dia).toDate());
const textoMedios = (medios: MovimientoHistorial['medios']) =>
  Object.entries(medios ?? {}).filter(([, n]) => n).map(([m, n]) => `${MEDIO[m] ?? m} ${formatImporte(n!)}`).join(' · ');
const selectClase = 'h-10 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';

function Insignia({ texto, clase }: { texto: string; clase: string }) {
  return <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold', clase)}>{texto}</span>;
}

export function MovimientosHistorial({ today, isAdmin, turnos, cobro, comprobantes, barcodeTicketsEnabled = true, adentro, revision, onReceipt }: {
  today: string;
  isAdmin: boolean;
  // Turnos activos: ofrece «Mi turno» (y arranca ahí si hay uno abierto).
  turnos: boolean;
  // Playa con cobro: filtros de medio. En la modalidad gratuita no hay plata.
  cobro: boolean;
  comprobantes: boolean;
  barcodeTicketsEnabled?: boolean;
  adentro: VehiculoAdentro[];
  // Cambia con cada entrada o salida: la lista se vuelve a pedir.
  revision?: unknown;
  onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void;
}) {
  const [desde, setDesde] = useState(today);
  const [hasta, setHasta] = useState(today);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoHistorial | ''>('');
  const [medio, setMedio] = useState<MedioHistorial | ''>('');
  const [correccion, setCorreccion] = useState<EstadoCorreccionFiltro | ''>('');
  const [operadorId, setOperadorId] = useState('');
  const [operadores, setOperadores] = useState<{ id: string; nombre: string }[]>([]);
  const [miTurnoId, setMiTurnoId] = useState<string | null>(null);
  const [miTurno, setMiTurno] = useState(false);
  // Con turnos, se espera saber si hay uno propio abierto: arranca en «Mi turno» sin una carga previa de todo el día.
  const [contextoListo, setContextoListo] = useState(!turnos);
  const [verFiltros, setVerFiltros] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<MovimientoHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [abierta, setAbierta] = useState<OperacionACorregir | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<OperacionACorregir | null>(null);

  useEffect(() => {
    if (!turnos) return;
    let vigente = true;
    getCashContextAction().then((r) => {
      if (!vigente) return;
      const id = r.context?.active?.id ?? null;
      setMiTurnoId(id);
      setMiTurno(!!id);
    }).catch(() => undefined).finally(() => { if (vigente) setContextoListo(true); });
    return () => { vigente = false; };
  }, [turnos]);

  useEffect(() => {
    if (!isAdmin || !turnos) return;
    getOperadoresAction().then((r) => {
      if (r.operadores) setOperadores(r.operadores.map((u) => ({ id: u.id, nombre: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'Sin nombre' })));
    }).catch(() => undefined);
  }, [isAdmin, turnos]);

  const filtros: FiltrosHistorial = useMemo(() => ({
    desde, hasta: hasta < desde ? desde : hasta, q: q.trim() || undefined, tipo: tipo || undefined, medio: medio || undefined,
    correccion: correccion || undefined, operadorId: operadorId || undefined, turnoId: miTurno && miTurnoId ? miTurnoId : undefined, page: page + 1,
  }), [desde, hasta, q, tipo, medio, correccion, operadorId, miTurno, miTurnoId, page]);

  useEffect(() => {
    if (!contextoListo) return;
    let vigente = true;
    setPending(true);
    const timer = setTimeout(() => {
      historialMovimientosAction(filtros).then((r) => {
        if (!vigente) return;
        if (r.error !== undefined) { setRows([]); setTotal(0); setError(r.error); return; }
        setRows(r.data.data); setTotal(r.data.meta.totalItems); setError('');
      }).finally(() => { if (vigente) setPending(false); });
    }, 250);
    return () => { vigente = false; clearTimeout(timer); };
  }, [filtros, contextoListo, revision, recarga]);

  const cambiar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };
  const extras = [tipo, medio, correccion, operadorId].filter(Boolean).length;
  const rango = desde === hasta ? (desde === today ? 'Hoy' : diaLegible(desde)) : `${diaLegible(desde)} – ${diaLegible(hasta)}`;
  const variosDias = desde !== hasta;

  const abrir = (row: MovimientoHistorial) => {
    if (row.paseId) setAbierta({ tipo: 'PASE', id: row.paseId });
    else if (row.registrationId) setAbierta({ tipo: 'ESTADIA', id: row.registrationId });
  };

  return (
    <section aria-label="Movimientos" className="min-w-0 space-y-3">
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-secondary/20 p-2">
        <AppDatePicker value={desde} title="Desde" max={today} onChange={(v) => { setDesde(v); if (v > hasta) setHasta(v); setPage(0); }} trigger={
          <Button type="button" size="icon" variant="outline" aria-label="Elegir desde qué fecha" className="size-10 shrink-0 rounded-lg border-gm-yellow/30 text-gm-yellow hover:bg-gm-yellow/10"><CalendarDays className="size-4" /></Button>
        } />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Fecha</p>
          <p className="truncate text-sm font-semibold tabular-nums">{rango}</p>
        </div>
        <AppDatePicker value={hasta} title="Hasta" min={desde} max={today} onChange={(v) => { setHasta(v); setPage(0); }} trigger={
          <Button type="button" variant="ghost" size="sm" aria-label="Elegir hasta qué fecha" className="shrink-0 gap-1.5"><CalendarRange className="size-4" />Hasta</Button>
        } />
        {(desde !== today || hasta !== today) && <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => { setDesde(today); setHasta(today); setPage(0); }}>Hoy</Button>}
      </div>

      <label className="block space-y-1 text-xs text-muted-foreground">
        <span>{barcodeTicketsEnabled ? 'Patente, ticket o apellido' : 'Patente o apellido'}</span>
        <Input value={q} placeholder="Buscar movimientos…" onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {miTurnoId && (
          <button type="button" aria-pressed={miTurno} onClick={() => { setMiTurno(!miTurno); setPage(0); }}
            className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
              miTurno ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong hover:border-gm-yellow/40')}>
            <Clock3 className="size-3.5" aria-hidden />Mi turno
          </button>
        )}
        <button type="button" aria-expanded={verFiltros} onClick={() => setVerFiltros(!verFiltros)}
          className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
            extras ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong hover:border-gm-yellow/40')}>
          <SlidersHorizontal className="size-3.5" aria-hidden />Filtros{extras ? ` · ${extras}` : ''}
        </button>
        {extras > 0 && (
          <button type="button" className="min-h-9 px-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => { setTipo(''); setMedio(''); setCorreccion(''); setOperadorId(''); setPage(0); }}>Quitar filtros</button>
        )}
      </div>

      {verFiltros && (
        <div className="grid gap-2 rounded-xl border border-border bg-secondary/20 p-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-muted-foreground"><span>Tipo</span>
            <select className={selectClase} value={tipo} onChange={(e) => cambiar(setTipo)(e.target.value as TipoMovimientoHistorial | '')}>
              <option value="">Todos</option>
              {(Object.keys(TIPO) as TipoMovimientoHistorial[]).filter((t) => cobro || ['ENTRADA', 'SALIDA', 'CORRECCION'].includes(t)).map((t) => <option key={t} value={t}>{TIPO[t]}</option>)}
            </select>
          </label>
          {cobro && (
            <label className="space-y-1 text-xs text-muted-foreground"><span>Medio de pago</span>
              <select className={selectClase} value={medio} onChange={(e) => cambiar(setMedio)(e.target.value as MedioHistorial | '')}>
                <option value="">Todos</option>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="MERCADOPAGO">Mercado Pago (QR)</option>
              </select>
            </label>
          )}
          <label className="space-y-1 text-xs text-muted-foreground"><span>Correcciones</span>
            <select className={selectClase} value={correccion} onChange={(e) => cambiar(setCorreccion)(e.target.value as EstadoCorreccionFiltro | '')}>
              <option value="">Todas</option>
              <option value="CORREGIDA">Corregidas</option>
              <option value="PENDIENTE">En revisión</option>
              <option value="RECHAZADA">Rechazadas</option>
              <option value="SIN">Sin correcciones</option>
            </select>
          </label>
          {isAdmin && operadores.length > 0 && (
            <label className="space-y-1 text-xs text-muted-foreground"><span>Operador</span>
              <select className={selectClase} value={operadorId} onChange={(e) => cambiar(setOperadorId)(e.target.value)}>
                <option value="">Todos</option>
                {operadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <p role="status" className="text-xs text-muted-foreground">
        {pending ? '…' : total} movimientos · {rango}{miTurno && miTurnoId ? ' · Mi turno' : ''}
      </p>

      <AnimatedScrollList key={JSON.stringify({ ...filtros, page: 0 })} label="Movimientos: desplazá para ver más">
        {pending && !rows.length ? <ComprobantesCargando /> : pending ? <DataLoading label="Cargando movimientos…" /> : rows.map((row) => {
          const Icono = ICONO[row.tipo];
          const plata = row.importe != null && row.importe !== 0;
          const titulo = row.tipo === 'PASE' ? `${TIPO.PASE} · ${(row.detalle ?? '').toLowerCase()}`
            : row.tipo === 'CORRECCION' ? `${TIPO.CORRECCION} · ${TIPOS_CORRECCION[row.detalle as keyof typeof TIPOS_CORRECCION]?.titulo.toLowerCase() ?? ''}`
              : row.tipo === 'DEVOLUCION' && row.detalle ? `${TIPO.DEVOLUCION} · ${row.detalle}` : TIPO[row.tipo];
          const estado = row.correccion ? (row.tipo === 'CORRECCION' && row.correccion === 'CORREGIDA' ? { texto: 'Aplicada', clase: ESTADO_CORRECCION.APLICADA.clase } : ESTADO_FILTRO[row.correccion]) : null;
          return (
            <button key={row.id} type="button" onClick={() => abrir(row)} aria-label={`${titulo} de ${row.identificacion}, ${horaDe(row.fecha)}`}
              className="block w-full min-w-0 rounded-xl border border-border bg-secondary/40 p-3 text-left transition-colors hover:border-gm-yellow/40 hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
              <span className="flex min-w-0 items-start gap-2.5">
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', plata ? 'bg-gm-yellow/10 text-gm-yellow' : 'bg-gm-surface-3 text-muted-foreground')}><Icono className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="gm-mono truncate text-base font-semibold leading-tight tracking-wide">{row.identificacion}</span>
                    {plata && <span className="gm-mono shrink-0 text-[15px] font-bold">{row.importe! < 0 ? '−' : ''}{formatImporte(Math.abs(row.importe!))}</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground/90">{titulo}</span>
                    {estado && <Insignia {...estado} />}
                  </span>
                </span>
                <ChevronRight className="mt-1 size-4 shrink-0 text-gm-texto-tenue" aria-hidden />
              </span>
              {(plata && row.medios) || row.recibido != null ? (
                <span className="mt-1.5 block pl-[42px] text-[12px] text-muted-foreground">
                  {plata && row.medios ? textoMedios(row.medios) : ''}
                  {row.recibido != null && <>{plata && row.medios ? ' · ' : ''}Entregó {formatImporte(row.recibido)} · vuelto {formatImporte(row.vuelto ?? 0)}</>}
                </span>
              ) : null}
              <span className="mt-1 flex flex-wrap items-center justify-between gap-1 pl-[42px] text-[11px] text-muted-foreground">
                <span className="truncate">{row.operador || 'Operador no registrado'}</span>
                <span className="tabular-nums">{variosDias ? fechaHora(row.fecha) : horaDe(row.fecha)}</span>
              </span>
            </button>
          );
        })}
      </AnimatedScrollList>
      {!pending && !error && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No hay movimientos para {miTurno && miTurnoId ? 'tu turno con ' : ''}estos filtros.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!pending && <CompactPagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />}

      <DetalleMovimiento
        operacion={abierta}
        isAdmin={isAdmin}
        comprobantes={comprobantes}
        onClose={() => setAbierta(null)}
        onCorregir={(op) => { setAbierta(null); setCorrigiendo(op); }}
        onReceipt={(id, kind) => { setAbierta(null); onReceipt(id, kind); }}
        onCambio={() => setRecarga((n) => n + 1)}
      />
      <CorregirRegistro
        operacion={corrigiendo}
        open={corrigiendo !== null}
        adentro={adentro}
        isAdmin={isAdmin}
        onOpenChange={(open) => {
          // Al terminar o cancelar se vuelve al detalle de la operación.
          if (!open) { setAbierta(corrigiendo); setCorrigiendo(null); }
        }}
        onListo={() => setRecarga((n) => n + 1)}
      />
    </section>
  );
}

// El detalle de una operación: lo vigente, los cobros como se registraron, los ajustes y el
// historial de cambios con el antes y el después.
export function DetalleMovimiento({ operacion, isAdmin, comprobantes, onClose, onCorregir, onReceipt, onCambio }: {
  operacion: OperacionACorregir | null;
  isAdmin: boolean;
  comprobantes: boolean;
  onClose: () => void;
  onCorregir: (op: OperacionACorregir) => void;
  onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void;
  onCambio?: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleOperacion | null>(null);
  const [error, setError] = useState('');
  const cargar = useCallback((op: OperacionACorregir) => {
    setError('');
    detalleOperacionAction(op.tipo, op.id).then((r) => {
      if (r.error !== undefined) setError(r.error);
      else setDetalle(r.data);
    });
  }, []);
  useEffect(() => {
    setDetalle(null);
    if (operacion) cargar(operacion);
  }, [operacion, cargar]);

  const d = detalle && operacion && detalle.id === operacion.id ? detalle : null;
  const descripcion = d ? (d.tipo === 'ESTADIA' ? `${d.salida ? 'Salió' : 'Adentro desde'} ${fechaHora(d.salida ?? d.entrada)}` : `Estadía larga · alta ${fechaHora(d.alta)}`) : 'Cargando…';
  return (
    <ActionDialog open={operacion !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ActionDialogContent>
        <ActionDialogHeader title={d?.identificacion ?? 'Operación'} description={descripcion} />
        <ActionDialogBody className="gap-4">
          {!d ? (
            error
              ? <div role="alert" className="space-y-2 text-sm"><p className="text-destructive">{error}</p><button type="button" className="font-semibold text-gm-yellow" onClick={() => operacion && cargar(operacion)}>Reintentar</button></div>
              : <p role="status" className="py-6 text-center text-sm text-muted-foreground">Cargando la operación…</p>
          ) : (
            <>
              {d.tipo === 'ESTADIA' ? <DetalleEstadiaVista d={d} /> : <DetallePaseVista d={d} />}
              {d.correcciones.length > 0 && (
                <section aria-label="Historial de cambios" className="space-y-2">
                  <h3 className="text-[13px] font-bold">Historial de cambios</h3>
                  {d.correcciones.map((c) => (
                    <TarjetaCorreccion key={c.id} c={c} isAdmin={isAdmin} version={d.version}
                      onResuelta={() => { if (operacion) cargar(operacion); onCambio?.(); }} />
                  ))}
                </section>
              )}
            </>
          )}
        </ActionDialogBody>
        {d && (
          <ActionDialogFooter>
            {comprobantes && d.tipo === 'ESTADIA' && (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <ActionDialogSecondaryButton onClick={() => onReceipt(d.id, 'ENTRY')}><Receipt className="size-4" aria-hidden />Entrada</ActionDialogSecondaryButton>
                {d.salida && <ActionDialogSecondaryButton onClick={() => onReceipt(d.id, 'EXIT')}><Receipt className="size-4" aria-hidden />Salida</ActionDialogSecondaryButton>}
              </div>
            )}
            <ActionDialogPrimaryButton onClick={() => onCorregir({ tipo: d.tipo, id: d.id })} detail={d.permiso && !d.permiso.directo ? 'Queda para revisión' : undefined}>
              Corregir
            </ActionDialogPrimaryButton>
          </ActionDialogFooter>
        )}
      </ActionDialogContent>
    </ActionDialog>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-gm-line py-2 first:border-t-0">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-[13px]">{children}</dd>
    </div>
  );
}

function DetalleEstadiaVista({ d }: { d: Extract<DetalleOperacion, { tipo: 'ESTADIA' }> }) {
  return (
    <>
      <dl className="rounded-xl border border-border bg-gm-surface-2/50 px-3 py-1">
        <Fila etiqueta="Entrada">{fechaHora(d.entrada)}{d.entryOperatorName ? <span className="block text-[12px] text-muted-foreground">{d.entryOperatorName}</span> : null}</Fila>
        <Fila etiqueta="Salida">{d.salida ? <>{fechaHora(d.salida)}{d.exitOperatorName ? <span className="block text-[12px] text-muted-foreground">{d.exitOperatorName}</span> : null}</> : 'Sigue adentro'}</Fila>
        {d.precio != null && <Fila etiqueta="Precio"><span className="gm-mono font-semibold">{formatImporte(d.precio)}</span></Fila>}
        {(d.cobrado !== 0 || d.pagos.length > 0) && (
          <Fila etiqueta="Cobrado (vigente)">
            <span className="gm-mono font-semibold">{formatImporte(d.cobrado)}</span>
            {Object.keys(d.medios).length > 0 && <span className="block text-[12px] text-muted-foreground">{textoMedios(d.medios)}</span>}
          </Fila>
        )}
      </dl>
      {d.pagos.length > 0 && (
        <section aria-label="Cobros" className="space-y-2">
          <h3 className="text-[13px] font-bold">Cobros, como se registraron</h3>
          {d.pagos.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-3 text-[13px]">
              <p className="flex items-baseline justify-between gap-2 font-semibold">
                <span>{p.tipo === 'ANTICIPO' ? 'Anticipo' : 'Cobro de la salida'} · {MEDIO[p.metodo] ?? p.metodo}</span>
                <span className="gm-mono">{formatImporte(p.monto)}</span>
              </p>
              <p className="text-[12px] text-muted-foreground">{fechaHora(p.fecha)}{p.operador ? ` · ${p.operador}` : ''}{p.confirmadoPorMp ? ' · confirmado por Mercado Pago' : ''}</p>
              {p.metodo === 'CASH' && (
                <p className="mt-1 text-[12px]">
                  {p.efectivoRecibido == null ? <span className="text-muted-foreground">Sin dato de lo que entregó</span>
                    : <>Entregó <span className="gm-mono">{formatImporte(p.efectivoRecibido)}</span> · vuelto <span className="gm-mono">{formatImporte(p.vuelto ?? 0)}</span></>}
                  {p.recibidoCorregido && <span className="text-gm-yellow"> · corregido</span>}
                </p>
              )}
              {p.corregido > 0 && <p className="mt-1 text-[12px] text-gm-yellow">{formatImporte(p.corregido)} se corrigió a otro medio</p>}
              {p.movido && <p className="mt-1 text-[12px] text-gm-yellow">Pasó a la estadía que de verdad salió (vehículo equivocado)</p>}
              {p.deCorreccion && <p className="mt-1 text-[12px] text-gm-yellow">Llegó de otra estadía con una corrección de vehículo equivocado</p>}
            </div>
          ))}
        </section>
      )}
      {d.ajustes.length > 0 && (
        <section aria-label="Ajustes" className="space-y-1.5">
          <h3 className="text-[13px] font-bold">Ajustes</h3>
          <ul className="rounded-xl border border-border px-3 py-1">
            {d.ajustes.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 border-t border-gm-line py-2 text-[12px] first:border-t-0">
                <span className="min-w-0">
                  <span className="block">{a.motivo || (a.tipo === 'SALDO' ? 'Cobro' : a.tipo.toLowerCase())}{a.correccionId ? <span className="text-gm-yellow"> · corrección</span> : null}</span>
                  <span className="block text-muted-foreground">{MEDIO[a.metodo] ?? a.metodo} · {fechaHora(a.fecha)}{a.operador ? ` · ${a.operador}` : ''}</span>
                </span>
                <span className="gm-mono shrink-0 font-semibold">{a.monto < 0 ? '−' : '+'}{formatImporte(Math.abs(a.monto))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function DetallePaseVista({ d }: { d: Extract<DetalleOperacion, { tipo: 'PASE' }> }) {
  return (
    <dl className="rounded-xl border border-border bg-gm-surface-2/50 px-3 py-1">
      <Fila etiqueta="Alta">{fechaHora(d.alta)}{d.entryOperatorName ? <span className="block text-[12px] text-muted-foreground">{d.entryOperatorName}</span> : null}</Fila>
      <Fila etiqueta="Precio"><span className="gm-mono font-semibold">{formatImporte(d.precio)}</span></Fila>
      <Fila etiqueta="Pago">
        {d.pagado ? <>{MEDIO[d.metodo ?? 'CASH']}{d.paymentOperatorName ? <span className="block text-[12px] text-muted-foreground">{d.paymentOperatorName}</span> : null}</> : 'Sin cobrar'}
      </Fila>
      {d.pagado && (d.metodo ?? 'CASH') === 'CASH' && (
        <Fila etiqueta="Recibido y vuelto">
          {d.efectivoRecibido == null ? <span className="text-muted-foreground">Sin dato</span>
            : <>Entregó <span className="gm-mono">{formatImporte(d.efectivoRecibido)}</span> · vuelto <span className="gm-mono">{formatImporte(d.vuelto ?? 0)}</span></>}
          {d.recibidoCorregido && <span className="block text-[12px] text-gm-yellow">corregido</span>}
        </Fila>
      )}
      <Fila etiqueta="Retiro">{d.retiro ? <>{fechaHora(d.retiro)}{d.exitOperatorName ? <span className="block text-[12px] text-muted-foreground">{d.exitOperatorName}</span> : null}</> : 'Sin retirar'}</Fila>
    </dl>
  );
}

// Una corrección del historial: quién la pidió y por qué, el antes y el después, el respaldo y la
// revisión. Administración resuelve acá las pendientes.
function TarjetaCorreccion({ c, isAdmin, version, onResuelta }: { c: Correccion; isAdmin: boolean; version: string; onResuelta: () => void }) {
  const [accion, setAccion] = useState<'APLICAR' | 'RECHAZAR' | null>(null);
  const [resolucion, setResolucion] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  // «Otro error» no cambia nada por sí mismo: cuando administración lo cierra, quedó resuelto.
  const estado = c.tipo === 'OTRO' && c.estado === 'APLICADA' ? { ...ESTADO_CORRECCION.APLICADA, texto: 'Resuelta' } : ESTADO_CORRECCION[c.estado];
  const resolver = () => {
    if (!accion || !resolucion.trim() || pending) return;
    setError('');
    startTransition(async () => {
      const r = await resolverCorreccionAction(c.id, { accion, resolucion: resolucion.trim(), version });
      if (r.error !== undefined) { setError(r.error); return; }
      toast.success(r.data.estado === 'APLICADA' ? 'Corrección aplicada.' : 'Corrección rechazada.');
      setAccion(null);
      onResuelta();
    });
  };
  return (
    <article className="space-y-2 rounded-xl border border-border p-3 text-[13px]">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{TIPOS_CORRECCION[c.tipo].titulo}</p>
          <p className="text-[12px] text-muted-foreground">{c.usuarioNombre ?? 'Sin usuario'} · {fechaHora(c.createdAt)} · {c.motivo}</p>
        </div>
        <Insignia {...estado} />
      </header>
      {c.detalle && <p className="text-gm-texto-2">«{c.detalle}»</p>}
      {!!c.efecto.lineas?.length && (
        <ul className="space-y-1 rounded-lg bg-gm-surface-2/60 p-2.5 text-[12px] leading-relaxed">
          {c.efecto.lineas.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
      {c.evidencia?.tipo === 'MERCADOPAGO' && <p className="text-[12px] text-gm-ok">Respaldo: transferencia verificada en Mercado Pago{c.evidencia.operacionId ? ` (op. ${c.evidencia.operacionId})` : ''}.</p>}
      {c.evidencia?.tipo === 'ADMINISTRACION' && <p className="text-[12px] text-muted-foreground">Transferencia aprobada por administración, sin comprobante de Mercado Pago.</p>}
      {c.posteriorAlCierre && <p className="text-[12px] text-muted-foreground">Aplicada después del cierre de su caja: el arqueo de ese turno no cambió; el ajuste fue a la planilla del día.</p>}
      {c.revisadoPorNombre && c.estado !== 'PENDIENTE' && (
        <p className="text-[12px] text-muted-foreground">
          {c.estado === 'RECHAZADA' ? 'Rechazó' : c.tipo === 'OTRO' ? 'Resolvió' : 'Aplicó'} {c.revisadoPorNombre}{c.revisadoEl ? ` · ${fechaHora(c.revisadoEl)}` : ''}{c.resolucion ? `: ${c.resolucion}` : ''}
        </p>
      )}
      {isAdmin && c.estado === 'PENDIENTE' && (
        accion ? (
          <div className="space-y-2 border-t border-gm-line pt-2">
            <label htmlFor={`resolucion-${c.id}`} className="text-[12px] font-semibold">{accion === 'APLICAR' ? 'Cómo se resolvió' : 'Por qué se rechaza'}</label>
            <textarea id={`resolucion-${c.id}`} value={resolucion} onChange={(e) => setResolucion(e.target.value)} rows={2} maxLength={500} disabled={pending}
              className="w-full rounded-lg border border-gm-line-strong bg-gm-surface-2 px-3 py-2 text-base outline-none focus:border-gm-yellow" />
            {error && <p role="alert" className="text-[12px] text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => { setAccion(null); setError(''); }}>Cancelar</Button>
              <Button type="button" size="sm" disabled={pending || !resolucion.trim()} onClick={resolver}
                className={accion === 'APLICAR' ? 'bg-gm-yellow text-gm-ink hover:bg-gm-yellow-deep' : ''} variant={accion === 'APLICAR' ? 'default' : 'outline'}>
                {pending ? 'Guardando…' : accion === 'APLICAR' ? (c.tipo === 'OTRO' ? 'Marcar resuelta' : 'Aplicar corrección') : 'Rechazar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 border-t border-gm-line pt-2">
            <Button type="button" size="sm" className="bg-gm-yellow text-gm-ink hover:bg-gm-yellow-deep" onClick={() => { setAccion('APLICAR'); setResolucion(''); }}>
              {c.tipo === 'OTRO' ? 'Resolver' : 'Aplicar'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setAccion('RECHAZAR'); setResolucion(''); }}>Rechazar</Button>
          </div>
        )
      )}
    </article>
  );
}
