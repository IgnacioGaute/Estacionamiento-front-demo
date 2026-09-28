'use client';

// La sección de inquilinos: a quién buscar, cuánto tiene pendiente (y si ya venció) y cobrarle
// desde la lista. El detalle de cada uno está en su cuenta.
//
// Los indicadores no mezclan cosas distintas: lo cobrado en el mes (de cualquier período) va por
// un lado y lo que falta del abono del mes, por otro. Un porcentaje «cobrado / cargado» podía
// dar 100 % con el mes impago, si entraban deudas viejas o adelantos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Ban, CalendarPlus, ChevronRight, Loader2, Search, Wallet } from 'lucide-react';
import { getResumenCuentasAction } from '@/actions/cuentas/cuentas.action';
import { InquilinoResumen, ResumenCuentas, Tramo } from '@/types/cuenta.type';
import { Avatar, EJE, Leyenda, Rotulo, Segmentos, Selector, Tarjeta } from '@/components/plataforma/mono';
import { colorAvatar, corto, iniciales, numero, plata } from '@/components/plataforma/formato';
import { CreateRenterDialog } from '../create-renter-dialog';
import { CobrarDialog } from './cobrar-dialog';
import { CargarAbonosDialog } from './acciones';
import { AnulacionesDialog } from './anulaciones';
import { TRAMOS, fechaAR, mesActual, nombreMes } from './util';

type Filtro = 'todos' | 'pendiente' | 'vencido' | 'al_dia' | 'a_favor' | 'bajas';
type Orden = 'saldo' | 'vencido' | 'nombre';
const FILTROS_PRINCIPALES: Filtro[] = ['todos', 'pendiente', 'vencido'];
const OTROS = 'otros';

// Hay inquilinos viejos cargados sin nombre: que la fila no quede en blanco.
const nombreDe = (i: InquilinoResumen) => `${i.apellido ?? ''} ${i.nombre ?? ''}`.trim() || 'Sin nombre';

function PastillaSaldo({ i }: { i: InquilinoResumen }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
          i.saldo > 0
            ? 'bg-[#FF7A4D]/[0.14] text-[#FF7A4D]'
            : i.saldo < 0
              ? 'bg-emerald-400/[0.12] text-emerald-400'
              : 'bg-[#231D17] text-muted-foreground'
        }`}
      >
        {i.saldo > 0 ? `Pendiente ${plata(i.saldo)}` : i.saldo < 0 ? `A favor ${plata(-i.saldo)}` : 'Al día'}
      </span>
      {i.vencido > 0 && (
        <span className="text-[11px] font-semibold text-[#FF7A4D]">
          {i.vencido < i.saldo ? `${plata(i.vencido)} vencido` : 'Vencido'} desde {fechaAR(i.vencidoDesde)}
        </span>
      )}
    </span>
  );
}

export function InquilinosPanel() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === 'ADMIN';
  const [resumen, setResumen] = useState<ResumenCuentas | null>(null);
  const [error, setError] = useState<{ mensaje: string; code?: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [orden, setOrden] = useState<Orden>('saldo');
  const [cobrando, setCobrando] = useState<InquilinoResumen | null>(null);
  const [cargandoAbonos, setCargandoAbonos] = useState(false);
  const [viendoAnulaciones, setViendoAnulaciones] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await getResumenCuentasAction();
    setCargando(false);
    if (r.data) {
      setResumen(r.data);
      setError(null);
    } else setError({ mensaje: r.error ?? 'No se pudo cargar la sección.', code: r.code });
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const inquilinos = useMemo(() => resumen?.inquilinos ?? [], [resumen]);
  // Un dado de baja sigue en la lista mientras tenga algo pendiente o a favor: dejar de alquilar
  // no cancela la cuenta. Sin saldo, solo aparece en «Dados de baja».
  const visibles = useMemo(() => inquilinos.filter((i) => !i.baja || i.saldo !== 0), [inquilinos]);
  const cuenta: Record<Filtro, number> = {
    todos: visibles.length,
    pendiente: visibles.filter((i) => i.saldo > 0).length,
    vencido: visibles.filter((i) => i.vencido > 0).length,
    al_dia: visibles.filter((i) => i.saldo === 0).length,
    a_favor: visibles.filter((i) => i.saldo < 0).length,
    bajas: inquilinos.filter((i) => i.baja).length,
  };

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const base = filtro === 'bajas' ? inquilinos.filter((i) => i.baja) : visibles;
    return base
      .filter((i) =>
        filtro === 'pendiente'
          ? i.saldo > 0
          : filtro === 'vencido'
            ? i.vencido > 0
            : filtro === 'al_dia'
              ? i.saldo === 0
              : filtro === 'a_favor'
                ? i.saldo < 0
                : true,
      )
      .filter(
        (i) =>
          !texto ||
          [i.apellido, i.nombre, i.telefono ?? '', ...i.cocheras, ...i.patentes].join(' ').toLowerCase().includes(texto),
      )
      .sort((a, b) => {
        if (orden === 'nombre') return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
        if (orden === 'vencido')
          return (a.vencidoDesde ?? '9999').localeCompare(b.vencidoDesde ?? '9999') || b.saldo - a.saldo;
        return b.saldo - a.saldo;
      });
  }, [inquilinos, visibles, busqueda, filtro, orden]);

  if (error?.code === 'MODULO_INQUILINOS_APAGADO')
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border bg-gm-surface p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-gm-yellow" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Inquilinos no está habilitado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección se activa para cada playa desde la administración de la plataforma. Pedile al responsable del
          sistema que la habilite.
        </p>
      </div>
    );

  const k = resumen?.kpis;
  const mes = mesActual();
  const abonoSaldado = k?.abonoMes.cargado ? Math.round(((k.abonoMes.cargado - k.abonoMes.pendiente) / k.abonoMes.cargado) * 100) : null;
  const porTramo = (Object.keys(TRAMOS) as Tramo[]).map((t) => ({
    tramo: t,
    n: visibles.filter((i) => i.tramo === t).length,
  }));
  const hayDeuda = porTramo.some((t) => t.n > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-[0.14em] text-gm-yellow">OPERACIÓN · CUENTAS CORRIENTES</div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-none sm:text-[40px]">Inquilinos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {cargando && resumen && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {esAdmin && (
            <>
              <button
                type="button"
                onClick={() => setViendoAnulaciones(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-gm-surface px-4 text-sm font-semibold hover:bg-gm-surface-2"
              >
                <Ban className="size-4" />
                Anulaciones
                {!!k?.anulacionesMes && (
                  <span
                    aria-label={`${k.anulacionesMes} este mes`}
                    className="rounded-full bg-[#FF7A4D]/[0.16] px-1.5 text-[11px] font-bold tabular-nums text-[#FF7A4D]"
                  >
                    {k.anulacionesMes}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCargandoAbonos(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-gm-surface px-4 text-sm font-semibold hover:bg-gm-surface-2"
              >
                <CalendarPlus className="size-4" />
                Cargar abonos
              </button>
              <CreateRenterDialog onCreado={() => void cargar()} />
            </>
          )}
        </div>
      </div>

      {error && error.code !== 'MODULO_INQUILINOS_APAGADO' && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-destructive/60 p-4 text-sm">
          {error.mensaje}
          <button type="button" onClick={() => void cargar()} className="h-9 rounded-lg border border-border px-3 font-semibold hover:bg-gm-surface-2">
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <Tarjeta className="min-h-[124px] justify-between gap-3 pt-4 sm:min-h-[148px]">
          <div className="flex items-center justify-between">
            <Rotulo>Saldo pendiente</Rotulo>
            <AlertTriangle aria-hidden className="size-4 text-[#FF7A4D]" />
          </div>
          <span className={`font-display text-[26px] font-semibold leading-none sm:text-[34px] ${k?.saldoPendiente ? 'text-[#FF7A4D]' : ''}`}>
            {k ? corto(k.saldoPendiente) : '—'}
          </span>
          <span className="text-xs text-muted-foreground sm:text-[12.5px]">
            {k ? (k.deudaVencida ? `${corto(k.deudaVencida)} vencido · ${k.conVencido} con deuda vencida` : `${k.conSaldo} con saldo · nada vencido`) : ' '}
          </span>
        </Tarjeta>
        <Tarjeta className="min-h-[124px] justify-between gap-3 pt-4 sm:min-h-[148px]">
          <div className="flex items-center justify-between">
            <Rotulo>Cobrado en {nombreMes(mes)}</Rotulo>
            <Wallet aria-hidden className="size-4 text-gm-yellow" />
          </div>
          <span className="font-display text-[26px] font-semibold leading-none text-gm-yellow sm:text-[34px]">{k ? corto(k.cobradoMes) : '—'}</span>
          <span className="text-xs text-muted-foreground sm:text-[12.5px]">Pagos recibidos este mes, de cualquier período</span>
        </Tarjeta>
        {/* Una sola lectura: cuánto del abono del mes ya se saldó (número, barra y texto dicen lo mismo). */}
        <Tarjeta className="min-h-[124px] justify-between gap-3 pt-4 sm:min-h-[148px]">
          <Rotulo>Abono de {nombreMes(mes)}</Rotulo>
          {k?.abonoMes.cargado ? (
            <>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[26px] font-semibold leading-none text-emerald-400 sm:text-[34px]">{abonoSaldado}%</span>
                <span className="text-xs text-muted-foreground">saldado</span>
              </span>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-[#231D17]">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${abonoSaldado}%` }} />
                </div>
                <span className="block text-xs text-muted-foreground">
                  {k.abonoMes.pendiente ? (
                    <>
                      Falta <strong className="text-[#FF7A4D]">{corto(k.abonoMes.pendiente)}</strong> de {corto(k.abonoMes.cargado)} cargados
                    </>
                  ) : (
                    `Los ${corto(k.abonoMes.cargado)} cargados están saldados`
                  )}
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="font-display text-[26px] font-semibold leading-none text-muted-foreground sm:text-[34px]">—</span>
              <span className="text-xs text-muted-foreground">Todavía no se cargaron los abonos de {nombreMes(mes)}</span>
            </>
          )}
        </Tarjeta>
        <Tarjeta className="min-h-[124px] justify-between gap-3 pt-4 sm:min-h-[148px]">
          <Rotulo>Saldos a favor</Rotulo>
          <span className="font-display text-[26px] font-semibold leading-none text-emerald-400 sm:text-[34px]">{k ? corto(k.aFavorTotal) : '—'}</span>
          <span className="text-xs text-muted-foreground sm:text-[12.5px]">Se descuentan solos de los próximos cargos</span>
        </Tarjeta>
      </div>

      {hayDeuda && (
        <Tarjeta className="gap-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <Rotulo>Saldo pendiente por vencimiento</Rotulo>
            <span className="hidden text-xs sm:inline" style={{ color: EJE }}>
              Un cargo está pendiente hasta su vencimiento; después, vencido.
            </span>
          </div>
          <div role="img" aria-label={porTramo.map((t) => `${TRAMOS[t.tramo].label}: ${t.n}`).join(', ')} className="flex h-3 gap-[3px]">
            {porTramo
              .filter((t) => t.n > 0)
              .map((t) => (
                <span key={t.tramo} className="h-3 min-w-3 rounded-full" style={{ flexGrow: t.n, background: TRAMOS[t.tramo].color }} />
              ))}
          </div>
          <Leyenda items={porTramo.map((t) => ({ color: TRAMOS[t.tramo].color, label: TRAMOS[t.tramo].corto.toLowerCase(), n: t.n }))} />
        </Tarjeta>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-border bg-gm-surface px-3 sm:max-w-md">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label="Buscar inquilino"
              placeholder="Buscar por nombre, patente o cochera"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8A8073]"
            />
          </label>
          <div className="hidden flex-1 sm:block" />
          {/* En el teléfono, uno debajo del otro: lado a lado se cortaban las etiquetas. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Selector
              etiqueta="MÁS FILTROS"
              ariaLabel="Más filtros"
              className="h-11 justify-between rounded-xl sm:justify-center"
              valor={FILTROS_PRINCIPALES.includes(filtro) ? OTROS : filtro}
              opciones={[
                { id: OTROS, label: 'Ninguno' },
                { id: 'al_dia', label: `Al día (${cuenta.al_dia})` },
                { id: 'a_favor', label: `A favor (${cuenta.a_favor})` },
                { id: 'bajas', label: `Dados de baja (${cuenta.bajas})` },
              ]}
              onChange={(v) => setFiltro(v === OTROS ? 'todos' : (v as Filtro))}
            />
            <Selector
              etiqueta="ORDENAR"
              ariaLabel="Ordenar"
              className="h-11 justify-between rounded-xl sm:justify-center"
              valor={orden}
              opciones={[
                { id: 'saldo', label: 'Mayor saldo' },
                { id: 'vencido', label: 'Vencido hace más' },
                { id: 'nombre', label: 'Apellido' },
              ]}
              onChange={(v) => setOrden(v as Orden)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Segmentos
            etiqueta="Filtrar"
            className="w-max"
            opciones={[
              { id: 'todos', label: 'Todos', cuenta: cuenta.todos },
              { id: 'pendiente', label: 'Con saldo pendiente', cuenta: cuenta.pendiente },
              { id: 'vencido', label: 'Con deuda vencida', cuenta: cuenta.vencido },
            ]}
            valor={FILTROS_PRINCIPALES.includes(filtro) ? filtro : ('' as Filtro)}
            onChange={(v) => setFiltro(v as Filtro)}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        {/* En el teléfono la tabla no entra: se muestra como tarjetas (abajo). */}
        <div className="hidden overflow-x-auto md:block">
          <div role="table" aria-label="Inquilinos" className="min-w-[860px]">
            <div
              role="row"
              className="grid h-11 grid-cols-[minmax(0,1fr)_150px_140px_210px_200px] items-center bg-[#19140F] px-5 font-mono text-[10.5px] tracking-[0.1em]"
              style={{ color: EJE }}
            >
              <span role="columnheader">INQUILINO</span>
              <span role="columnheader">COCHERA</span>
              <span role="columnheader">ABONO MENSUAL</span>
              <span role="columnheader">PENDIENTE / A FAVOR</span>
              <span role="columnheader" className="sr-only">
                Acciones
              </span>
            </div>
            {lista.map((i) => (
              <div
                key={i.id}
                role="row"
                className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_150px_140px_210px_200px] items-center border-t border-[#2A241D] px-5 py-2 text-[13.5px] transition-colors hover:bg-[#201A15]"
              >
                <span role="cell" className="flex min-w-0 items-center gap-3">
                  <Avatar texto={iniciales(nombreDe(i))} fondo={colorAvatar(i.id)} />
                  <span className="min-w-0">
                    <Link href={`/renters/${i.id}`} className="block truncate font-semibold text-foreground hover:text-gm-yellow">
                      {nombreDe(i)}
                    </Link>
                    <span className="block truncate text-xs" style={{ color: EJE }}>
                      {i.baja ? `Dado de baja el ${fechaAR(i.baja)}` : i.telefono || 'Sin teléfono'}
                      {i.patentes.length ? ` · ${i.patentes.join(', ')}` : ''}
                    </span>
                  </span>
                </span>
                <span role="cell" className="truncate text-[12.5px] text-[#C9BFB1]">
                  {i.cocheras.length ? i.cocheras.join(', ') : '—'}
                </span>
                <span role="cell" className="tabular-nums text-[#C9BFB1]">
                  {i.baja ? <span style={{ color: EJE }}>De baja</span> : i.abono ? plata(i.abono) : '—'}
                </span>
                <span role="cell">
                  <PastillaSaldo i={i} />
                </span>
                <span role="cell" className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCobrando(i)}
                    className="h-9 rounded-[10px] bg-gm-yellow px-3.5 text-[13px] font-bold text-gm-ink hover:bg-[#FFD23A]"
                  >
                    Cobrar
                  </button>
                  <Link
                    href={`/renters/${i.id}`}
                    className="flex h-9 items-center gap-1 rounded-[10px] border border-border px-3 text-[13px] font-semibold hover:bg-gm-surface-2"
                  >
                    Ver cuenta
                    <ChevronRight className="size-3.5" />
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </div>

        <ul aria-label="Inquilinos" className="divide-y divide-[#2A241D] md:hidden">
          {lista.map((i) => (
            <li key={i.id} className="space-y-3 px-4 py-3.5">
              {/* El saldo va debajo del nombre, no al costado: al lado le quitaba el ancho y cortaba el nombre. */}
              <div className="flex items-start gap-3">
                <Avatar texto={iniciales(nombreDe(i))} fondo={colorAvatar(i.id)} />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block">
                    <Link
                      href={`/renters/${i.id}`}
                      className="line-clamp-2 font-semibold leading-snug text-foreground [overflow-wrap:anywhere]"
                    >
                      {nombreDe(i)}
                    </Link>
                    <span className="block truncate text-xs" style={{ color: EJE }}>
                      {[i.cocheras.length ? `Cochera ${i.cocheras.join(', ')}` : null, i.baja ? 'De baja' : i.abono ? `${plata(i.abono)}/mes` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <PastillaSaldo i={i} />
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCobrando(i)}
                  className="h-10 flex-1 rounded-[10px] bg-gm-yellow text-[13px] font-bold text-gm-ink hover:bg-[#FFD23A]"
                >
                  Cobrar
                </button>
                <Link
                  href={`/renters/${i.id}`}
                  className="flex h-10 flex-1 items-center justify-center gap-1 rounded-[10px] border border-border text-[13px] font-semibold hover:bg-gm-surface-2"
                >
                  Ver cuenta
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {cargando && !resumen && (
          <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground md:border-t md:border-[#2A241D]">
            <Loader2 className="size-4 animate-spin" /> Cargando cuentas…
          </p>
        )}
        {resumen && !lista.length && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground md:border-t md:border-[#2A241D]">
            {inquilinos.length ? 'Nadie coincide con esa búsqueda o filtro.' : 'Todavía no hay inquilinos. Creá el primero con «Nuevo inquilino».'}
          </p>
        )}
        {resumen && (
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#2A241D] bg-[#19140F] px-5 py-2.5 text-[12.5px] text-muted-foreground">
            <span>
              {lista.length} de {numero(filtro === 'bajas' ? cuenta.bajas : visibles.length)} inquilinos
            </span>
            <span className="tabular-nums">
              Pendiente del listado: <strong className="text-foreground">{plata(lista.reduce((s, i) => s + Math.max(0, i.saldo), 0))}</strong>
            </span>
          </div>
        )}
      </section>

      {cobrando && (
        <CobrarDialog
          customerId={cobrando.id}
          nombre={`${cobrando.nombre} ${cobrando.apellido}`}
          open={!!cobrando}
          onOpenChange={(v) => !v && setCobrando(null)}
          onCobrado={() => void cargar()}
        />
      )}
      {esAdmin && <AnulacionesDialog open={viendoAnulaciones} onOpenChange={setViendoAnulaciones} />}
      {esAdmin && <CargarAbonosDialog open={cargandoAbonos} onOpenChange={setCargandoAbonos} onCargado={() => void cargar()} />}
    </div>
  );
}
