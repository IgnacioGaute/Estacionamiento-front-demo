'use client';

// Movimientos: todo lo que pasó en la playa, guardado en el servidor, con filtros y paginación en
// la consulta (no es el tablero ampliado). Se abre con «Ver movimientos» desde Últimos movimientos y
// comparte el lenguaje de Comprobantes (filtros-historial.tsx).
//
// Arriba, el buscador, el período en un toque (Hoy · Ayer · 7 días · Este mes · Elegir fechas) y
// «Solo mi turno»; los tipos con su cantidad y «Más filtros» (medio, correcciones, operador), que en
// el celular es una hoja con todo. Después, el resumen del período (movimientos, lo cobrado por medio
// y lo que espera revisión) y la lista agrupada por hora (o por día, si es un rango). Cada renglón
// abre el detalle de la operación: cobros con lo que entregó el cliente y el vuelto, ajustes,
// comprobantes y el historial de cambios, con «Corregir» y, para administración, la revisión de las
// correcciones pendientes.
//
// Un operador ve sus operaciones (como en la planilla); administración, las de toda la playa.

import { useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, Clock3, Coins, PencilLine, Receipt, ScrollText, Search, SlidersHorizontal, Undo2, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { formatImporte } from '@/components/pricing-breakdown';
import { AppDatePicker } from '@/components/app-date-picker';
import { PlateChip } from '@/components/plate-chip';
import { VehicleTypeLabelsContext } from '@/components/vehicle-type-badge';
import { Button } from '@/components/ui/button';
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
  Correccion, DetalleOperacion, EstadoCorreccionFiltro, FiltrosHistorial, MedioHistorial, MovimientoHistorial, ResumenHistorial, TipoMovimientoHistorial,
} from '@/types/operaciones.type';
import { formatEstadia } from '@/utils/estadia';
import { ComprobantesCargando } from './cargando';
import { CorregirRegistro, horaDe, MEDIO, TIPOS_CORRECCION, type OperacionACorregir, type VehiculoAdentro } from './corregir-registro';
import { BuscadorHistorial, ChipFiltro, EstadoVacio, Interruptor, Segmentado, VerMas } from './filtros-historial';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const enfoque = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';

type Periodo = 'HOY' | 'AYER' | '7D' | 'MES' | 'FECHAS';
const PERIODOS: { id: Exclude<Periodo, 'FECHAS'>; texto: string }[] = [
  { id: 'HOY', texto: 'Hoy' }, { id: 'AYER', texto: 'Ayer' }, { id: '7D', texto: '7 días' }, { id: 'MES', texto: 'Este mes' },
];
// Los que van a la vista en la computadora; los demás (cobros parciales, devoluciones), en «Más filtros».
const TIPOS_RAPIDOS: TipoMovimientoHistorial[] = ['ENTRADA', 'SALIDA', 'ANTICIPO', 'PASE', 'CORRECCION'];
const TODOS_LOS_TIPOS: TipoMovimientoHistorial[] = ['ENTRADA', 'SALIDA', 'ANTICIPO', 'COBRO_PARCIAL', 'DEVOLUCION', 'PASE', 'CORRECCION'];
const SIN_COBRO: TipoMovimientoHistorial[] = ['ENTRADA', 'SALIDA', 'CORRECCION'];
const TIPO_PLURAL: Record<TipoMovimientoHistorial, string> = {
  ENTRADA: 'Entradas', SALIDA: 'Salidas', ANTICIPO: 'Anticipos', COBRO_PARCIAL: 'Cobros parciales', DEVOLUCION: 'Devoluciones', PASE: 'Estadías largas', CORRECCION: 'Correcciones',
};
const MEDIOS: { id: MedioHistorial; texto: string; corto: string; punto: string }[] = [
  { id: 'CASH', texto: 'Efectivo', corto: 'Efectivo', punto: 'bg-gm-ok' },
  { id: 'TRANSFER', texto: 'Transferencia', corto: 'Transf.', punto: 'bg-violet-400' },
  { id: 'MERCADOPAGO', texto: 'QR', corto: 'QR', punto: 'bg-sky-400' },
];
const CORRECCIONES: { id: EstadoCorreccionFiltro; texto: string }[] = [
  { id: 'PENDIENTE', texto: 'En revisión' }, { id: 'CORREGIDA', texto: 'Corregidas' }, { id: 'RECHAZADA', texto: 'Rechazadas' }, { id: 'SIN', texto: 'Sin correcciones' },
];
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
const selectClase = 'h-11 w-full rounded-xl border border-gm-line-strong bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';

function Insignia({ texto, clase }: { texto: string; clase: string }) {
  return <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold', clase)}>{texto}</span>;
}

// El rango de fechas de un período. Un rango elegido a mano se acota a tres meses (lo que acepta el servidor).
function rangoDe(periodo: Periodo, hoy: string, fechas: { desde: string; hasta: string }): [string, string] {
  const d = dayjs(hoy);
  if (periodo === 'AYER') { const ayer = d.subtract(1, 'day').format('YYYY-MM-DD'); return [ayer, ayer]; }
  if (periodo === '7D') return [d.subtract(6, 'day').format('YYYY-MM-DD'), hoy];
  if (periodo === 'MES') return [d.startOf('month').format('YYYY-MM-DD'), hoy];
  if (periodo === 'FECHAS') return [fechas.desde, fechas.hasta];
  return [hoy, hoy];
}

function tituloDe(f: MovimientoHistorial) {
  if (f.tipo === 'PASE') return f.detalle === 'Retiro' ? 'Estadía larga · retiro' : 'Estadía larga · alta';
  if (f.tipo === 'CORRECCION') return `Corrección · ${(TIPOS_CORRECCION[f.detalle as keyof typeof TIPOS_CORRECCION]?.titulo ?? '').toLowerCase()}`;
  return { ENTRADA: 'Entrada', SALIDA: 'Salida', ANTICIPO: 'Anticipo', COBRO_PARCIAL: 'Cobro parcial', DEVOLUCION: 'Devolución' }[f.tipo];
}

function estadoDe(f: MovimientoHistorial) {
  if (!f.correccion) return null;
  if (f.tipo === 'CORRECCION' && f.correccion === 'CORREGIDA') return { texto: f.detalle === 'OTRO' ? 'Resuelta' : 'Aplicada', clase: ESTADO_CORRECCION.APLICADA.clase };
  return ESTADO_FILTRO[f.correccion];
}

// Lo que se lee debajo del título: cuánto estuvo, quién, el vehículo y lo que entregó el cliente.
function detalleDe(f: MovimientoHistorial, vehiculo: string | null) {
  const efectivo = (f.medios?.CASH ?? 0) > 0;
  const recibido = f.recibido != null ? `entregó ${formatImporte(f.recibido)} · vuelto ${formatImporte(f.vuelto ?? 0)}`
    : efectivo && ['SALIDA', 'ANTICIPO', 'COBRO_PARCIAL'].includes(f.tipo) ? 'sin informar con cuánto pagó' : null;
  const partes: (string | null | undefined)[] =
    f.tipo === 'SALIDA' ? [f.duracion != null ? `Estuvo ${formatEstadia(f.duracion)}` : null, f.operador, recibido]
    : f.tipo === 'ENTRADA' ? [vehiculo, f.operador]
    : f.tipo === 'PASE' ? [vehiculo, f.operador, f.detalle === 'Alta' ? recibido : null]
    : f.tipo === 'DEVOLUCION' ? [f.detalle, f.operador]
    : f.tipo === 'CORRECCION' ? [f.operador]
    : [f.operador, recibido];
  const texto = partes.filter(Boolean).join(' · ');
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
}

export function MovimientosHistorial({ today, isAdmin, turnos, cobro, comprobantes, barcodeTicketsEnabled = true, adentro, revision, onReceipt }: {
  today: string;
  isAdmin: boolean;
  // Turnos activos: ofrece «Solo mi turno» (y arranca ahí si hay uno abierto).
  turnos: boolean;
  // Playa con cobro: lo cobrado y el medio de pago. En la modalidad gratuita no hay plata.
  cobro: boolean;
  comprobantes: boolean;
  barcodeTicketsEnabled?: boolean;
  adentro: VehiculoAdentro[];
  // Cambia con cada entrada o salida: la lista se vuelve a pedir.
  revision?: unknown;
  onReceipt: (id: string, kind: 'ENTRY' | 'EXIT') => void;
}) {
  const tiposVehiculo = useContext(VehicleTypeLabelsContext);
  const nombreVehiculo = useCallback((code?: string | null) => {
    if (!code) return null;
    const conocido = tiposVehiculo.find((t) => t.code === code)?.name;
    if (conocido) return conocido;
    const texto = code.replace(/_/g, ' ').toLocaleLowerCase('es-AR');
    return texto.charAt(0).toLocaleUpperCase('es-AR') + texto.slice(1);
  }, [tiposVehiculo]);

  const [periodo, setPeriodo] = useState<Periodo>('HOY');
  const [fechas, setFechas] = useState({ desde: today, hasta: today });
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoHistorial | null>(null);
  const [medio, setMedio] = useState<MedioHistorial | null>(null);
  const [correccion, setCorreccion] = useState<EstadoCorreccionFiltro | null>(null);
  const [operadorId, setOperadorId] = useState<string | null>(null);
  const [operadores, setOperadores] = useState<{ id: string; nombre: string }[]>([]);
  // El turno abierto de quien mira y desde qué hora: «Solo mi turno» arranca prendido si hay uno.
  const [miTurno, setMiTurno] = useState<{ id: string; desde: string } | null>(null);
  const [soloMiTurno, setSoloMiTurno] = useState(false);
  // Con turnos, se espera saber si hay uno abierto: arranca en «Solo mi turno» sin una carga previa de todo el día.
  const [contextoListo, setContextoListo] = useState(!turnos);
  const [verFiltros, setVerFiltros] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MovimientoHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<ResumenHistorial | null>(null);
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
      const activo = r.context?.active;
      setMiTurno(activo ? { id: activo.id, desde: horaDe(activo.fechaApertura) } : null);
      setSoloMiTurno(!!activo);
    }).catch(() => undefined).finally(() => { if (vigente) setContextoListo(true); });
    return () => { vigente = false; };
  }, [turnos]);

  useEffect(() => {
    if (!isAdmin || !turnos) return;
    getOperadoresAction().then((r) => {
      if (r.operadores) setOperadores(r.operadores.map((u) => ({ id: u.id, nombre: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'Sin nombre' })));
    }).catch(() => undefined);
  }, [isAdmin, turnos]);

  // Cada entrada o salida nueva vuelve a pedir la primera página.
  useEffect(() => { setRecarga((n) => n + 1); }, [revision]);

  const [desde, hasta] = rangoDe(periodo, today, fechas);
  const filtros: FiltrosHistorial = useMemo(() => ({
    desde, hasta, q: q.trim() || undefined, tipo: tipo ?? undefined, medio: medio ?? undefined, correccion: correccion ?? undefined,
    operadorId: operadorId ?? undefined, turnoId: soloMiTurno && miTurno ? miTurno.id : undefined,
  }), [desde, hasta, q, tipo, medio, correccion, operadorId, soloMiTurno, miTurno]);
  const clave = JSON.stringify(filtros) + '|' + recarga;
  const claveRef = useRef(clave);

  useEffect(() => {
    if (!contextoListo) return;
    // Cambió un filtro: se vuelve a la primera página y la lista se reemplaza.
    if (claveRef.current !== clave) {
      claveRef.current = clave;
      if (page !== 1) { setPage(1); return; }
    }
    let vigente = true;
    setPending(true);
    const timer = setTimeout(() => {
      historialMovimientosAction({ ...filtros, page }).then((r) => {
        if (!vigente) return;
        if (r.error !== undefined) {
          if (page === 1) { setRows([]); setTotal(0); setResumen(null); }
          setError(r.error);
          return;
        }
        setError('');
        setTotal(r.data.meta.totalItems);
        if (r.data.resumen) setResumen(r.data.resumen);
        setRows((previas) => page === 1 ? r.data.data : [...previas, ...r.data.data.filter((f) => !previas.some((p) => p.id === f.id))]);
      }).finally(() => { if (vigente) setPending(false); });
    }, page === 1 ? 250 : 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [clave, page, contextoListo, filtros]);

  const tiposVisibles = cobro ? TIPOS_RAPIDOS : SIN_COBRO;
  const tiposDeLaHoja = cobro ? TODOS_LOS_TIPOS : SIN_COBRO;
  const tipoFueraDeLaVista = !!tipo && !tiposVisibles.includes(tipo);
  const cantidadExtra = [medio, correccion, operadorId, tipoFueraDeLaVista ? tipo : null].filter(Boolean).length;
  const hayFiltros = !!(q.trim() || tipo || medio || correccion || operadorId);
  const limpiar = () => { setTipo(null); setMedio(null); setCorreccion(null); setOperadorId(null); setQ(''); };
  const elegirPeriodo = (id: Periodo) => {
    if (id === 'FECHAS') setFechas({ desde, hasta });
    setPeriodo(id);
  };
  // Un rango elegido a mano no pasa de tres meses: se corre la otra punta.
  const elegirFecha = (punta: 'desde' | 'hasta', valor: string) => setFechas((actual) => {
    const nuevo = { ...actual, [punta]: valor };
    if (nuevo.hasta < nuevo.desde) nuevo[punta === 'desde' ? 'hasta' : 'desde'] = valor;
    if (dayjs(nuevo.hasta).diff(dayjs(nuevo.desde), 'day') > 92) {
      if (punta === 'desde') nuevo.hasta = dayjs(nuevo.desde).add(92, 'day').format('YYYY-MM-DD');
      else nuevo.desde = dayjs(nuevo.hasta).subtract(92, 'day').format('YYYY-MM-DD');
    }
    if (nuevo.hasta > today) nuevo.hasta = today;
    return nuevo;
  });
  const etiquetaPeriodo = periodo === 'FECHAS' ? (desde === hasta ? diaLegible(desde) : `${diaLegible(desde)} – ${diaLegible(hasta)}`) : PERIODOS.find((p) => p.id === periodo)!.texto;
  const variosDias = desde !== hasta;
  const porTipo = resumen?.porTipo ?? {};
  const totalTodos = Object.values(porTipo).reduce<number>((a, n) => a + (n ?? 0), 0);
  const nombreMedio = (id: MedioHistorial) => MEDIOS.find((m) => m.id === id)!.texto;
  const nombreCorreccion = (id: EstadoCorreccionFiltro) => CORRECCIONES.find((c) => c.id === id)!.texto;
  const nombreOperador = (id: string) => operadores.find((o) => o.id === id)?.nombre ?? 'Operador';

  // Agrupados por hora (un día) o por día (un rango), en el orden en que llegan.
  const grupos = useMemo(() => {
    const lista: { clave: string; titulo: string; filas: MovimientoHistorial[] }[] = [];
    for (const f of rows) {
      const momento = dayjs(f.fecha).tz(TZ);
      const claveGrupo = variosDias ? momento.format('YYYY-MM-DD') : momento.format('HH');
      const ultimo = lista[lista.length - 1];
      if (ultimo?.clave === claveGrupo) ultimo.filas.push(f);
      else lista.push({ clave: claveGrupo, titulo: variosDias ? new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).format(momento.toDate()) : `${claveGrupo}:00`, filas: [f] });
    }
    return lista;
  }, [rows, variosDias]);

  const abrir = (row: MovimientoHistorial) => {
    if (row.paseId) setAbierta({ tipo: 'PASE', id: row.paseId });
    else if (row.registrationId) setAbierta({ tipo: 'ESTADIA', id: row.registrationId });
  };
  const periodoConFechas = (
    <>
      {periodo === 'FECHAS' && (
        <div className="flex flex-wrap items-center gap-2">
          <AppDatePicker value={desde} title="Desde" max={today} onChange={(v) => elegirFecha('desde', v)} trigger={
            <button type="button" className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border-[1.5px] border-gm-line-strong px-3 text-sm font-semibold hover:border-gm-yellow/50', enfoque)}>
              <span className="text-muted-foreground">Desde</span><span className="gm-mono">{diaLegible(desde)}</span>
            </button>
          } />
          <AppDatePicker value={hasta} title="Hasta" min={desde} max={today} onChange={(v) => elegirFecha('hasta', v)} trigger={
            <button type="button" className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border-[1.5px] border-gm-line-strong px-3 text-sm font-semibold hover:border-gm-yellow/50', enfoque)}>
              <span className="text-muted-foreground">Hasta</span><span className="gm-mono">{diaLegible(hasta)}</span>
            </button>
          } />
        </div>
      )}
    </>
  );

  return (
    <section aria-label="Movimientos" className="min-w-0 space-y-4">
      <div className="space-y-3 rounded-[22px] border border-gm-line bg-card p-3 sm:p-4">
        <BuscadorHistorial value={q} onChange={setQ} etiqueta="Buscar movimientos"
          placeholder={barcodeTicketsEnabled ? 'Buscar patente, ticket o apellido' : 'Buscar patente o apellido'} />

        {/* Computadora: el período y mi turno a la vista. */}
        <div className="hidden flex-wrap items-center gap-2.5 sm:flex">
          <Segmentado etiqueta="Período" valor={periodo} onChange={elegirPeriodo} opciones={[
            ...PERIODOS.map((p) => ({ id: p.id as Periodo, texto: p.texto })),
            { id: 'FECHAS' as Periodo, texto: <><CalendarDays className="size-4" aria-hidden />Elegir fechas</> },
          ]} />
          {periodoConFechas}
          <div className="flex-1" />
          {miTurno && <Interruptor activo={soloMiTurno} onChange={setSoloMiTurno}>Solo mi turno · desde {miTurno.desde}</Interruptor>}
        </div>

        {/* Celular: chips que se deslizan; lo demás, en la hoja de filtros. */}
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 sm:hidden">
          <ChipFiltro activo onClick={() => setVerFiltros(true)}><CalendarDays className="size-4 text-gm-yellow" aria-hidden />{etiquetaPeriodo}</ChipFiltro>
          {miTurno && <ChipFiltro activo={soloMiTurno} onClick={() => setSoloMiTurno(!soloMiTurno)}><Clock3 className="size-4" aria-hidden />Mi turno</ChipFiltro>}
          {tipo && <ChipFiltro activo onQuitar={() => setTipo(null)}>{TIPO_PLURAL[tipo]}</ChipFiltro>}
          {medio && <ChipFiltro activo onQuitar={() => setMedio(null)}>{nombreMedio(medio)}</ChipFiltro>}
          {correccion && <ChipFiltro activo onQuitar={() => setCorreccion(null)}>{nombreCorreccion(correccion)}</ChipFiltro>}
          {operadorId && <ChipFiltro activo onQuitar={() => setOperadorId(null)}>{nombreOperador(operadorId)}</ChipFiltro>}
          <ChipFiltro onClick={() => setVerFiltros(true)}><SlidersHorizontal className="size-4" aria-hidden />Filtros</ChipFiltro>
        </div>

        {/* Computadora: los tipos con su cantidad y «Más filtros». */}
        <div className="hidden flex-wrap items-center gap-2 border-t border-gm-line pt-3 sm:flex">
          <ChipFiltro activo={!tipo} onClick={() => setTipo(null)} cuenta={resumen ? totalTodos : undefined}>Todos</ChipFiltro>
          {tiposVisibles.map((t) => (
            <ChipFiltro key={t} activo={tipo === t} onClick={() => setTipo(tipo === t ? null : t)} cuenta={resumen ? porTipo[t] ?? 0 : undefined}>{TIPO_PLURAL[t]}</ChipFiltro>
          ))}
          <div className="flex-1" />
          <ChipFiltro activo={cantidadExtra > 0} onClick={() => setVerFiltros(true)}>
            <SlidersHorizontal className="size-4" aria-hidden />Más filtros{cantidadExtra ? ` · ${cantidadExtra}` : ''}
          </ChipFiltro>
        </div>
        {cantidadExtra > 0 && (
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {tipoFueraDeLaVista && tipo && <ChipFiltro activo onQuitar={() => setTipo(null)}>{TIPO_PLURAL[tipo]}</ChipFiltro>}
            {medio && <ChipFiltro activo onQuitar={() => setMedio(null)}>{nombreMedio(medio)}</ChipFiltro>}
            {correccion && <ChipFiltro activo onQuitar={() => setCorreccion(null)}>{nombreCorreccion(correccion)}</ChipFiltro>}
            {operadorId && <ChipFiltro activo onQuitar={() => setOperadorId(null)}>{nombreOperador(operadorId)}</ChipFiltro>}
            <button type="button" onClick={() => { setMedio(null); setCorreccion(null); setOperadorId(null); if (tipoFueraDeLaVista) setTipo(null); }}
              className={cn('min-h-10 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground', enfoque)}>Limpiar</button>
          </div>
        )}
      </div>

      {resumen && <ResumenPeriodo resumen={resumen} cobro={cobro} onRevisar={() => { setTipo(null); setMedio(null); setCorreccion('PENDIENTE'); }} />}

      {pending && !rows.length ? <ComprobantesCargando />
        : error && !rows.length ? <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error}</p>
        : !rows.length ? (
          hayFiltros ? (
            <EstadoVacio icono={<Search className="size-7" />} titulo="No hay movimientos con estos filtros" texto={`${etiquetaPeriodo}${soloMiTurno && miTurno ? ' · mi turno' : ''}`}>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={limpiar}>Quitar filtros</Button>
            </EstadoVacio>
          ) : soloMiTurno && miTurno && periodo === 'HOY' ? (
            <EstadoVacio icono={<Clock3 className="size-7" />} titulo="Todavía no hay movimientos en tu turno"
              texto={`Tu turno empezó a las ${miTurno.desde}. Cada entrada, salida y cobro que registres aparece acá al instante.`}>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => setSoloMiTurno(false)}>Ver todo el día</Button>
              <Button type="button" variant="ghost" className="min-h-11 text-gm-yellow" onClick={() => { setSoloMiTurno(false); setPeriodo('AYER'); }}>Ver ayer</Button>
            </EstadoVacio>
          ) : (
            <EstadoVacio icono={<ScrollText className="size-7" />} titulo={periodo === 'HOY' ? 'Todavía no hay movimientos hoy' : 'No hay movimientos en este período'}>
              {periodo === 'HOY'
                ? <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => { setSoloMiTurno(false); setPeriodo('AYER'); }}>Ver ayer</Button>
                : <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => setPeriodo('HOY')}>Ver hoy</Button>}
            </EstadoVacio>
          )
        ) : (
          <div className={cn('space-y-4 transition-opacity', pending && page === 1 && 'opacity-60')} aria-busy={pending}>
            {grupos.map((g) => (
              <section key={g.clave} aria-label={g.titulo} className="space-y-2">
                <h2 className="flex items-center gap-3 px-1 text-[13px] font-bold text-muted-foreground">
                  <span className={cn(!variosDias && 'gm-mono', 'capitalize')}>{g.titulo}</span>
                  <span aria-hidden className="h-px flex-1 bg-gm-line" />
                  <span className="font-semibold">{g.filas.length === 1 ? '1 movimiento' : `${g.filas.length} movimientos`}</span>
                </h2>
                <ul className="overflow-hidden rounded-[18px] border border-gm-line bg-card">
                  {g.filas.map((f, i) => (
                    <FilaMovimiento key={f.id} f={f} primero={i === 0} variosDias={variosDias} vehiculo={nombreVehiculo(f.vehiculo)} onAbrir={() => abrir(f)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      {error && rows.length > 0 && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <VerMas mostrando={rows.length} total={total} cargando={pending && page > 1} onClick={() => setPage((p) => p + 1)} />

      {/* La hoja de filtros: se aplican al tocarlos; el botón dice cuántos quedan. */}
      <ActionDialog open={verFiltros} onOpenChange={setVerFiltros}>
        <ActionDialogContent>
          <ActionDialogHeader title="Filtros" description={`${etiquetaPeriodo}${soloMiTurno && miTurno ? ' · mi turno' : ''}`} />
          <ActionDialogBody className="gap-6">
            <GrupoFiltros titulo="Período">
              {PERIODOS.map((p) => <ChipFiltro key={p.id} activo={periodo === p.id} onClick={() => elegirPeriodo(p.id)}>{p.texto}</ChipFiltro>)}
              <ChipFiltro activo={periodo === 'FECHAS'} onClick={() => elegirPeriodo('FECHAS')}>Elegir fechas</ChipFiltro>
            </GrupoFiltros>
            {periodoConFechas}
            {miTurno && <Interruptor activo={soloMiTurno} onChange={setSoloMiTurno} className="w-full justify-start">Solo mi turno · desde {miTurno.desde}</Interruptor>}
            <GrupoFiltros titulo="Tipo">
              <ChipFiltro activo={!tipo} onClick={() => setTipo(null)}>Todos</ChipFiltro>
              {tiposDeLaHoja.map((t) => <ChipFiltro key={t} activo={tipo === t} onClick={() => setTipo(tipo === t ? null : t)} cuenta={resumen ? porTipo[t] ?? 0 : undefined}>{TIPO_PLURAL[t]}</ChipFiltro>)}
            </GrupoFiltros>
            {cobro && (
              <GrupoFiltros titulo="Medio de pago">
                <ChipFiltro activo={!medio} onClick={() => setMedio(null)}>Todos</ChipFiltro>
                {MEDIOS.map((m) => <ChipFiltro key={m.id} activo={medio === m.id} onClick={() => setMedio(medio === m.id ? null : m.id)}>{m.texto}</ChipFiltro>)}
              </GrupoFiltros>
            )}
            <GrupoFiltros titulo="Correcciones">
              <ChipFiltro activo={!correccion} onClick={() => setCorreccion(null)}>Todas</ChipFiltro>
              {CORRECCIONES.map((c) => <ChipFiltro key={c.id} activo={correccion === c.id} onClick={() => setCorreccion(correccion === c.id ? null : c.id)}>{c.texto}</ChipFiltro>)}
            </GrupoFiltros>
            {isAdmin && operadores.length > 0 && (
              <label className="block space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Operador</span>
                <select className={selectClase} value={operadorId ?? ''} onChange={(e) => setOperadorId(e.target.value || null)}>
                  <option value="">Todos</option>
                  {operadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </label>
            )}
          </ActionDialogBody>
          <ActionDialogFooter>
            <ActionDialogSecondaryButton onClick={limpiar}>Limpiar</ActionDialogSecondaryButton>
            <ActionDialogPrimaryButton onClick={() => setVerFiltros(false)}>
              {pending ? 'Buscando…' : total === 1 ? 'Ver 1 movimiento' : `Ver ${total} movimientos`}
            </ActionDialogPrimaryButton>
          </ActionDialogFooter>
        </ActionDialogContent>
      </ActionDialog>

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

function GrupoFiltros({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{titulo}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

// Movimientos, lo cobrado por medio y lo que espera revisión (lo toca y filtra esas).
function ResumenPeriodo({ resumen, cobro, onRevisar }: { resumen: ResumenHistorial; cobro: boolean; onRevisar: () => void }) {
  const entradas = resumen.porTipo.ENTRADA ?? 0;
  const salidas = resumen.porTipo.SALIDA ?? 0;
  const medios = MEDIOS.filter((m) => resumen.cobrado.porMedio[m.id]);
  const etiqueta = 'text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground';
  return (
    <section aria-label="Resumen del período">
      {/* Celular: una franja. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-gm-line bg-card px-4 py-3">
          <span className="text-sm text-gm-texto-2"><strong className="font-display text-[22px] font-semibold text-foreground">{resumen.total}</strong> {resumen.total === 1 ? 'movimiento' : 'movimientos'}</span>
          {cobro && <span className="gm-mono text-[17px] font-bold">{formatImporte(resumen.cobrado.total)}</span>}
        </div>
        {resumen.pendientes > 0 && (
          <button type="button" onClick={onRevisar} className={cn('flex min-h-11 items-center justify-between rounded-2xl border-[1.5px] border-gm-atencion/45 bg-gm-atencion/[0.08] px-4 text-left text-sm font-semibold', enfoque)}>
            <span><span className="font-bold text-gm-atencion">{resumen.pendientes}</span> {resumen.pendientes === 1 ? 'corrección espera' : 'correcciones esperan'} revisión</span>
            <ChevronRight className="size-4 text-gm-atencion" aria-hidden />
          </button>
        )}
      </div>
      {/* Computadora: tres tarjetas. */}
      <div className={cn('hidden gap-3 sm:grid', cobro ? 'grid-cols-3' : 'grid-cols-2')}>
        <div className="rounded-[18px] border border-gm-line bg-card px-[18px] py-4">
          <p className={etiqueta}>Movimientos</p>
          <p className="mt-1.5 font-display text-[30px] font-semibold leading-none">{resumen.total}</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{entradas} {entradas === 1 ? 'entrada' : 'entradas'} · {salidas} {salidas === 1 ? 'salida' : 'salidas'}</p>
        </div>
        {cobro && (
          <div className="rounded-[18px] border border-gm-line bg-card px-[18px] py-4">
            <p className={etiqueta}>Cobrado</p>
            <p className="mt-1.5 font-display text-[30px] font-semibold leading-none">{formatImporte(resumen.cobrado.total)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gm-texto-2">
              {medios.length ? medios.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5"><span aria-hidden className={cn('size-[7px] rounded-full', m.punto)} />{m.corto} {formatImporte(resumen.cobrado.porMedio[m.id]!)}</span>
              )) : <span className="text-muted-foreground">Sin cobros</span>}
            </div>
          </div>
        )}
        {resumen.pendientes > 0 ? (
          <button type="button" onClick={onRevisar} className={cn('rounded-[18px] border-[1.5px] border-gm-atencion/45 bg-gm-atencion/[0.08] px-[18px] py-4 text-left transition-colors hover:bg-gm-atencion/[0.12]', enfoque)}>
            <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-gm-atencion">Para revisar</span>
            <span className="mt-1.5 block font-display text-[30px] font-semibold leading-none">{resumen.pendientes}</span>
            <span className="mt-1.5 block text-[13px] text-gm-texto-2">{resumen.pendientes === 1 ? 'Corrección esperando' : 'Correcciones esperando'} a administración →</span>
          </button>
        ) : (
          <div className="rounded-[18px] border border-gm-line bg-card px-[18px] py-4">
            <p className={etiqueta}>Para revisar</p>
            <p className="mt-1.5 font-display text-[30px] font-semibold leading-none text-muted-foreground">0</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">Nada esperando revisión</p>
          </div>
        )}
      </div>
    </section>
  );
}

function FilaMovimiento({ f, primero, variosDias, vehiculo, onAbrir }: { f: MovimientoHistorial; primero: boolean; variosDias: boolean; vehiculo: string | null; onAbrir: () => void }) {
  const Icono = ICONO[f.tipo];
  const plata = f.importe != null && f.importe !== 0;
  const titulo = tituloDe(f);
  const estado = estadoDe(f);
  const detalle = detalleDe(f, vehiculo);
  const hora = variosDias ? fechaHora(f.fecha) : horaDe(f.fecha);
  const medios = MEDIOS.filter((m) => f.medios?.[m.id]);
  return (
    <li className={cn(!primero && 'border-t border-gm-line')}>
      <button type="button" onClick={onAbrir} aria-label={`${titulo} de ${f.identificacion}, ${hora}`}
        className={cn('flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-gm-yellow/[0.04] sm:grid sm:grid-cols-[52px_40px_minmax(0,1fr)_auto_18px] sm:gap-4 sm:px-4 sm:py-3.5', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow')}>
        <span className="gm-mono hidden text-sm text-muted-foreground sm:block">{variosDias ? horaDe(f.fecha) : hora}</span>
        <span aria-hidden className={cn('hidden size-10 place-items-center rounded-full sm:grid', plata ? 'bg-gm-yellow/[0.14] text-gm-yellow' : 'bg-gm-surface-3 text-gm-texto-2')}>
          <Icono className="size-[18px]" strokeWidth={f.tipo === 'ENTRADA' || f.tipo === 'SALIDA' ? 2.4 : 2} />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
          {f.patente ? <PlateChip plate={f.patente} size="sm" /> : <span className="gm-mono min-w-[88px] shrink-0 text-sm font-bold">{f.identificacion}</span>}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[15px] font-bold">{titulo}</span>
              {estado && <Insignia {...estado} />}
            </span>
            <span className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground sm:line-clamp-1">
              {detalle}<span className="sm:hidden">{detalle ? ' · ' : ''}<span className="gm-mono">{hora}</span></span>
            </span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {plata ? <span className="gm-mono text-[15px] font-bold sm:text-base">{f.importe! < 0 ? '−' : ''}{formatImporte(Math.abs(f.importe!))}</span>
            : f.tipo === 'SALIDA' ? <span className="text-[13px] text-muted-foreground">Sin cobro</span> : null}
          {plata && medios.length > 0 && (
            <span className="hidden gap-1.5 sm:flex">
              {medios.map((m) => (
                <span key={m.id} className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-gm-surface-2 px-2 text-xs font-semibold text-gm-texto-2">
                  <span aria-hidden className={cn('size-[7px] rounded-full', m.punto)} />{m.corto}
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronRight className="hidden size-[18px] text-gm-texto-tenue sm:block" aria-hidden />
      </button>
    </li>
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
