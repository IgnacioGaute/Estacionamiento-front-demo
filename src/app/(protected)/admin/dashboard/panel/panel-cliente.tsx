'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Deudores } from '@/types/cuenta.type';
import type { CompararPanel, PanelResumen, VerPanel } from '@/types/panel.type';
import { FiltrosPanel, type CambioFiltros } from './filtros-panel';
import { CobradoCometa } from './cobrado-cometa';
import { AutosAdentro } from './autos-adentro';
import { Minigrafico, type Serie } from './minigraficos';
import { CalendarioDias } from './calendario-dias';
import { PagosTramas } from './pagos-tramas';
import { agrupar, minutos, nombreRango, plata, vistaPorDefecto, vistasPosibles } from './utilidades';
import './panel.css';

// Las estadías del período agrupadas como lo cobrado (por día, semana o mes). El ticket y la
// duración de un grupo se ponderan por las salidas de cada día.
function serieEstadias(p: PanelResumen, ver: VerPanel, campo: 'entradas' | 'ticketPromedio' | 'duracionPromedio'): Serie {
  if (ver === 'hora') return [];
  const etiquetas = new Map(agrupar(p, ver).map((b) => [b.clave, b.etiqueta]));
  const grupos = new Map<string, { suma: number; peso: number }>();
  for (const d of p.estadias.porDia) {
    const f = dayjs(d.fecha);
    const clave = ver === 'mes' ? d.fecha.slice(0, 7) : ver === 'semana' ? f.subtract((f.day() + 6) % 7, 'day').format('YYYY-MM-DD') : d.fecha;
    const g = grupos.get(clave) ?? { suma: 0, peso: 0 };
    if (campo === 'entradas') { g.suma += d.entradas; g.peso = 1; }
    else if (d[campo] !== null) { g.suma += (d[campo] ?? 0) * d.salidas; g.peso += d.salidas; }
    grupos.set(clave, g);
  }
  return [...grupos.entries()].map(([clave, g]) => ({ etiqueta: etiquetas.get(clave) ?? clave, valor: g.peso ? Math.round(g.suma / g.peso) : null }));
}

export function PanelCliente({ panel, comparar, ver: verPedido, deudores }: { panel: PanelResumen; comparar: CompararPanel; ver?: VerPanel; deudores: Deudores }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const { desde, hasta, dias } = panel.rango;
  const vistas = vistasPosibles(dias);
  const ver = verPedido && vistas.includes(verPedido) ? verPedido : vistaPorDefecto(dias);

  const cambiar = (c: CambioFiltros) => {
    const q = new URLSearchParams(params?.toString());
    if (c.desde) q.set('desde', c.desde);
    if (c.hasta) q.set('hasta', c.hasta);
    if (c.comparar) q.set('comparar', c.comparar);
    if (c.ver) q.set('ver', c.ver);
    // Al cambiar el período, la agrupación vuelve a la sugerida si la elegida ya no aplica.
    if ((c.desde || c.hasta) && !c.ver) q.delete('ver');
    startTransition(() => router.push(`${pathname}?${q.toString()}`, { scroll: false }));
  };

  const baldes = agrupar(panel, ver);
  const periodo = nombreRango(desde, hasta);
  const comparaTexto = panel.comparacion ? `Frente a ${nombreRango(panel.comparacion.desde, panel.comparacion.hasta)}` : null;
  const e = panel.estadias;
  const avisos = [
    panel.avisos.faltantes.cantidad > 0 && { clave: 'faltantes', texto: `Faltaron ${plata(panel.avisos.faltantes.total)} en ${panel.avisos.faltantes.cantidad === 1 ? 'un cierre' : `${panel.avisos.faltantes.cantidad} cierres`} esta semana`, href: '/admin/caja' },
    panel.avisos.correccionesPendientes > 0 && { clave: 'correcciones', texto: `${panel.avisos.correccionesPendientes === 1 ? 'Una corrección espera' : `${panel.avisos.correccionesPendientes} correcciones esperan`} tu revisión`, href: '/tickets' },
    deudores && deudores.cantidad > 0 && { clave: 'deudores', texto: `${deudores.cantidad === 1 ? 'Un inquilino tiene' : `${deudores.cantidad} inquilinos tienen`} la cuota vencida`, href: '/notes?tab=inquilinos' },
  ].filter(Boolean) as { clave: string; texto: string; href: string }[];

  return (
    <div className="space-y-4">
      <div data-tour="panel-filtros"><FiltrosPanel desde={desde} hasta={hasta} comparar={comparar} ver={ver} vistas={vistas} onCambiar={cambiar} disabled={pendiente} /></div>

      {avisos.length > 0 && (
        <section aria-label="Para mirar" className="panel-subir flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gm-atencion/25 bg-gm-atencion/[0.07] px-4 py-3">
          <span className="flex items-center gap-2.5 font-semibold">
            <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-gm-atencion/15 text-gm-atencion"><AlertTriangle className="size-4" /></span>
            {avisos.length === 1 ? 'Una cosa para mirar' : `${avisos.length} cosas para mirar`}
          </span>
          <ul className="flex flex-wrap gap-2">
            {avisos.map((a) => (
              <li key={a.clave}>
                <Link href={a.href} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-gm-surface-2 px-3 text-[13px] text-gm-texto-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
                  {a.texto}<ChevronRight className="size-3.5 text-gm-atencion" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div aria-busy={pendiente} className={cn('space-y-4 transition-opacity duration-200', pendiente && 'opacity-60')}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div data-tour="panel-cobrado" className="grid min-w-0"><CobradoCometa titulo={`Cobrado · ${periodo}`} baldes={baldes} total={panel.cobrado.total} anteriorTotal={panel.cobrado.anterior?.total ?? null}
            compara={comparaTexto} promedio={dias > 1 ? `promedio ${plata(panel.cobrado.total / dias)} por día` : 'hora por hora'} /></div>
          <div data-tour="panel-adentro" className="grid min-w-0"><AutosAdentro porHora={panel.hoy.adentroPorHora} ahora={panel.hoy.adentroAhora} entradas={panel.hoy.entradas} salidas={panel.hoy.salidas} /></div>
        </div>

        <section aria-label="Indicadores del período" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Minigrafico titulo="Autos que entraron" valor={e.entradas.toLocaleString('es-AR')} nota={`${e.salidas.toLocaleString('es-AR')} salidas`} actual={e.entradas} anterior={e.anterior?.entradas}
            serie={serieEstadias(panel, ver, 'entradas')} tipo="barras" formato={(n) => n.toLocaleString('es-AR')} />
          <Minigrafico titulo="Ticket promedio" valor={e.ticketPromedio !== null ? plata(e.ticketPromedio) : '—'} nota="Lo que deja cada auto al salir" actual={e.ticketPromedio} anterior={e.anterior?.ticketPromedio}
            serie={serieEstadias(panel, ver, 'ticketPromedio')} tipo="area" formato={plata} />
          <Minigrafico titulo="Estadía promedio" valor={e.duracionPromedio !== null ? minutos(e.duracionPromedio) : '—'} nota="Cuánto se quedan" actual={e.duracionPromedio} anterior={e.anterior?.duracionPromedio}
            serie={serieEstadias(panel, ver, 'duracionPromedio')} tipo="linea" formato={minutos} sentido="neutro" />
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div data-tour="panel-dias" className="grid min-w-0"><CalendarioDias dias={panel.calendario} hoy={panel.hoy.fecha} elegido={desde === hasta ? desde : null} onElegir={(f) => cambiar({ desde: f, hasta: f })} /></div>
          <div data-tour="panel-pagos" className="grid min-w-0"><PagosTramas porMedio={panel.cobrado.porMedio} periodo={periodo} /></div>
        </div>
      </div>
    </div>
  );
}
