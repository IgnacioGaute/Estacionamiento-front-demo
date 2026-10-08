'use client';

// «Entradas y salidas» en la computadora: no es el inicio del celular estirado. A la izquierda el
// mostrador (cuántos hay, entrar, cobrar, estadía larga y lo último que pasó); a la derecha toda la
// playa en un tablero por tramos de tiempo; arriba un buscador que se maneja con el teclado. Qué
// diálogo abrir lo sigue decidiendo ticket.card.tsx.

import { useEffect, useId, useMemo, useState, type ReactNode, type RefObject } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, CalendarDays, CalendarPlus, CarFront, Check, ChevronRight, Clock3, LogIn, Receipt, Search } from 'lucide-react';
import { AnimatedScrollList } from '@/components/animated-scroll-list';
import { PlateChip } from '@/components/plate-chip';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { cuandoEntro, formatEstadia, minutosDeEstadia, tramoDe, tramoInfo, TRAMOS } from '@/utils/estadia';
import { UNIDAD_ESTADIA_LARGA, vencimientoEstadiaLarga } from '@/utils/estadia-larga';
import { formatElapsed, isBarcodeOrigin, isOverdue, minutesSinceEntry } from '@/utils/ticket-registration.utils';
import { estaAdentro, LineaTramo, NARANJA_AVISO, normalizar } from './inicio';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const AMARILLO = '#F5C219';

export type FiltroTablero = 'todos' | 'excedidos' | 'vencidas';
type Refe = (el: HTMLElement | null) => void;

const enfoque = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd aria-hidden className={cn('gm-mono inline-grid h-6 min-w-6 place-items-center rounded-[7px] border border-b-2 border-gm-line-strong bg-background px-1.5 text-[11.5px] font-bold text-muted-foreground', className)}>
      {children}
    </kbd>
  );
}

function nombreDe(r: TicketRegistration) {
  if (isBarcodeOrigin(r)) return `Ficha ${r.ticket?.codeBar ?? r.codeBarTicket ?? '—'}`;
  if (r.noPlate || !r.licensePlateOriginal) return r.lastNameCustomer ? `Sin patente, ${r.lastNameCustomer}` : 'Sin patente';
  return r.licensePlateOriginal;
}

// La patente como chapa, la ficha física o «sin patente»: lo mismo que reconoce en el auto.
function Identidad({ r, size = 'sm', resaltar }: { r: TicketRegistration; size?: 'xs' | 'sm'; resaltar?: string }) {
  const chico = size === 'xs';
  if (isBarcodeOrigin(r)) {
    return (
      <span className={cn('gm-mono inline-flex shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-gm-line-strong bg-gm-surface-3 font-bold', chico ? 'h-[26px] min-w-[78px] px-1.5 text-xs' : 'h-[33px] min-w-[96px] px-2 text-[13.5px]')}>
        Ficha {r.ticket?.codeBar ?? r.codeBarTicket ?? '—'}
      </span>
    );
  }
  if (r.noPlate || !r.licensePlateOriginal) {
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-muted-foreground/60 font-bold uppercase tracking-[0.1em] text-muted-foreground', chico ? 'h-[26px] min-w-[78px] px-1.5 text-[9.5px]' : 'h-[33px] min-w-[96px] px-2 text-[10.5px]')}>
        Sin patente
      </span>
    );
  }
  return <PlateChip plate={r.licensePlateOriginal} size={size} highlight={resaltar} />;
}

function avisoDe(r: TicketRegistration, minutos: number) {
  if (r.expectedUptoMinutes == null) return 'Superó el tiempo avisado';
  return `Avisó ${formatElapsed(r.expectedUptoMinutes)} · se pasó ${formatEstadia(minutos - r.expectedUptoMinutes)}`;
}

// «hoy», «mañana», «ayer» o «lun 12/10».
function fechaCorta(fecha: Date, ahora: number) {
  const f = dayjs(fecha).tz(TZ);
  const hoy = dayjs(ahora).tz(TZ);
  if (f.isSame(hoy, 'day')) return 'hoy';
  if (f.isSame(hoy.add(1, 'day'), 'day')) return 'mañana';
  if (f.isSame(hoy.subtract(1, 'day'), 'day')) return 'ayer';
  return `${DIAS[f.day()]} ${f.format('DD/MM')}`;
}

// ── Tarjeta amarilla ──────────────────────────────────────────────────────────

export function TarjetaAdentro({ total, porHora, largas, excedidos, vencidas, turno, filtro, onFiltro }: {
  total: number;
  porHora: number;
  largas: number;
  excedidos: number;
  vencidas: number;
  turno: ReactNode;
  filtro: FiltroTablero;
  onFiltro: (filtro: FiltroTablero) => void;
}) {
  // Los avisos filtran el tablero de al lado; tocarlos de nuevo vuelve a mostrar todo.
  const aviso = (activo: boolean) => cn(
    'inline-flex h-[34px] items-center gap-1 rounded-full pl-3 pr-2 text-[12.5px] font-bold transition-[transform,background-color,color] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-ink',
    activo ? 'bg-[#F0714A] text-gm-ink' : 'bg-gm-ink text-[#F0714A]',
  );
  return (
    <section aria-label="La playa ahora" className="relative overflow-hidden rounded-[26px] bg-gm-yellow text-gm-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]">
      <div aria-hidden className="h-2.5" style={{ backgroundImage: 'repeating-linear-gradient(135deg, hsl(var(--gm-ink)) 0 9px, hsl(var(--gm-yellow)) 9px 18px)' }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-5 grid size-[150px] place-items-center rounded-[32px] border-[10px] border-gm-ink/[0.08] font-display text-[112px] font-bold leading-none text-gm-ink/[0.08]">E</span>
      <div className="relative flex flex-col gap-3 px-5 pb-5 pt-3.5">
        <div className="flex min-h-[34px] items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gm-ink/70">Adentro ahora</p>
          {turno}
        </div>
        <p className="flex items-end gap-4">
          <span className="font-display text-[96px] font-bold leading-[0.84] tracking-[-0.01em] tabular-nums">{total}</span>
          <span className="flex flex-col gap-0.5 pb-1 text-sm font-bold">
            <span>{porHora} por hora</span>
            <span className="text-gm-ink/70">{largas} por día, semana o mes</span>
          </span>
        </p>
        {(excedidos > 0 || vencidas > 0) && (
          <div className="flex flex-wrap gap-2">
            {excedidos > 0 && (
              <button type="button" aria-pressed={filtro === 'excedidos'} onClick={() => onFiltro(filtro === 'excedidos' ? 'todos' : 'excedidos')} className={aviso(filtro === 'excedidos')}>
                {excedidos === 1 ? '1 superó el tiempo avisado' : `${excedidos} superaron el tiempo avisado`}
                <ChevronRight className="size-4" aria-hidden />
              </button>
            )}
            {vencidas > 0 && (
              <button type="button" aria-pressed={filtro === 'vencidas'} onClick={() => onFiltro(filtro === 'vencidas' ? 'todos' : 'vencidas')} className={aviso(filtro === 'vencidas')}>
                {vencidas === 1 ? '1 estadía larga vencida' : `${vencidas} estadías largas vencidas`}
                <ChevronRight className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Entrar, cobrar y estadía larga ────────────────────────────────────────────

export function AccionesEscritorio({ onEntrada, onSalida, onEstadia, entradaRef, salidaRef, estadiaRef, ticketsHabilitados, atajos }: {
  onEntrada: () => void;
  onSalida: () => void;
  onEstadia: () => void;
  entradaRef?: Refe;
  salidaRef?: Refe;
  estadiaRef?: Refe;
  ticketsHabilitados: boolean;
  atajos: boolean;
}) {
  const accion = cn('group flex min-h-[132px] flex-col justify-between gap-5 rounded-[22px] border border-gm-line-strong bg-gm-surface-2 p-4 text-left transition-[border-color,transform] hover:border-gm-yellow active:scale-[0.98]', enfoque);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <button ref={entradaRef} type="button" onClick={onEntrada} aria-keyshortcuts={atajos ? 'E' : undefined} className={accion}>
          <span className="flex w-full items-center justify-between">
            <span className="grid size-12 place-items-center rounded-2xl bg-gm-yellow text-gm-ink"><CarFront className="size-6" aria-hidden /></span>
            {atajos && <Kbd>E</Kbd>}
          </span>
          <span>
            <span className="gm-display block text-[19px] leading-tight tracking-[0.04em]">Registrar entrada</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{ticketsHabilitados ? 'Patente, apellido o ticket' : 'Patente o apellido'}</span>
          </span>
        </button>
        <button ref={salidaRef} type="button" onClick={onSalida} aria-keyshortcuts={atajos ? 'S' : undefined} className={accion}>
          <span className="flex w-full items-center justify-between">
            <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-gm-ink"><Banknote className="size-6" aria-hidden /></span>
            {atajos && <Kbd>S</Kbd>}
          </span>
          <span>
            <span className="gm-display block text-[19px] leading-tight tracking-[0.04em]">Cobrar salida</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">O tocá un vehículo del tablero</span>
          </span>
        </button>
      </div>
      {/* Estadía larga es una operación como entrar o salir: se destaca. */}
      <button
        ref={estadiaRef}
        type="button"
        onClick={onEstadia}
        className={cn('group relative flex min-h-[76px] items-center gap-3.5 overflow-hidden rounded-[22px] border-[1.5px] border-gm-yellow/60 bg-gm-yellow/[0.1] px-4 py-3 text-left transition-colors hover:bg-gm-yellow/[0.16] active:scale-[0.99]', enfoque)}
      >
        <CalendarDays aria-hidden className="pointer-events-none absolute -bottom-3 right-10 size-20 text-gm-yellow/[0.1]" strokeWidth={1.5} />
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gm-yellow text-gm-ink"><CalendarPlus className="size-6" aria-hidden /></span>
        <span className="relative min-w-0 flex-1">
          <span className="gm-display block text-[19px] leading-tight tracking-[0.04em]">Estadía larga</span>
          <span className="block text-xs text-[#D9D1C3]">Por día, semana o mes · cobrás ahora o al retirar</span>
        </span>
        <ArrowUpRight className="relative size-5 shrink-0 text-gm-yellow transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </button>
    </div>
  );
}

// ── Lo último que pasó ────────────────────────────────────────────────────────

export function UltimosMovimientos({ registros, ahora, comprobantes, onComprobante, onTodos, refEl }: {
  registros: TicketRegistration[];
  ahora: number;
  comprobantes: boolean;
  onComprobante: (id: string, kind: 'ENTRY' | 'EXIT') => void;
  onTodos: () => void;
  refEl?: Refe;
}) {
  const ultimos = useMemo(
    () => [...registros].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4),
    [registros],
  );
  return (
    <section ref={refEl} aria-labelledby="ultimos-movimientos" className="rounded-[22px] border border-border bg-card px-4 pb-2 pt-3">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 id="ultimos-movimientos" className="text-sm font-bold">Últimos movimientos</h2>
        {comprobantes && (
          <button type="button" onClick={onTodos} aria-label="Ver todos los comprobantes" className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-1 text-[13px] font-semibold text-gm-yellow hover:underline', enfoque)}>
            <Receipt className="size-4" aria-hidden />
            Comprobantes
          </button>
        )}
      </div>
      {ultimos.length ? (
        <ul className="mt-1">
          {ultimos.map((r) => {
            const entrada = estaAdentro(r);
            const minutos = entrada ? minutesSinceEntry(r, ahora) : minutosDeEstadia(r);
            const hora = (entrada ? r.entryTime : r.departureTime)?.slice(0, 5) ?? '';
            return (
              <li key={r.id} className="flex min-h-[52px] items-center gap-2.5 border-t border-gm-line py-1.5 first:border-t-0">
                <span className={cn('grid size-[30px] shrink-0 place-items-center rounded-full', entrada ? 'bg-gm-surface-3 text-foreground' : 'bg-gm-yellow/15 text-gm-yellow')}>
                  {entrada ? <ArrowDownLeft className="size-4" strokeWidth={2.6} aria-hidden /> : <ArrowUpRight className="size-4" strokeWidth={2.6} aria-hidden />}
                </span>
                <Identidad r={r} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{entrada ? 'Entrada' : `Salida · ${formatImporte(r.price)}`}</span>
                  {minutos != null && <span className="block truncate text-xs text-muted-foreground">{entrada ? `hace ${formatEstadia(minutos)}` : `estuvo ${formatEstadia(minutos)}`}</span>}
                </span>
                <span className="gm-mono shrink-0 text-xs text-muted-foreground">{hora}</span>
                {comprobantes && (
                  <button
                    type="button"
                    onClick={() => onComprobante(r.id, entrada ? 'ENTRY' : 'EXIT')}
                    aria-label={`Comprobante de ${entrada ? 'entrada' : 'salida'} de ${nombreDe(r)}`}
                    className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] border border-gm-line text-muted-foreground transition-colors hover:border-gm-yellow/40 hover:text-gm-yellow', enfoque)}
                  >
                    <Receipt className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">Todavía no hay movimientos.</p>
      )}
    </section>
  );
}

// ── El tablero de la playa ────────────────────────────────────────────────────

function Columna({ titulo, color, caption, cantidad, total, atenuada, vacio, refEl, estadias, children }: {
  titulo: string;
  color: string;
  caption: string;
  cantidad: number;
  total: number;
  atenuada: boolean;
  vacio: string;
  refEl?: Refe;
  estadias?: boolean;
  children: ReactNode[];
}) {
  const parte = total ? Math.round((cantidad / total) * 100) : 0;
  return (
    <section ref={refEl} aria-label={titulo} className={cn('flex min-w-0 flex-col gap-2.5 rounded-[20px] border bg-card p-3 transition-opacity', estadias ? 'border-gm-yellow/30' : 'border-border', atenuada && 'opacity-60')}>
      <div className="flex flex-col gap-2.5 px-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <span aria-hidden className={cn('size-2.5 shrink-0', estadias ? 'rounded-[3px]' : 'rounded-full')} style={{ background: color }} />
              {titulo}
            </h3>
            <p title={caption} className="mt-1 truncate text-xs text-muted-foreground">{caption}</p>
          </div>
          <span className="font-display text-[30px] font-bold leading-[0.9] tabular-nums">{cantidad}</span>
        </div>
        {/* Qué parte de la playa está en este tramo. */}
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-gm-line">
          <div className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${parte}%`, background: color }} />
        </div>
      </div>
      {children.length ? (
        // El mismo desplazamiento de los comprobantes: cada columna baja sola, la pantalla no.
        <AnimatedScrollList label={`${titulo}: desplazá para ver más`} fondo="hsl(var(--card))" className="!max-h-[360px] xl:!max-h-[max(360px,calc(100dvh_-_340px))]">
          {children}
        </AnimatedScrollList>
      ) : (
        <p className="rounded-[14px] border border-dashed border-gm-line px-3 py-6 text-center text-xs text-muted-foreground">{vacio}</p>
      )}
    </section>
  );
}

function TarjetaTablero({ r, minutos, pasado, onSelect }: { r: TicketRegistration; minutos: number; pasado: boolean; onSelect: (r: TicketRegistration) => void }) {
  const detalle = [`Entró ${cuandoEntro(r)}`, r.lastNameCustomer || null, r.casilleroNumber ? `Casillero ${r.casilleroNumber}` : null].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={() => onSelect(r)}
      className={cn(
        'group relative flex w-full flex-col gap-1.5 overflow-hidden rounded-[14px] border p-2.5 pb-3 text-left transition-colors',
        enfoque,
        pasado ? 'border-[#F0714A]/50 bg-[#F0714A]/[0.08] hover:bg-[#F0714A]/[0.14]' : 'border-gm-line bg-gm-surface-2 hover:border-gm-line-strong hover:bg-gm-surface-3',
      )}
    >
      <span className="sr-only">Cobrar salida:</span>
      <span className="flex w-full items-center justify-between gap-2">
        <Identidad r={r} />
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-gm-yellow text-gm-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowRight className="size-4" />
        </span>
      </span>
      <span className="gm-mono text-[17px] font-bold leading-tight" style={{ color: pasado ? NARANJA_AVISO : tramoInfo(minutos).color }}>
        {formatEstadia(minutos)}
        {pasado && <span className="sr-only">, superó el tiempo avisado</span>}
      </span>
      <span className="truncate text-xs text-muted-foreground">{detalle}</span>
      {pasado && (
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#F0714A]">
          <Clock3 className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{avisoDe(r, minutos)}</span>
        </span>
      )}
      <LineaTramo minutos={minutos} pasado={pasado} />
    </button>
  );
}

function TarjetaEstadiaLarga({ r, vence, vencida, ahora, onSelect }: { r: TicketRegistrationForDay; vence: Date | null; vencida: boolean; ahora: number; onSelect: (id: string) => void }) {
  const fecha = vence ? fechaCorta(vence, ahora) : null;
  return (
    <button
      type="button"
      onClick={() => onSelect(r.id)}
      className={cn(
        'relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] border p-2.5 text-left transition-colors',
        enfoque,
        vencida ? 'border-[#F0714A]/50 bg-[#F0714A]/[0.08] hover:bg-[#F0714A]/[0.14]' : 'border-gm-line bg-gm-surface-2 hover:border-gm-line-strong hover:bg-gm-surface-3',
      )}
    >
      <span className="flex w-full flex-wrap items-center justify-between gap-1.5">
        {r.vehiclePlateCustomer ? (
          <PlateChip plate={r.vehiclePlateCustomer} size="sm" />
        ) : (
          <span className="inline-flex h-[33px] min-w-[96px] items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-muted-foreground/60 px-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Sin patente</span>
        )}
        <span className="rounded-md bg-gm-yellow/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-gm-yellow">{UNIDAD_ESTADIA_LARGA[r.ticketTimeType] ?? r.ticketTimeType}</span>
      </span>
      {r.lastNameCustomer && <span className="truncate text-xs text-muted-foreground">{r.lastNameCustomer}</span>}
      <span className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
        <span className={cn(vencida ? 'font-bold text-[#F0714A]' : 'text-muted-foreground')}>
          {!fecha ? 'Sin vencimiento' : vencida ? `Venció ${fecha}` : `Hasta ${fecha}`}
        </span>
        {r.paid ? (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-400"><Check className="size-3.5" strokeWidth={3} aria-hidden />Pagado</span>
        ) : (
          <span className="font-bold text-[#F0714A]">Debe {formatImporte(r.price)}</span>
        )}
      </span>
    </button>
  );
}

export function TableroPlaya({ activos, ahora, diaActivos, esDiaVencido, filtro, onFiltro, onCobrar, onAbrirDia, tableroRef, estadiasRef, debajo }: {
  activos: TicketRegistration[];
  ahora: number;
  diaActivos: TicketRegistrationForDay[];
  esDiaVencido: (r: TicketRegistrationForDay) => boolean;
  filtro: FiltroTablero;
  onFiltro: (filtro: FiltroTablero) => void;
  onCobrar: (r: TicketRegistration) => void;
  onAbrirDia: (id: string) => void;
  tableroRef?: Refe;
  estadiasRef?: Refe;
  debajo?: ReactNode;
}) {
  const total = activos.length + diaActivos.length;
  const conMinutos = activos.map((r) => ({ r, minutos: minutesSinceEntry(r, ahora) ?? 0, pasado: isOverdue(r, ahora) }));
  const excedidos = conMinutos.filter((v) => v.pasado).length;
  const estadias = diaActivos
    .map((r) => ({ r, vence: vencimientoEstadiaLarga(r), vencida: esDiaVencido(r) }))
    .sort((a, b) => Number(b.vencida) - Number(a.vencida) || (a.vence?.getTime() ?? Infinity) - (b.vence?.getTime() ?? Infinity));
  const vencidas = estadias.filter((e) => e.vencida).length;

  // Un filtro sin nada adentro no queda puesto: si sale el último, se vuelve a ver todo.
  useEffect(() => {
    if ((filtro === 'excedidos' && excedidos === 0) || (filtro === 'vencidas' && vencidas === 0)) onFiltro('todos');
  }, [filtro, excedidos, vencidas, onFiltro]);

  const columnas = TRAMOS.map((t) => {
    // Primero los que se pasaron; después, el que lleva más tiempo arriba (el que más cerca está de irse).
    const todos = conMinutos
      .filter((v) => tramoDe(v.minutos) === t.id)
      .sort((a, b) => Number(b.pasado) - Number(a.pasado) || b.minutos - a.minutos);
    // Debajo del título, cuánto lleva el que más tiempo está en ese tramo: dice hasta dónde llega la
    // columna sin tener que bajar.
    const masAntiguo = todos.reduce((max, v) => Math.max(max, v.minutos), 0);
    return {
      ...t,
      cantidad: todos.length,
      visibles: filtro === 'excedidos' ? todos.filter((v) => v.pasado) : filtro === 'vencidas' ? [] : todos,
      caption: todos.length ? `El más antiguo: ${formatEstadia(masAntiguo)}` : 'Ninguno ahora',
    };
  });
  const estadiasVisibles = filtro === 'excedidos' ? [] : filtro === 'vencidas' ? estadias.filter((e) => e.vencida) : estadias;

  const chip = (activo: boolean, alerta = false) => cn(
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors',
    enfoque,
    activo ? 'bg-foreground text-card' : alerta ? 'bg-gm-orange/15 text-[#F0714A] hover:bg-gm-orange/25' : 'border border-gm-line-strong bg-card text-[#D9D1C3] hover:text-foreground',
  );

  return (
    <section ref={tableroRef} aria-labelledby="titulo-tablero" className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="titulo-tablero" className="text-[26px] font-bold leading-none tracking-tight">En la playa</h2>
          <p className="text-[13px] text-muted-foreground">{total === 1 ? '1 vehículo' : `${total} vehículos`} · el color dice hace cuánto entraron</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span aria-hidden className="size-[7px] rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            En vivo
          </span>
        </div>
        <div role="group" aria-label="Filtrar el tablero" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={filtro === 'todos'} onClick={() => onFiltro('todos')} className={chip(filtro === 'todos')}>Todos · {total}</button>
          {excedidos > 0 && (
            <button type="button" aria-pressed={filtro === 'excedidos'} onClick={() => onFiltro('excedidos')} className={chip(filtro === 'excedidos', true)}>
              {filtro !== 'excedidos' && <span aria-hidden className="size-[7px] rounded-full bg-[#F0714A]" />}Tiempo superado · {excedidos}
            </button>
          )}
          {vencidas > 0 && (
            <button type="button" aria-pressed={filtro === 'vencidas'} onClick={() => onFiltro('vencidas')} className={chip(filtro === 'vencidas', true)}>
              {filtro !== 'vencidas' && <span aria-hidden className="size-[7px] rounded-full bg-[#F0714A]" />}Vencidas · {vencidas}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-3 xl:grid-cols-4">
        {columnas.map((c) => (
          <Columna
            key={c.id}
            titulo={c.label}
            color={c.color}
            caption={c.caption}
            cantidad={c.cantidad}
            total={total}
            atenuada={filtro !== 'todos' && c.visibles.length === 0}
            vacio={filtro === 'todos' ? 'Ningún vehículo en este tramo.' : 'Ninguno con aviso en este tramo.'}
          >
            {c.visibles.map((v) => <TarjetaTablero key={v.r.id} r={v.r} minutos={v.minutos} pasado={v.pasado} onSelect={onCobrar} />)}
          </Columna>
        ))}
        <Columna
          refEl={estadiasRef}
          estadias
          titulo="Estadías largas"
          color={AMARILLO}
          caption="Día, semana o mes"
          cantidad={diaActivos.length}
          total={total}
          atenuada={filtro === 'excedidos' || (filtro === 'vencidas' && estadiasVisibles.length === 0)}
          vacio={filtro === 'todos' ? 'No hay estadías largas.' : 'Ninguna vencida.'}
        >
          {estadiasVisibles.map((e) => <TarjetaEstadiaLarga key={e.r.id} r={e.r} vence={e.vence} vencida={e.vencida} ahora={ahora} onSelect={onAbrirDia} />)}
        </Columna>
      </div>
      {debajo}
    </section>
  );
}

// ── Buscador de arriba ────────────────────────────────────────────────────────

type Opcion =
  | { tipo: 'hora'; id: string; r: TicketRegistration; minutos: number; pasado: boolean }
  | { tipo: 'larga'; id: string; r: TicketRegistrationForDay; vence: Date | null; vencida: boolean }
  | { tipo: 'salida'; id: string; r: TicketRegistration }
  | { tipo: 'entrada'; id: string };

// Escribir parte de la patente, la ficha o el apellido y apretar Enter cobra al que está primero;
// con las flechas se elige otro. Si no está adentro, la última opción abre la entrada con lo escrito.
export function BuscadorRapido({ inputRef, activos, diaActivos, esDiaVencido, registros, ahora, ticketsHabilitados, comprobantes, atajo, onCobrar, onAbrirDia, onComprobante, onEntrada }: {
  inputRef: RefObject<HTMLInputElement | null>;
  activos: TicketRegistration[];
  diaActivos: TicketRegistrationForDay[];
  esDiaVencido: (r: TicketRegistrationForDay) => boolean;
  registros: TicketRegistration[];
  ahora: number;
  ticketsHabilitados: boolean;
  comprobantes: boolean;
  atajo: boolean;
  onCobrar: (id: string) => void;
  onAbrirDia: (id: string) => void;
  onComprobante: (id: string, kind: 'ENTRY' | 'EXIT') => void;
  onEntrada: (texto: string) => void;
}) {
  const base = useId();
  const [texto, setTexto] = useState('');
  const [enfocado, setEnfocado] = useState(false);
  const [elegida, setElegida] = useState(0);
  const buscado = normalizar(texto);
  const hoy = dayjs(ahora).tz(TZ).format('YYYY-MM-DD');

  const opciones = useMemo<Opcion[]>(() => {
    if (!buscado) return [];
    const coincide = (...valores: (string | null | undefined)[]) => valores.some((v) => !!v && normalizar(v).includes(buscado));
    const alPrincipio = (v?: string | null) => (v && normalizar(v).startsWith(buscado) ? 0 : 1);
    const hora: Opcion[] = activos
      .filter((r) => coincide(r.licensePlateOriginal, r.ticket?.codeBar, r.codeBarTicket, r.lastNameCustomer, r.casilleroNumber))
      .map((r) => ({ tipo: 'hora' as const, id: `${base}-h-${r.id}`, r, minutos: minutesSinceEntry(r, ahora) ?? 0, pasado: isOverdue(r, ahora) }))
      .sort((a, b) => alPrincipio(a.r.licensePlateOriginal) - alPrincipio(b.r.licensePlateOriginal) || b.minutos - a.minutos)
      .slice(0, 6);
    const largas: Opcion[] = diaActivos
      .filter((r) => coincide(r.vehiclePlateCustomer, r.lastNameCustomer))
      .slice(0, 3)
      .map((r) => ({ tipo: 'larga' as const, id: `${base}-l-${r.id}`, r, vence: vencimientoEstadiaLarga(r), vencida: esDiaVencido(r) }));
    const salidas: Opcion[] = comprobantes
      ? registros
        .filter((r) => !estaAdentro(r) && r.departureDay === hoy && coincide(r.licensePlateOriginal, r.ticket?.codeBar, r.codeBarTicket, r.lastNameCustomer))
        .sort((a, b) => (b.departureTime ?? '').localeCompare(a.departureTime ?? ''))
        .slice(0, 3)
        .map((r) => ({ tipo: 'salida' as const, id: `${base}-s-${r.id}`, r }))
      : [];
    return [...hora, ...largas, ...salidas, { tipo: 'entrada', id: `${base}-entrada` }];
  }, [buscado, activos, diaActivos, esDiaVencido, registros, ahora, comprobantes, hoy, base]);

  useEffect(() => setElegida(0), [buscado]);

  const abierto = enfocado && !!buscado;
  const activar = (op: Opcion) => {
    if (op.tipo === 'hora') onCobrar(op.r.id);
    else if (op.tipo === 'larga') onAbrirDia(op.r.id);
    else if (op.tipo === 'salida') onComprobante(op.r.id, 'EXIT');
    else onEntrada(texto.trim());
    setTexto('');
    inputRef.current?.blur();
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && opciones.length) {
      e.preventDefault();
      setElegida((i) => Math.min(opciones.length - 1, i + 1));
    } else if (e.key === 'ArrowUp' && opciones.length) {
      e.preventDefault();
      setElegida((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && abierto && opciones[elegida]) {
      e.preventDefault();
      activar(opciones[elegida]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (texto) setTexto('');
      else inputRef.current?.blur();
    }
  };

  const grupos = [
    { id: 'hora', titulo: 'Adentro', items: opciones.filter((o) => o.tipo === 'hora') },
    { id: 'larga', titulo: 'Estadías largas', items: opciones.filter((o) => o.tipo === 'larga') },
    { id: 'salida', titulo: 'Salieron hoy', items: opciones.filter((o) => o.tipo === 'salida') },
  ].filter((g) => g.items.length);

  const fila = (op: Opcion, contenido: ReactNode, accion: string) => {
    const indice = opciones.indexOf(op);
    const elegido = indice === elegida;
    return (
      <div
        key={op.id}
        id={op.id}
        role="option"
        aria-selected={elegido}
        // El foco se queda en el buscador: así Enter y las flechas siguen funcionando.
        onMouseDown={(e) => e.preventDefault()}
        onMouseMove={() => setElegida(indice)}
        onClick={() => activar(op)}
        className={cn('flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[14px] border px-2.5 py-2', elegido ? 'border-gm-yellow/45 bg-gm-yellow/[0.08]' : 'border-transparent')}
      >
        {contenido}
        {elegido ? (
          <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-gm-yellow pl-3.5 pr-2 text-[13px] font-bold text-gm-ink">
            {accion}
            <kbd aria-hidden className="gm-mono grid h-[22px] min-w-[22px] place-items-center rounded-md bg-gm-ink/15 px-1 text-xs">↵</kbd>
          </span>
        ) : (
          <span className="inline-flex h-9 shrink-0 items-center rounded-[10px] border border-gm-line-strong px-3 text-[13px] font-semibold text-[#D9D1C3]">{accion}</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-[340px] max-w-full shrink xl:w-[400px]">
      <label htmlFor={`${base}-buscar`} className="sr-only">Buscar un vehículo</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        id={`${base}-buscar`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${base}-resultados`}
        aria-activedescendant={abierto ? opciones[elegida]?.id : undefined}
        aria-autocomplete="list"
        aria-keyshortcuts={atajo ? '/' : undefined}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        onKeyDown={alTeclear}
        placeholder={ticketsHabilitados ? 'Buscar patente, ticket o apellido' : 'Buscar patente o apellido'}
        autoComplete="off"
        spellCheck={false}
        className="h-12 w-full rounded-[16px] border-[1.5px] border-gm-line-strong bg-card pl-11 pr-14 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-gm-yellow focus:shadow-[0_0_0_4px_hsl(var(--gm-yellow)/0.15)]"
      />
      {atajo && !enfocado && !texto && <Kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">/</Kbd>}
      {enfocado && texto && <Kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">Esc</Kbd>}

      {abierto && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(600px,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-gm-line-strong bg-card shadow-[0_30px_80px_-12px_rgba(0,0,0,0.75)] animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div id={`${base}-resultados`} role="listbox" aria-label="Resultados de la búsqueda" className="max-h-[min(520px,70dvh)] overflow-y-auto p-2">
            {grupos.length === 0 && (
              <p className="px-2.5 pb-2 pt-2.5 text-sm text-muted-foreground">No hay ningún vehículo adentro con «{texto.trim()}».</p>
            )}
            {grupos.map((g) => (
              <div key={g.id} role="group" aria-labelledby={`${base}-g-${g.id}`} className="mb-1.5">
                <p id={`${base}-g-${g.id}`} className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {g.titulo} · {g.items.length}
                </p>
                {g.items.map((op) => {
                  if (op.tipo === 'hora') {
                    return fila(op, (
                      <>
                        <Identidad r={op.r} resaltar={texto} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-sm font-bold">Entró {cuandoEntro(op.r)}</span>
                            <span className="gm-mono shrink-0 text-[13px] font-bold" style={{ color: op.pasado ? NARANJA_AVISO : tramoInfo(op.minutos).color }}>{formatEstadia(op.minutos)}</span>
                          </span>
                          <span className={cn('block truncate text-xs', op.pasado ? 'font-semibold text-[#F0714A]' : 'text-muted-foreground')}>
                            {op.pasado ? avisoDe(op.r, op.minutos) : op.r.lastNameCustomer || 'Por hora'}
                          </span>
                        </span>
                      </>
                    ), 'Cobrar salida');
                  }
                  if (op.tipo === 'larga') {
                    const fecha = op.vence ? fechaCorta(op.vence, ahora) : null;
                    return fila(op, (
                      <>
                        {op.r.vehiclePlateCustomer ? <PlateChip plate={op.r.vehiclePlateCustomer} size="sm" highlight={texto} /> : <span className="inline-flex h-[33px] min-w-[96px] items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-muted-foreground/60 px-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Sin patente</span>}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">Estadía · {UNIDAD_ESTADIA_LARGA[op.r.ticketTimeType] ?? op.r.ticketTimeType}</span>
                          <span className={cn('block truncate text-xs', op.vencida || !op.r.paid ? 'font-semibold text-[#F0714A]' : 'text-muted-foreground')}>
                            {fecha ? (op.vencida ? `Venció ${fecha}` : `Hasta ${fecha}`) : 'Sin vencimiento'} · {op.r.paid ? 'Pagado' : `Debe ${formatImporte(op.r.price)}`}
                          </span>
                        </span>
                      </>
                    ), 'Abrir');
                  }
                  if (op.tipo === 'salida') {
                    const minutos = minutosDeEstadia(op.r);
                    return fila(op, (
                      <>
                        <span className="opacity-75"><Identidad r={op.r} resaltar={texto} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">Salió {op.r.departureTime?.slice(0, 5)} · {formatImporte(op.r.price)}</span>
                          <span className="block truncate text-xs text-muted-foreground">{minutos != null ? `Estuvo ${formatEstadia(minutos)}` : 'Salida registrada'}</span>
                        </span>
                      </>
                    ), 'Comprobante');
                  }
                  return null;
                })}
              </div>
            ))}
            {opciones.filter((o) => o.tipo === 'entrada').map((op) => fila(op, (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gm-surface-3 text-gm-yellow"><LogIn className="size-[18px]" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{grupos.length ? '¿Es otro vehículo? ' : ''}Registrar entrada</span>
                  <span className="block truncate text-xs text-muted-foreground">Se abre con «{texto.trim()}» ya escrito</span>
                </span>
              </>
            ), 'Entrada'))}
          </div>
          <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gm-line bg-background/60 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>elegir</span>
            <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd>abrir el elegido</span>
            <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd>cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
}
