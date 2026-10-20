'use client';

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { useSession } from 'next-auth/react';
import dayjs from 'dayjs';
import { CalendarDays, Car, CheckCheck, Inbox, MessageSquare, RotateCcw, Search, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataLoading } from '@/components/ui/data-loading';
import { AppDatePicker } from '@/components/app-date-picker';
import { useTenant } from '@/components/tenant-provider';
import { cn } from '@/lib/utils';
import { listNotesAction } from '@/actions/notes/list-notes.action';
import { readAllNotesAction, readNoteAction } from '@/actions/notes/note-read.action';
import type { EstadoAviso, FiltrosAvisos, ListaAvisos, Note, OrigenAviso } from '@/types/note.type';
import { TariffSelect } from '@/app/(protected)/admin/tarifas/tariff-select';
import {
  CabeceraTabla, ChipFiltro, PieTabla, SelectorSegmentado, TarjetaResumen, tarjetaPlanilla,
} from '@/components/planilla/planilla-ui';
import { UpdateNoteDialog } from './update-note-dialog';
import { DeleteNoteDialog } from './delete-note-dialog';

const POR_PAGINA = 20; // El mismo límite que pide getNotes (AVISOS_POR_PAGINA).
const ZONA = 'America/Argentina/Buenos_Aires';
const diaAR = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const horaAR = (d: Date) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const fechaCorta = (v: string) => dayjs(v).format('DD/MM/YY');

// El origen agrupa los avisos como el filtro del backend (notes.service): los del equipo, y los que
// deja la operación sobre vehículos, caja o clientes.
const ORIGENES: Record<Exclude<OrigenAviso, 'TODOS'>, { label: string; Icono: LucideIcon }> = {
  EQUIPO: { label: 'Del equipo', Icono: MessageSquare },
  VEHICULOS: { label: 'Vehículos', Icono: Car },
  CAJA: { label: 'Caja y turnos', Icono: Wallet },
  CLIENTES: { label: 'Clientes', Icono: Users },
};
const origenDe = (n: Note): Exclude<OrigenAviso, 'TODOS'> =>
  !n.sourceKey ? 'EQUIPO' : n.sourceType === 'TICKET' ? 'VEHICULOS' : n.sourceType === 'CAJA' || n.sourceType === 'TURNO' ? 'CAJA' : 'CLIENTES';

const SIN_FILTROS: Required<FiltrosAvisos> = { estado: 'TODOS', origen: 'TODOS', desde: '', hasta: '', autor: '' };

export function AvisosBody({ inicial }: { inicial: ListaAvisos | null }) {
  const { data: session } = useSession();
  const { cobroHabilitado } = useTenant();
  const yo = session?.user?.id;
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [busqueda, setBusqueda] = useState('');
  const [buscado, setBuscado] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<ListaAvisos | null>(inicial);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  // Leídos en esta pantalla y todavía no reflejados por una nueva consulta: se ven al instante.
  const [leidos, setLeidos] = useState<Set<string>>(new Set());
  const [marcandoTodo, setMarcandoTodo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pedido = useRef(0);
  const primera = useRef(Boolean(inicial));

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const n = ++pedido.current;
    startTransition(async () => {
      try {
        const r = await listNotesAction(pagina + 1, buscado, filtros);
        if (n !== pedido.current) return;
        setDatos(r); setLeidos(new Set()); setError('');
      } catch {
        if (n === pedido.current) setError('No se pudieron cargar los avisos. Los anteriores se conservan; volvé a intentar.');
      }
    });
  }, [filtros, buscado, pagina, revision]);
  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => { if (busqueda.trim() !== buscado) { setPagina(0); setBuscado(busqueda.trim()); } }, 300);
    return () => clearTimeout(t);
  }, [busqueda, buscado]);
  // Avisos nuevos (de otros o propios), editados o borrados: se vuelve a la primera página.
  useEffect(() => {
    const recargar = () => { setPagina(0); setRevision((v) => v + 1); };
    const eventos = ['new-note-created', 'notes-notification', 'notes-changed'];
    eventos.forEach((e) => window.addEventListener(e, recargar));
    return () => eventos.forEach((e) => window.removeEventListener(e, recargar));
  }, []);

  const cambiar = (cambios: Partial<FiltrosAvisos>) => { setPagina(0); setFiltros((f) => ({ ...f, ...cambios })); };
  const limpiar = () => { setBusqueda(''); setBuscado(''); setPagina(0); setFiltros(SIN_FILTROS); };
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS) || Boolean(buscado);

  const pendiente = (n: Note) => Boolean(datos?.pendientes?.includes(n.id)) && !leidos.has(n.id);
  const leidosAca = datos ? datos.pendientes.filter((id) => leidos.has(id)).length : 0;
  const conteos = datos?.conteos && { ...datos.conteos, sinLeer: datos.conteos.sinLeer - leidosAca, leidos: datos.conteos.leidos + leidosAca };
  const sinLeer = (datos?.resumen.sinLeer ?? 0) - leidosAca;

  async function leer(n: Note) {
    if (!pendiente(n)) return;
    setLeidos((s) => new Set(s).add(n.id));
    try {
      await readNoteAction(n.id);
      window.dispatchEvent(new Event('notes-read-changed'));
    } catch {
      setLeidos((s) => { const otro = new Set(s); otro.delete(n.id); return otro; });
      setError('No se pudo guardar la lectura. Volvé a intentar.');
    }
  }
  async function leerTodo() {
    setMarcandoTodo(true);
    try {
      await readAllNotesAction();
      window.dispatchEvent(new Event('notes-read-changed'));
      setRevision((v) => v + 1);
    } catch {
      setError('No se pudieron marcar los avisos como leídos. Volvé a intentar.');
    } finally {
      setMarcandoTodo(false);
    }
  }
  const teclado = (e: KeyboardEvent<HTMLElement>, n: Note) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    void leer(n);
  };

  // Período: los atajos marcan el chip; un rango elegido a mano los apaga.
  const hoy = diaAR(new Date());
  const hace = (dias: number) => dayjs(hoy).subtract(dias - 1, 'day').format('YYYY-MM-DD');
  const periodo = (dias: number | null) => cambiar(dias === null ? { desde: '', hasta: '' } : { desde: hace(dias), hasta: hoy });
  const periodoActivo = (dias: number | null) => dias === null ? !filtros.desde && !filtros.hasta : filtros.desde === hace(dias) && filtros.hasta === hoy;
  const botonFecha = (valor: string, vacio: string, etiqueta: string) => (
    <Button type="button" variant="outline" aria-label={etiqueta} className="h-10 gap-2 rounded-full border-gm-line-strong px-3.5 text-[13px] font-semibold">
      <CalendarDays className="size-[15px] text-gm-yellow" aria-hidden />{valor ? fechaCorta(valor) : vacio}
    </Button>
  );

  // Grupos: primero los pendientes (así los ordena el backend) y después uno por día.
  const avisos = datos?.data ?? [];
  const ayer = dayjs(hoy).subtract(1, 'day').format('YYYY-MM-DD');
  const tituloDia = (dia: string) => dia === hoy ? 'Hoy' : dia === ayer ? 'Ayer'
    : new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dia + 'T00:00:00Z'));
  const grupos: { clave: string; titulo: string; avisos: Note[] }[] = [];
  for (const n of avisos) {
    const clave = datos?.pendientes.includes(n.id) ? 'pendientes' : n.date ?? diaAR(new Date(n.createdAt));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) ultimo.avisos.push(n);
    else grupos.push({ clave, titulo: clave === 'pendientes' ? 'Sin leer' : tituloDia(clave), avisos: [n] });
  }
  const origenes = (Object.keys(ORIGENES) as (keyof typeof ORIGENES)[]).filter((o) => cobroHabilitado || o === 'EQUIPO' || o === 'VEHICULOS');
  const autor = (n: Note) => n.user?.id && n.user.id === yo ? 'Vos'
    : [n.user?.firstName, n.user?.lastName].filter(Boolean).join(' ') || (n.sourceKey ? 'Autor no registrado' : 'Equipo');

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-3 [&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1">
        <TarjetaResumen destacada etiqueta="Sin leer" valor={datos ? Math.max(0, sinLeer) : '—'} detalle={sinLeer > 0 ? 'pendientes para vos' : 'estás al día'} />
        <TarjetaResumen etiqueta="Hoy" valor={datos?.resumen.hoy ?? '—'} detalle="avisos publicados hoy" />
        <TarjetaResumen etiqueta="En la cartelera" valor={datos?.resumen.total ?? '—'} detalle="avisos de esta playa" />
      </section>

      <section data-tour="avisos-filtro" aria-label="Filtros" className={cn(tarjetaPlanilla, 'flex flex-col gap-3 p-3.5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelectorSegmentado<EstadoAviso>
            etiqueta="Estado de lectura"
            valor={filtros.estado}
            onChange={(estado) => cambiar({ estado })}
            opciones={[
              { id: 'TODOS', label: 'Todos', cantidad: conteos?.todos },
              { id: 'SIN_LEER', label: 'Sin leer', cantidad: conteos?.sinLeer },
              { id: 'LEIDOS', label: 'Leídos', cantidad: conteos?.leidos },
            ]}
          />
          <div role="group" aria-label="Período" className="flex flex-wrap items-center gap-1.5">
            <ChipFiltro activo={periodoActivo(null)} onClick={() => periodo(null)}>Todo</ChipFiltro>
            <ChipFiltro activo={periodoActivo(1)} onClick={() => periodo(1)}>Hoy</ChipFiltro>
            <ChipFiltro activo={periodoActivo(7)} onClick={() => periodo(7)}>7 días</ChipFiltro>
            <ChipFiltro activo={periodoActivo(30)} onClick={() => periodo(30)}>30 días</ChipFiltro>
            <AppDatePicker title="Desde" value={filtros.desde} max={filtros.hasta || undefined} clearable onChange={(desde) => cambiar({ desde: desde ?? '' })} trigger={botonFecha(filtros.desde, 'Desde', 'Elegir fecha desde')} />
            <AppDatePicker title="Hasta" value={filtros.hasta} min={filtros.desde || undefined} clearable onChange={(hasta) => cambiar({ hasta: hasta ?? '' })} trigger={botonFecha(filtros.hasta, 'Hasta', 'Elegir fecha hasta')} />
          </div>
        </div>
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="relative block">
            <span className="sr-only">Buscar en los avisos</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Palabra, patente o cliente"
              className="h-11 w-full rounded-xl border border-gm-line-strong bg-background pl-[42px] pr-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gm-yellow" />
          </label>
          <TariffSelect name="Origen" value={filtros.origen} onValueChange={(v) => cambiar({ origen: v as OrigenAviso })}
            options={[{ value: 'TODOS', label: 'Todos los orígenes' }, ...origenes.map((o) => ({ value: o, label: ORIGENES[o].label }))]} />
          <TariffSelect name="Autor" value={filtros.autor || 'TODOS'} onValueChange={(v) => cambiar({ autor: v === 'TODOS' ? '' : v })}
            options={[{ value: 'TODOS', label: 'Todos los autores' }, ...(datos?.autores ?? []).map((a) => ({ value: a.id, label: a.id === yo ? `${a.nombre} (vos)` : a.nombre || 'Sin nombre' }))]} />
        </div>
        {hayFiltros && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={limpiar}><RotateCcw className="mr-2 size-4" aria-hidden />Limpiar filtros</Button>
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <section data-tour="avisos-tabla" aria-label="Avisos" aria-busy={isPending} className={cn(tarjetaPlanilla, 'overflow-hidden')}>
        <CabeceraTabla titulo="Avisos" cantidad={datos?.meta.totalItems ?? 0}>
          {sinLeer > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={leerTodo} disabled={marcandoTodo} className="h-9 gap-2 border-gm-line-strong">
              <CheckCheck className="size-4 text-gm-yellow" aria-hidden />{marcandoTodo ? 'Marcando…' : 'Marcar todo como leído'}
            </Button>
          )}
        </CabeceraTabla>
        {!datos ? <div className="p-6"><DataLoading label="Cargando avisos…" /></div> : !avisos.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <h3 className="font-semibold">{hayFiltros ? 'No hay avisos con estos filtros' : 'Todavía no hay avisos'}</h3>
            <p className="text-sm text-muted-foreground">{hayFiltros ? 'Probá con otro período, origen o palabra.' : 'Publicá el primero para que lo vea todo el equipo.'}</p>
          </div>
        ) : (
          <div className={cn('transition-opacity', isPending && 'opacity-50')}>
            {grupos.map((g) => (
              <section key={g.clave} aria-label={g.titulo}>
                <h3 className={cn('border-t border-gm-line bg-[#15130F] px-[18px] py-2 text-[11px] font-bold uppercase tracking-[0.12em] first-letter:uppercase',
                  g.clave === 'pendientes' ? 'text-gm-yellow' : 'text-muted-foreground')}>{g.titulo}</h3>
                <ul>
                  {g.avisos.map((n) => {
                    const nuevo = pendiente(n);
                    const { Icono, label } = ORIGENES[origenDe(n)];
                    return (
                      <li key={n.id}>
                        <article
                          data-pendiente={nuevo || undefined}
                          tabIndex={nuevo ? 0 : undefined}
                          onClick={() => void leer(n)}
                          onKeyDown={(e) => teclado(e, n)}
                          className={cn('relative flex gap-3 border-t border-gm-line px-[18px] py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow',
                            nuevo ? 'cursor-pointer bg-gm-yellow/[0.05] hover:bg-gm-yellow/[0.09]' : 'hover:bg-gm-surface-2')}>
                          {nuevo && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gm-yellow" />}
                          <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', nuevo ? 'bg-gm-yellow/15 text-gm-yellow' : 'bg-gm-surface-3 text-[#D9D1C3]')}>
                            <Icono className="size-[18px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={cn('text-[14px]', nuevo ? 'font-bold' : 'font-semibold')}>{autor(n)}</span>
                              <span className="inline-flex h-[22px] items-center rounded-full bg-gm-surface-3 px-2 text-[11.5px] font-semibold text-[#D9D1C3]">{n.origin || label}</span>
                              {nuevo && <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gm-yellow">Nuevo<span className="sr-only"> · tocá para marcarlo como leído</span></span>}
                              <time dateTime={new Date(n.createdAt).toISOString()} className="gm-mono ml-auto text-xs text-muted-foreground">
                                {g.clave === 'pendientes' ? `${fechaCorta(n.date ?? diaAR(new Date(n.createdAt)))} · ` : ''}{horaAR(new Date(n.createdAt))}
                              </time>
                            </div>
                            {n.context && <p className="gm-mono mt-0.5 break-words text-xs text-muted-foreground">{n.context}</p>}
                            <p className={cn('mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed', nuevo ? 'text-foreground' : 'text-[#D9D1C3]')}>{n.description}</p>
                          </div>
                          {/* Editar o borrar no cuenta como leer: los clics y teclas del diálogo no suben a la tarjeta. */}
                          {!n.sourceKey && (
                            <div className="-mr-2 -mt-1 flex shrink-0 items-start" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              <UpdateNoteDialog note={n} />
                              <DeleteNoteDialog note={n} />
                            </div>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <PieTabla pagina={pagina} porPagina={POR_PAGINA} total={datos?.meta.totalItems ?? 0} mostrados={avisos.length} onCambiar={setPagina} disabled={isPending} />
      </section>
    </div>
  );
}
