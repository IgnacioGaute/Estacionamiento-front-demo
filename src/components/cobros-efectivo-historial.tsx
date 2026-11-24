'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Banknote, ChevronUp, Search } from 'lucide-react';
import { getCobrosEfectivoAction } from '@/actions/turnos/cobros-efectivo.action';
import { cn } from '@/lib/utils';
import type { CobroEfectivo, CobrosEfectivoTurno, Turno } from '@/types/turno.type';
import { money } from './turno-ui';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

// El nombre completo (resumen, lectores de pantalla) y el corto de la fila: una fila por cobro, en
// una sola línea también en el celular.
const CONCEPTOS: Record<CobroEfectivo['concepto'], { largo: string; corto: string }> = {
  ANTICIPO: { largo: 'Anticipo', corto: 'Anticipo' },
  SALDO: { largo: 'Saldo al salir', corto: 'Saldo' },
  AJUSTE: { largo: 'Ajuste', corto: 'Ajuste' },
  DEVOLUCION: { largo: 'Devolución', corto: 'Devolución' },
  PAGO_INQUILINO: { largo: 'Pago de inquilino', corto: 'Inquilino' },
  DEVOLUCION_INQUILINO: { largo: 'Devolución a inquilino', corto: 'Dev. inquilino' },
  ANULACION_INQUILINO: { largo: 'Anulación de pago de inquilino', corto: 'Anulación' },
  ESTADIA_PERIODO: { largo: 'Estadía por período', corto: 'Período' },
  DEVOLUCION_ANTICIPO: { largo: 'Devolución de anticipo', corto: 'Devolución' },
  AJUSTE_CAJA: { largo: 'Ajuste de caja', corto: 'Ajuste caja' },
  COBRO: { largo: 'Cobro en efectivo', corto: 'Efectivo' },
  // Un cobro que se corrigió de medio (de efectivo a transferencia, o al revés).
  CORRECCION: { largo: 'Corrección de medio de pago', corto: 'Corrección' },
};
const largo = (c: CobroEfectivo) =>
  c.concepto === 'ESTADIA_PERIODO' && c.periodo ? `Estadía por ${c.periodo}`
    : c.concepto === 'ANULACION_INQUILINO' && c.anula === 'DEVOLUCION' ? 'Anulación de devolución a inquilino'
      : CONCEPTOS[c.concepto]?.largo ?? 'Cobro en efectivo';
const corto = (c: CobroEfectivo) => CONCEPTOS[c.concepto]?.corto ?? 'Efectivo';
const conSigno = (n: number) => (n < 0 ? '− ' : '') + money(Math.abs(n));
const quien = (c: CobroEfectivo) => (c.sinDetalle ? 'Sin detalle' : c.identificacion ?? '—');
const normalizar = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// El acceso, igual para los detalles que se piden al tocar en el historial: un botón chico con
// borde, no texto suelto (dos seguidos se leían como una sola frase).
export const botonDetalle = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gm-line-strong px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-gm-yellow/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60';

// En el historial, lo que este turno cobró en efectivo, para revisar un faltante sin buscar cada
// cobro en la planilla. Se pide al tocar: la lista de turnos no trae el detalle de cada uno. Es solo
// de este turno, aunque comparta la caja con otros operadores.
//
// Un turno normal tiene decenas de cobros: arriba va el resumen por concepto (casi siempre alcanza
// con eso), y la lista, una línea por cobro, se desplaza dentro de su recuadro en vez de alargar la
// página. Con muchos cobros aparece el buscador de patente.
export function CobrosEfectivoHistorial({ turnoId, resumen }: { turnoId: string; resumen?: Turno['resumen'] }) {
  const [detalle, setDetalle] = useState<CobrosEfectivoTurno | null | undefined>(undefined);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  async function ver() {
    setAbierto(true);
    if (detalle) return;
    setCargando(true);
    try {
      setDetalle(await getCobrosEfectivoAction(turnoId));
    } catch {
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }
  async function reintentar() { setDetalle(undefined); setCargando(true); try { setDetalle(await getCobrosEfectivoAction(turnoId)); } catch { setDetalle(null); } finally { setCargando(false); } }

  const porConcepto = useMemo(() => {
    const grupos = new Map<string, { nombre: string; cantidad: number; total: number }>();
    for (const c of detalle?.cobros ?? []) {
      const nombre = c.sinDetalle ? 'Sin detalle' : largo(c);
      const g = grupos.get(nombre) ?? { nombre, cantidad: 0, total: 0 };
      g.cantidad += 1; g.total += c.importe;
      grupos.set(nombre, g);
    }
    return [...grupos.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [detalle]);

  if (!abierto)
    return <button type="button" onClick={() => void ver()} className={botonDetalle} aria-expanded={false}>
      <Banknote className="size-3.5" aria-hidden />Ver cobros en efectivo
    </button>;

  const cerrar = <button type="button" onClick={() => setAbierto(false)} aria-expanded className={cn(botonDetalle, 'min-h-8 px-2.5')}>
    <ChevronUp className="size-3.5" aria-hidden />Ocultar
  </button>;
  const marco = (contenido: React.ReactNode) => (
    <section aria-label="Cobros en efectivo del turno" className="basis-full overflow-hidden rounded-2xl border border-gm-line">
      <header className="flex items-center justify-between gap-3 border-b border-gm-line bg-gm-surface-2/60 px-3.5 py-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold"><Banknote className="size-4 text-gm-yellow" aria-hidden />Cobros en efectivo</h3>
        {cerrar}
      </header>
      {contenido}
    </section>
  );

  if (cargando) return marco(<p role="status" className="px-3.5 py-4 text-xs text-muted-foreground">Buscando los cobros en efectivo…</p>);
  if (!detalle) return marco(<div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3 text-xs text-muted-foreground">
    <span>No se pudieron traer los cobros en efectivo de este turno.</span>
    <button type="button" onClick={() => void reintentar()} className={botonDetalle}>Reintentar</button>
  </div>);
  if (!detalle.cobros.length) return marco(<p className="px-3.5 py-4 text-xs text-muted-foreground">Este turno no registró cobros ni devoluciones en efectivo.</p>);

  // El total del detalle es lo cobrado menos lo devuelto en efectivo. El resumen del turno muestra
  // esas dos cosas por separado y suma aparte los gastos e ingresos de Varios.
  const delResumen = resumen ? resumen.efectivoCobrado - resumen.devolucionesEfectivo : null;
  const mismoAlcance = delResumen == null || delResumen === detalle.total;
  const multiDia = new Set(detalle.cobros.map((c) => dayjs(c.fecha).tz(TZ).format('YYYY-MM-DD'))).size > 1;
  const buscado = normalizar(busqueda);
  const filas = buscado ? detalle.cobros.filter((c) => normalizar(`${c.identificacion ?? ''} ${largo(c)}`).includes(buscado)) : detalle.cobros;
  const conBuscador = detalle.cobros.length > 8;
  return marco(<>
    {/* Lo que casi siempre alcanza: cuántos, cuánto y de qué. */}
    <div className="space-y-2.5 border-b border-gm-line px-3.5 py-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <strong className="font-display text-xl tabular-nums">{conSigno(detalle.total)}</strong>
        <span className="text-xs text-muted-foreground">en {detalle.cantidad} {detalle.cantidad === 1 ? 'cobro' : 'cobros'}{detalle.egresos > 0 && <> · cobrado {money(detalle.ingresos)}, devuelto {money(detalle.egresos)}</>}</span>
      </p>
      <ul aria-label="Por concepto" className="flex flex-wrap gap-1.5">
        {porConcepto.map((g) => (
          <li key={g.nombre} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]', g.nombre === 'Sin detalle' ? 'bg-gm-atencion/10 text-gm-atencion' : 'bg-gm-surface-3 text-gm-texto-2')}>
            <span className="font-semibold">{g.cantidad} {g.nombre.toLowerCase()}</span>
            <span className="tabular-nums">{conSigno(g.total)}</span>
          </li>
        ))}
      </ul>
    </div>

    {conBuscador && <label className="flex items-center gap-2 border-b border-gm-line px-3.5 py-2">
      <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">Buscar patente en los cobros</span>
      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar patente"
        className="min-w-0 flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-muted-foreground" />
      {/* Que la lista sigue hacia abajo: se ven unos diez y el resto se desplaza. */}
      <span className="shrink-0 text-[11px] text-muted-foreground">{buscado ? `${filas.length} de ${detalle.cantidad}` : <>{detalle.cantidad} cobros <span aria-hidden>↓</span><span className="sr-only">: desplazá la lista para ver todos</span></>}</span>
    </label>}

    {/* Una línea por cobro; se desplaza dentro del recuadro. */}
    <div className="max-h-[340px] overflow-y-auto overscroll-contain">
      <table className="w-full text-[13px]">
        <caption className="sr-only">Cobros en efectivo, por hora</caption>
        <thead className="sticky top-0 z-[1] bg-gm-surface-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th scope="col" className="w-14 py-1.5 pl-3.5 text-left font-bold">Hora</th>
            <th scope="col" className="py-1.5 pl-2 text-left font-bold">Patente</th>
            <th scope="col" className="py-1.5 pl-2 text-left font-bold">Concepto</th>
            <th scope="col" className="py-1.5 pl-2 pr-3.5 text-right font-bold">Efectivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gm-line/70">
          {filas.map((c) => (
            <tr key={c.id} className="hover:bg-gm-surface-2/50">
              <td className="gm-mono whitespace-nowrap py-1.5 pl-3.5 text-xs text-muted-foreground">
                {multiDia && <span className="mr-1">{dayjs(c.fecha).tz(TZ).format('DD/MM')}</span>}{dayjs(c.fecha).tz(TZ).format('HH:mm')}
              </td>
              <td className={cn('max-w-[9rem] truncate py-1.5 pl-2 font-semibold', c.sinDetalle ? 'text-gm-atencion' : !c.identificacion && 'font-normal text-muted-foreground')} title={c.identificacion ?? undefined}>
                {quien(c)}
              </td>
              <td className="py-1.5 pl-2 text-xs text-muted-foreground" title={largo(c)}>
                <span aria-hidden>{corto(c)}</span><span className="sr-only">{largo(c)}</span>
              </td>
              <td className={cn('whitespace-nowrap py-1.5 pl-2 pr-3.5 text-right font-semibold tabular-nums', c.importe < 0 && 'text-gm-atencion')}>
                {conSigno(c.importe)}
                {/* Lo declarado al cobrar: con cuánto pagó y el vuelto. No suma al total. */}
                {c.recibido != null && <span className="block text-[11px] font-normal text-muted-foreground">entregó {money(c.recibido)}{c.vuelto ? ` · vuelto ${money(c.vuelto)}` : ' · justo'}</span>}
              </td>
            </tr>
          ))}
          {!filas.length && <tr><td colSpan={4} className="px-3.5 py-4 text-center text-xs text-muted-foreground">Ningún cobro coincide con «{busqueda}».</td></tr>}
        </tbody>
      </table>
    </div>

    <footer className="space-y-1 border-t border-gm-line bg-gm-surface-2/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
      <p>
        Solo lo que recibió este turno, aunque comparta la caja. No incluye transferencias, Mercado Pago, cortesías ni Varios
        {resumen && (resumen.gastosEfectivo || resumen.ingresosVarios) ? ' (el resumen los muestra aparte)' : ''}.
        {delResumen != null && mismoAlcance && ' Coincide con el resumen del turno: lo cobrado en efectivo menos lo devuelto.'}
      </p>
      {!mismoAlcance && <p className="text-gm-atencion">El resumen del turno da {conSigno(delResumen!)} entre lo cobrado y lo devuelto en efectivo, y este detalle {conSigno(detalle.total)}. Revisá la diferencia en la planilla del día.</p>}
      {detalle.sinDetalle > 0 && <p>«Sin detalle»: entró a la caja sin que se pueda saber de qué operación (por ejemplo, un ajuste de caja); se muestra con su hora e importe.</p>}
      {detalle.cobros.some((c) => c.recibido != null) && <p>«Entregó» y «vuelto»: lo que el operador indicó al cobrar. Es lo declarado, no prueba que ese dinero se haya recibido o entregado. Los cobros anteriores a este dato no lo tienen.</p>}
    </footer>
  </>);
}
