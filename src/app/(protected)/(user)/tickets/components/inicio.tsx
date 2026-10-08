'use client';

// Piezas del inicio de «Entradas y salidas»: la tarjeta amarilla con lo que hay adentro, la fila
// de cada vehículo, la lista completa agrupada por hace cuánto están y la barra de abajo del
// celular (Entrada · Escanear · Salida). Las decisiones de qué abrir las toma ticket.card.tsx.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CarFront, ChevronLeft, ChevronRight, Search, Banknote } from 'lucide-react';
import { AnimatedScrollList } from '@/components/animated-scroll-list';
import { PlateChip } from '@/components/plate-chip';
import { cn } from '@/lib/utils';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { Ticket } from '@/types/ticket.type';
import { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { isBarcodeOrigin, isOverdue, isTicketActive, latestRegistrationForTicket, minutesSinceEntry } from '@/utils/ticket-registration.utils';
import { cuandoEntro, formatEstadia, progresoEnTramo, tramoDe, tramoInfo, TRAMOS } from '@/utils/estadia';
import { DayRegistrationsPanel } from './day-registrations-panel';

// Sin tildes antes de quitar lo que no es letra o número: «Gómez» se encuentra escribiendo «gomez».
export const normalizar = (valor: string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const estaAdentro = (r: TicketRegistration) => !r.departureTime && !r.departureDay;

export const NARANJA_AVISO = '#F0714A';

// La línea fina al pie de cada vehículo: el color de su tramo, llena según cuánto le falta para
// pasar al siguiente. Si se pasó del tiempo avisado, naranja.
export function LineaTramo({ minutos, pasado }: { minutos: number; pasado: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.05]">
      <span
        className="block h-full rounded-r-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.max(4, Math.round(progresoEnTramo(minutos) * 100))}%`, background: pasado ? NARANJA_AVISO : tramoInfo(minutos).color }}
      />
    </span>
  );
}

// ── Tarjeta principal ─────────────────────────────────────────────────────────

export function InicioHero({
  total,
  porHora,
  ahora,
  excedidos,
  vencidas,
  turno,
  onExcedidos,
  onVencidas,
  onZona,
}: {
  total: number;
  porHora: TicketRegistration[];
  ahora: number;
  excedidos: number;
  vencidas: number;
  turno: React.ReactNode;
  onExcedidos: () => void;
  onVencidas: () => void;
  onZona: () => void;
}) {
  return (
    <section aria-label="La playa ahora" className="relative overflow-hidden rounded-[26px] bg-gm-yellow text-gm-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]">
      <div aria-hidden className="h-2.5" style={{ backgroundImage: 'repeating-linear-gradient(135deg, hsl(var(--gm-ink)) 0 9px, hsl(var(--gm-yellow)) 9px 18px)' }} />
      {/* La «E» del cartel de estacionamiento, apenas marcada. */}
      <span aria-hidden className="pointer-events-none absolute -right-4 top-8 grid size-[140px] place-items-center rounded-[30px] border-[10px] border-gm-ink/[0.08] font-display text-[104px] font-bold leading-none text-gm-ink/[0.08]">E</span>
      <div className="relative flex flex-col gap-1 px-[18px] pb-4 pt-3.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gm-ink/70">Adentro ahora</p>
        <p className="flex items-baseline gap-2.5">
          <span className="font-display text-[84px] font-bold leading-[0.92] tracking-[-0.01em] tabular-nums">{total}</span>
          <span className="text-base font-bold">{total === 1 ? 'vehículo' : 'vehículos'}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {turno}
          {excedidos > 0 && (
            <button type="button" onClick={onExcedidos} className="inline-flex h-[34px] items-center gap-1 rounded-full bg-gm-ink pl-3 pr-2 text-[12.5px] font-bold text-[#F0714A] transition-transform active:scale-95">
              {excedidos === 1 ? '1 superó el tiempo avisado' : `${excedidos} superaron el tiempo avisado`}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          )}
          {vencidas > 0 && (
            <button type="button" onClick={onVencidas} className="inline-flex h-[34px] items-center gap-1 rounded-full bg-gm-ink pl-3 pr-2 text-[12.5px] font-bold text-[#F0714A] transition-transform active:scale-95">
              {vencidas === 1 ? '1 estadía larga vencida' : `${vencidas} estadías largas vencidas`}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <TiempoAdentro porHora={porHora} ahora={ahora} onZona={onZona} />
    </section>
  );
}

// ── Hace cuánto están: una línea de tiempo con un punto por vehículo ───────────

// Los mismos tres tramos que las columnas de la computadora, en chico: cada uno con su color, cuántos
// hay y una fila de cocheras (una por vehículo, en naranja los que se pasaron del tiempo avisado).
// Un tramo vacío muestra cocheras libres en vez de un hueco.
const COCHERAS_A_LA_VISTA = 5;

function TiempoAdentro({ porHora, ahora, onZona }: { porHora: TicketRegistration[]; ahora: number; onZona: () => void }) {
  // Las cocheras se ocupan una tras otra al abrir el inicio.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const zonas = TRAMOS.map((zona) => {
    const autos = porHora
      .map((r) => ({ r, minutos: minutesSinceEntry(r, ahora) ?? 0, pasado: isOverdue(r, ahora) }))
      .filter(({ minutos }) => tramoDe(minutos) === zona.id)
      .sort((a, b) => Number(b.pasado) - Number(a.pasado) || b.minutos - a.minutos);
    const pasados = autos.filter((a) => a.pasado).length;
    // Si no entran todas, se deja lugar para el «+N».
    const visibles = autos.length > COCHERAS_A_LA_VISTA + 1 ? autos.slice(0, COCHERAS_A_LA_VISTA) : autos;
    return { ...zona, cantidad: autos.length, pasados, visibles, resto: autos.length - visibles.length };
  });

  return (
    <div className="relative bg-card px-[18px] pb-4 pt-3.5 text-foreground">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Hace cuánto están <span className="font-medium normal-case tracking-normal">· por hora</span>
        </p>
        {porHora.length > 0 && (
          <button type="button" onClick={onZona} className="-my-2 inline-flex min-h-9 items-center gap-0.5 rounded-full pl-2 text-xs font-semibold text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
            Ver todos<ChevronRight className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {zonas.map((zona, z) => (
          <button
            key={zona.id}
            type="button"
            onClick={onZona}
            aria-label={`${zona.cantidad} ${zona.label.toLowerCase()}${zona.pasados ? `, ${zona.pasados} superaron el tiempo avisado` : ''}. Ver la lista`}
            className="flex min-h-[104px] min-w-0 flex-col rounded-[16px] border bg-gm-surface-2 p-2.5 text-left transition-[background-color,transform] hover:bg-gm-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow active:scale-[0.97]"
            style={{ borderColor: zona.cantidad ? `${zona.color}59` : 'hsl(var(--gm-line))' }}
          >
            <span className="flex w-full items-start justify-between gap-1">
              <span className="font-display text-[34px] font-bold leading-none tabular-nums" style={{ color: zona.cantidad ? '#F2EDE3' : '#5C554B' }}>
                {zona.cantidad}
              </span>
              <span aria-hidden className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: zona.color }} />
            </span>
            <span className="mt-1 text-[11.5px] font-semibold leading-tight text-[#D9D1C3]">{zona.label}</span>
            <span aria-hidden className="mt-auto flex flex-wrap items-center gap-[3px] pt-2">
              {zona.cantidad === 0
                ? Array.from({ length: 3 }, (_, i) => <span key={i} className="h-[13px] w-[9px] rounded-[3px] border border-dashed border-gm-line-strong" />)
                : zona.visibles.map((a, i) => (
                  <span
                    key={a.r.id}
                    className="h-[13px] w-[9px] rounded-[3px] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      background: a.pasado ? NARANJA_AVISO : zona.color,
                      transform: listo ? 'scale(1)' : 'scale(0.2)',
                      opacity: listo ? 1 : 0,
                      transitionDelay: `${Math.min(z * 90 + i * 45, 600)}ms`,
                    }}
                  />
                ))}
              {zona.resto > 0 && <span className="gm-mono ml-0.5 text-[10.5px] font-bold text-muted-foreground">+{zona.resto}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Un vehículo ───────────────────────────────────────────────────────────────

export function VehiculoFila({ r, ahora, onSelect, resaltar }: {
  r: TicketRegistration;
  ahora: number;
  onSelect: (r: TicketRegistration) => void;
  resaltar?: string;
}) {
  const minutos = minutesSinceEntry(r, ahora) ?? 0;
  const pasado = isOverdue(r, ahora);
  const ficha = isBarcodeOrigin(r) ? (r.ticket?.codeBar ?? r.codeBarTicket ?? '—') : null;
  const detalle = [
    r.lastNameCustomer || null,
    `Entró ${cuandoEntro(r)}`,
    r.casilleroNumber ? `Casillero ${r.casilleroNumber}` : null,
    pasado && r.expectedBracketLabel ? `avisó ${r.expectedBracketLabel}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={() => onSelect(r)}
      className="relative flex min-h-[68px] w-full items-center gap-3.5 overflow-hidden rounded-[20px] border border-[#2A2620] bg-card py-2.5 pl-3 pr-3.5 text-left transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow active:scale-[0.99]"
    >
      {ficha ? (
        <span className="gm-mono inline-flex h-[33px] min-w-[96px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-gm-line-strong bg-gm-surface-3 px-2 text-[13.5px] font-bold">Ficha {ficha}</span>
      ) : r.noPlate ? (
        <span className="inline-flex h-[33px] min-w-[96px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-muted-foreground/60 px-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Sin patente</span>
      ) : (
        <PlateChip plate={r.licensePlateOriginal || '—'} size="sm" highlight={resaltar} />
      )}
      <span className="min-w-0 flex-1">
        <span className="gm-mono flex items-center gap-1.5 text-base font-bold" style={{ color: pasado ? NARANJA_AVISO : tramoInfo(minutos).color }}>
          {pasado && <span aria-hidden className="size-[7px] rounded-full bg-[#F0714A]" />}
          {formatEstadia(minutos)}
          {pasado && <span className="sr-only">, superó el tiempo avisado</span>}
        </span>
        <span className="block truncate text-[12.5px] text-muted-foreground">{detalle}</span>
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-[#6F665A]" aria-hidden />
      <LineaTramo minutos={minutos} pasado={pasado} />
    </button>
  );
}

// ── Encabezado de las vistas internas (lista completa, comprobantes) ──────────

// Reemplaza al del inicio: volver, de dónde se viene y el título, sin repetir «Entradas y salidas»
// en grande arriba de otro título.
export function EncabezadoVista({ titulo, cantidad, onVolver, acciones }: {
  titulo: string;
  cantidad?: number;
  onVolver: () => void;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <button type="button" onClick={onVolver} aria-label="Volver al inicio" className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
        <ChevronLeft className="size-[22px]" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-muted-foreground">Entradas y salidas</p>
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">
          {titulo}
          {cantidad !== undefined && <span className="gm-mono ml-2 text-lg font-semibold text-muted-foreground">{cantidad}</span>}
        </h1>
      </div>
      {acciones && <div className="shrink-0">{acciones}</div>}
    </header>
  );
}

// ── Lista completa ────────────────────────────────────────────────────────────

export type FiltroVehiculos = 'hora' | 'excedidos' | 'dia';

export function TodosLosVehiculos({
  activos,
  ahora,
  filtro,
  onFiltro,
  onSelect,
  onVolver,
  diaActivos,
  diaVencidos,
  esDiaVencido,
  onSelectDia,
  fichas,
  listaRef,
  diaRef,
  acciones,
}: {
  // A la derecha del título (el botón de Ayuda): esta vista reemplaza el encabezado del inicio.
  acciones?: React.ReactNode;
  activos: TicketRegistration[];
  ahora: number;
  filtro: FiltroVehiculos;
  onFiltro: (filtro: FiltroVehiculos) => void;
  onSelect: (r: TicketRegistration) => void;
  onVolver: () => void;
  diaActivos: TicketRegistrationForDay[];
  diaVencidos: TicketRegistrationForDay[];
  esDiaVencido: (r: TicketRegistrationForDay) => boolean;
  onSelectDia: (id: string) => void;
  fichas?: React.ReactNode;
  listaRef?: (el: HTMLElement | null) => void;
  diaRef?: (el: HTMLElement | null) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const total = activos.length + diaActivos.length;
  const pasados = activos.filter((r) => isOverdue(r, ahora));
  const conMinutos = activos
    .map((r) => ({ r, minutos: minutesSinceEntry(r, ahora) ?? 0 }))
    .sort((a, b) => a.minutos - b.minutos);
  const buscado = normalizar(busqueda);
  const coincide = (r: TicketRegistration) => !buscado || [
    r.licensePlateOriginal ?? '', r.ticket?.codeBar ?? '', r.codeBarTicket ?? '', r.lastNameCustomer ?? '', r.casilleroNumber ?? '',
  ].some((valor) => normalizar(valor).includes(buscado));

  // El filtro de los que superaron su tiempo solo existe si hay alguno: si el último sale, se
  // vuelve a la lista por hora en vez de quedar en un filtro vacío.
  useEffect(() => {
    if (filtro === 'excedidos' && pasados.length === 0) onFiltro('hora');
  }, [filtro, pasados.length, onFiltro]);

  // Con muchos vehículos, agrupados por hace cuánto están y cada grupo con su propio desplazamiento
  // (el mismo de los comprobantes): nunca una lista interminable. Los que superaron el tiempo
  // avisado van primero y solo ahí.
  const grupos = [
    { id: 'pasados', titulo: 'Superaron el tiempo avisado', alerta: true, color: NARANJA_AVISO, filas: conMinutos.filter(({ r }) => isOverdue(r, ahora)) },
    ...TRAMOS.map((t) => ({
      id: t.id,
      titulo: t.id === 'menos1' ? 'Hace menos de 1 h' : t.id === 'de1a4' ? 'De 1 a 4 h' : 'Hace más de 4 h',
      alerta: false,
      color: t.color,
      filas: conMinutos.filter(({ r, minutos }) => !isOverdue(r, ahora) && tramoDe(minutos) === t.id),
    })),
  ].filter((g) => g.filas.length);

  const chip = (activo: boolean, alerta = false) => cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
    activo ? 'bg-foreground text-card' : alerta ? 'bg-gm-orange/15 text-[#F0714A]' : 'bg-card text-[#D9D1C3] hover:text-foreground',
  );

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoVista titulo="En la playa" cantidad={total} onVolver={onVolver} acciones={acciones} />

      <div role="group" aria-label="Filtrar" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <button type="button" aria-pressed={filtro === 'hora'} onClick={() => onFiltro('hora')} className={chip(filtro === 'hora')}>Por hora · {activos.length}</button>
        {pasados.length > 0 && (
          <button type="button" aria-pressed={filtro === 'excedidos'} onClick={() => onFiltro('excedidos')} className={chip(filtro === 'excedidos', true)}>
            {filtro !== 'excedidos' && <span aria-hidden className="size-[7px] rounded-full bg-[#F0714A]" />}Tiempo superado · {pasados.length}
          </button>
        )}
        <button type="button" aria-pressed={filtro === 'dia'} onClick={() => onFiltro('dia')} className={chip(filtro === 'dia')}>Día/Sem/Mes · {diaActivos.length}</button>
      </div>

      {filtro === 'dia' ? (
        <div ref={diaRef} className="rounded-[20px] border border-border bg-card p-4">
          <DayRegistrationsPanel active={diaActivos} overdue={diaVencidos} isOverdue={esDiaVencido} onSelect={onSelectDia} />
        </div>
      ) : (
        <div ref={listaRef} className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="buscar-en-la-playa" className="sr-only">Buscar vehículo adentro</label>
            <input
              id="buscar-en-la-playa"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar patente, ficha o apellido"
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-full border-[1.5px] border-border bg-card pl-11 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gm-yellow"
            />
          </div>

          {buscado || filtro === 'excedidos' ? (
            (() => {
              const filas = (filtro === 'excedidos' ? pasados : activos).filter(coincide);
              return filas.length ? (
                <AnimatedScrollList key={`${filtro}-${buscado}`} label="Vehículos encontrados: desplazá para ver más">
                  {filas.map((r) => <VehiculoFila key={r.id} r={r} ahora={ahora} onSelect={onSelect} resaltar={busqueda} />)}
                </AnimatedScrollList>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {filtro === 'excedidos' && !buscado ? 'Ningún vehículo superó el tiempo avisado.' : 'No encontramos ese vehículo. Probá escaneando la patente.'}
                </p>
              );
            })()
          ) : grupos.length ? (
            grupos.map((g) => (
              <section key={g.id} aria-label={g.titulo} className="flex flex-col gap-2">
                <p className={cn('flex items-center gap-2 px-1 text-[13px] font-bold', g.alerta ? 'text-[#F0714A]' : 'text-[#D9D1C3]')}>
                  <span aria-hidden className="size-2 rounded-full" style={{ background: g.color }} />
                  {g.titulo}<span className="gm-mono font-semibold text-[#6F665A]">{g.filas.length}</span>
                </p>
                <AnimatedScrollList label={`${g.titulo}: desplazá para ver más`}>
                  {g.filas.map(({ r }) => <VehiculoFila key={r.id} r={r} ahora={ahora} onSelect={onSelect} />)}
                </AnimatedScrollList>
              </section>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay vehículos por hora adentro.</p>
          )}

          {filtro === 'hora' && !buscado && fichas}
        </div>
      )}
    </div>
  );
}

// ── Fichas físicas (código de barras) ─────────────────────────────────────────

export function FichasEnElPlayon({ catalogo, registros, ahora, recienEscaneada, isAdmin, onFicha }: {
  catalogo: Ticket[];
  registros: TicketRegistration[];
  ahora: number;
  recienEscaneada: string | null;
  isAdmin: boolean;
  onFicha: (ticket: Ticket, registro: TicketRegistration) => void;
}) {
  const activas = catalogo.filter((t) => isTicketActive(t, registros));
  return (
    <section aria-label="Fichas en el playón" className="rounded-[20px] border border-border bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Fichas en el playón</h3>
        <div className="flex items-center gap-2">
          {isAdmin && <Link href="/admin/configuracion/operacion#tarjetas" className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-gm-yellow/10 hover:text-gm-yellow" aria-label="Crear tarjeta física">+ Crear</Link>}
          <span className="gm-mono text-[11px] text-muted-foreground">{activas.length}/{catalogo.length}</span>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Tocá una ficha activa para avisar duración o cobrar por adelantado.</p>
      {catalogo.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-[7px]">
          {catalogo.map((t) => {
            const registro = isTicketActive(t, registros) ? latestRegistrationForTicket(t, registros) : null;
            const pasada = registro ? isOverdue(registro, ahora) : false;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!registro}
                onClick={() => registro && onFicha(t, registro)}
                title={pasada ? `Ticket ${t.codeBar} · se pasó de la duración avisada` : registro ? `Ticket ${t.codeBar} · activo` : `Ticket ${t.codeBar} · libre`}
                style={pasada ? { animation: 'gm-chip-overdue 1.3s ease-in-out infinite' } : t.id === recienEscaneada ? { animation: 'gm-chippulse 1.1s ease-in-out 2' } : undefined}
                className={cn(
                  'gm-mono grid h-[30px] min-w-0 place-items-center rounded-[7px] border px-1 font-bold transition-shadow',
                  t.codeBar.length <= 5 ? 'text-[10px]' : t.codeBar.length <= 8 ? 'text-[8.5px]' : 'text-[7px]',
                  pasada ? 'border-destructive/60 bg-destructive text-white' : registro ? 'border-gm-yellow/60 bg-gm-yellow text-gm-ink' : 'cursor-default border-border bg-gm-surface-2 text-muted-foreground',
                )}
              >
                <span className="w-full truncate text-center">{t.codeBar}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No hay tickets registrados.</p>
      )}
    </section>
  );
}

// ── Barra de abajo del celular ────────────────────────────────────────────────

export function MostradorDock({ onEntrada, onSalida, escanear, entradaRef, salidaRef }: {
  onEntrada: () => void;
  onSalida: () => void;
  escanear: React.ReactNode | null;
  entradaRef?: (el: HTMLElement | null) => void;
  salidaRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-b from-transparent to-background lg:hidden" />
      <nav
        aria-label="Acciones del mostrador"
        className={cn(
          'fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),14px)] z-40 grid h-[76px] items-center gap-1.5 rounded-[28px] border border-white/[0.08] bg-[#1F1C17]/95 px-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur lg:hidden',
          escanear ? 'grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)]' : 'grid-cols-2',
        )}
      >
        <button ref={entradaRef} type="button" onClick={onEntrada} className="flex h-14 min-w-0 items-center gap-2.5 rounded-[20px] bg-gm-yellow pl-2 pr-3 text-left text-gm-ink transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-gm-ink text-gm-yellow"><CarFront className="size-5" aria-hidden /></span>
          <span className="flex min-w-0 flex-col leading-[1.05]"><span className="gm-display text-[17px] tracking-[0.04em]">Entrada</span><span className="text-[11px] font-semibold opacity-70">Registrar</span></span>
        </button>
        {escanear}
        <button ref={salidaRef} type="button" onClick={onSalida} className="flex h-14 min-w-0 items-center justify-end gap-2.5 rounded-[20px] bg-[#2E2A23] pl-3 pr-2 text-right text-foreground transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          <span className="flex min-w-0 flex-col leading-[1.05]"><span className="gm-display text-[17px] tracking-[0.04em]">Salida</span><span className="text-[11px] font-semibold text-muted-foreground">Cobrar</span></span>
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-background text-gm-yellow"><Banknote className="size-5" aria-hidden /></span>
        </button>
      </nav>
    </>
  );
}
