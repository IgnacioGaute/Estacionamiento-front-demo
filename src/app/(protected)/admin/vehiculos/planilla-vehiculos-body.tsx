'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CalendarDays, Download, FileText, Inbox, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { AppDatePicker } from '@/components/app-date-picker';
import { Button } from '@/components/ui/button';
import { DataLoading } from '@/components/ui/data-loading';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatEstadia } from '@/utils/estadia';
import { planillaVehiculosAction } from '@/actions/tickets/planilla-vehiculos.action';
import { useTenant } from '@/components/tenant-provider';
import { generarPdfVehiculos } from '@/utils/generate-vehiculos-pdf';
import { TariffSelect } from '../tarifas/tariff-select';
import {
  CabeceraTabla, ChapaVehiculo, ChipFiltro, EtiquetaTipo, Iniciales, LeyendaTramos, Permanencia, PieTabla, SelectorSegmentado,
  TarjetaResumen, tarjetaPlanilla, tdPlanilla, thPlanilla,
} from '@/components/planilla/planilla-ui';
import type { EstadoPlanilla, FilaPlanillaVehiculos, FiltrosPlanillaVehiculos, PlanillaVehiculos } from '@/services/tickets.service';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
// Páginas cortas: en el celular 50 filas eran una lista interminable.
const POR_PAGINA = 15;
const TITULOS: Record<EstadoPlanilla, string> = { TODAS: 'Movimientos', ENTRADAS: 'Entradas', SALIDAS: 'Salidas', PRESENTES: 'Adentro ahora' };

const fechaCorta = (dia: string | null) => (dia ? dayjs(dia).format('DD/MM') : '');
const fecha = (dia: string | null, hora: string | null) => (dia ? `${dayjs(dia).format('DD/MM/YYYY')} ${hora?.slice(0, 5) ?? ''}`.trim() : '—');

export function PlanillaVehiculosBody() {
  const hoy = dayjs().tz(TZ).format('YYYY-MM-DD');
  const ayer = dayjs().tz(TZ).subtract(1, 'day').format('YYYY-MM-DD');
  const hace7 = dayjs().tz(TZ).subtract(6, 'day').format('YYYY-MM-DD');
  const { types } = useVehicleTypes();
  const nombreTipo = (code: string | null) => (code ? types.find((t) => t.code === code)?.name ?? code : '—');
  const [filtros, setFiltros] = useState<FiltrosPlanillaVehiculos>({ desde: hoy, hasta: hoy, estado: 'TODAS' });
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PlanillaVehiculos | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);
  const { context, playaId, cobroHabilitado } = useTenant();
  const pedido = useRef(0);

  useEffect(() => {
    const n = ++pedido.current;
    startTransition(async () => {
      const r = await planillaVehiculosAction({ ...filtros, page: pagina + 1, limit: POR_PAGINA });
      if (n !== pedido.current) return;
      if ('error' in r) { setError(r.error); return; }
      setError('');
      setDatos(r);
    });
  }, [filtros, pagina]);
  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => { setPagina(0); setFiltros((f) => (f.q === (busqueda.trim() || undefined) ? f : { ...f, q: busqueda.trim() || undefined })); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);
  const cambiar = (cambios: Partial<FiltrosPlanillaVehiculos>) => { setPagina(0); setFiltros((f) => ({ ...f, ...cambios })); };
  const periodo = (desde: string, hasta: string) => cambiar({ desde, hasta });

  // Todas las filas del filtro (no solo la página), en tandas como las pide la pantalla. Null si
  // falló o no hay nada que exportar (ya avisó).
  const todasLasFilas = async () => {
    const filas: FilaPlanillaVehiculos[] = [];
    for (let p = 1; p <= 50; p++) {
      const r = await planillaVehiculosAction({ ...filtros, page: p, limit: 100 });
      if ('error' in r) { toast.error(r.error); return null; }
      filas.push(...r.data);
      if (p >= r.meta.totalPages) break;
    }
    if (!filas.length) { toast.error('No hay vehículos para exportar con estos filtros.'); return null; }
    return filas;
  };

  // El PDF: un informe para imprimir o mandar, con los filtros en el encabezado.
  const exportarPdf = async () => {
    setExportando('pdf');
    try {
      const filas = await todasLasFilas();
      if (!filas) return;
      const playa = context.playas.find((p) => p.id === playaId);
      const filtrosEnPalabras = [
        filtros.operador && `Operador: ${filtros.operador}`,
        filtros.tipo && `Tipo: ${nombreTipo(filtros.tipo)}`,
        filtros.q && `Búsqueda: «${filtros.q}»`,
      ].filter((f): f is string => !!f);
      const bytes = await generarPdfVehiculos(filas, datos?.resumen, {
        playa: playa?.nombre ?? 'Playa',
        empresa: context.empresa?.nombre ?? null,
        desde: filtros.desde,
        hasta: filtros.hasta,
        estado: filtros.estado,
        gratuita: !cobroHabilitado,
        filtros: filtrosEnPalabras,
        generado: new Date(),
      }, nombreTipo);
      const nombre = filtros.estado === 'PRESENTES' ? `vehiculos-adentro-${hoy}.pdf` : `vehiculos-${filtros.desde}-a-${filtros.hasta}.pdf`;
      saveAs(new Blob([bytes as BlobPart], { type: 'application/pdf' }), nombre);
      toast.success('Informe en PDF descargado.');
    } catch {
      toast.error('No se pudo armar el PDF. Revisá la conexión e intentá de nuevo.');
    } finally {
      setExportando(null);
    }
  };

  const exportar = async () => {
    setExportando('excel');
    try {
      const filas = await todasLasFilas();
      if (!filas) return;
      const hoja = XLSX.utils.json_to_sheet(filas.map((f) => ({
        'Vehículo': f.vehiculo,
        'Tipo': nombreTipo(f.tipo),
        'Origen': f.origen === 'BARCODE' ? 'Tarjeta' : 'Patente',
        'Entrada': fecha(f.entradaDia, f.entradaHora),
        'Salida': f.salidaDia ? fecha(f.salidaDia, f.salidaHora) : 'Adentro',
        'Permanencia': f.permanenciaMinutos == null ? '' : formatEstadia(f.permanenciaMinutos),
        'Permanencia (minutos)': f.permanenciaMinutos ?? '',
        'Registró la entrada': f.operadorEntrada ?? 'No registrado',
        'Registró la salida': f.salidaDia ? f.operadorSalida ?? 'No registrado' : '',
      })));
      hoja['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 24 }];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Vehículos');
      const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `vehiculos-${filtros.desde}-a-${filtros.hasta}.xlsx`);
      toast.success('Planilla exportada.');
    } catch {
      toast.error('No se pudo exportar la planilla. Revisá la conexión e intentá de nuevo.');
    } finally {
      setExportando(null);
    }
  };

  const filas = datos?.data ?? [];
  const total = datos?.meta.totalItems ?? 0;
  const resumen = datos?.resumen;
  const presentes = filtros.estado === 'PRESENTES';
  const esHoy = filtros.desde === hoy && filtros.hasta === hoy;
  const rango = filtros.desde === filtros.hasta ? dayjs(filtros.desde).format('DD/MM') : `${fechaCorta(filtros.desde)} – ${fechaCorta(filtros.hasta)}`;
  const delPeriodo = esHoy ? 'de hoy' : 'del período';
  const botonFecha = (texto: string, etiqueta: string) => (
    <Button type="button" variant="outline" disabled={presentes} aria-label={etiqueta} className="h-10 gap-2 rounded-full border-gm-line-strong px-3.5 text-[13px] font-semibold">
      <CalendarDays className="size-[15px] text-gm-yellow" aria-hidden />{texto}
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Vehículos']}
        title="Vehículos"
        description="Entradas, salidas y vehículos adentro, con permanencia y quién registró cada movimiento."
        actions={
          // Excel sigue siendo la descarga principal; el PDF, un informe con los mismos filtros.
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={exportar} disabled={!!exportando || isPending} className="h-11 gap-2 rounded-xl bg-gm-yellow font-semibold text-gm-ink hover:bg-gm-yellow/90">
              <Download className="size-4" aria-hidden />{exportando === 'excel' ? 'Exportando…' : 'Exportar Excel'}
            </Button>
            <Button type="button" variant="outline" onClick={exportarPdf} disabled={!!exportando || isPending} className="h-11 gap-2 rounded-xl border-gm-line-strong">
              <FileText className="size-4 text-gm-yellow" aria-hidden />{exportando === 'pdf' ? 'Armando PDF…' : 'Descargar PDF'}
            </Button>
          </div>
        }
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaResumen destacada etiqueta="Adentro ahora" valor={resumen?.presentes ?? '—'} detalle="en la playa en este momento" />
        <TarjetaResumen etiqueta="Entradas" valor={resumen?.entradas ?? '—'} detalle={delPeriodo} />
        <TarjetaResumen etiqueta="Salidas" valor={resumen?.salidas ?? '—'} detalle={delPeriodo} />
        <TarjetaResumen etiqueta="Permanencia típica" valor={resumen?.permanenciaMediana != null ? formatEstadia(resumen.permanenciaMediana) : '—'} detalle="mediana de las salidas" />
      </section>

      <section aria-label="Filtros" className={cn(tarjetaPlanilla, 'flex flex-col gap-3 p-3.5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelectorSegmentado<EstadoPlanilla>
            etiqueta="Qué movimientos"
            valor={filtros.estado}
            onChange={(estado) => cambiar({ estado })}
            opciones={[
              { id: 'TODAS', label: 'Todas' },
              { id: 'ENTRADAS', label: 'Entradas', cantidad: resumen?.entradas },
              { id: 'SALIDAS', label: 'Salidas', cantidad: resumen?.salidas },
              { id: 'PRESENTES', label: 'Adentro ahora', cantidad: resumen?.presentes },
            ]}
          />
          <div role="group" aria-label="Período" className="flex flex-wrap items-center gap-1.5">
            <ChipFiltro disabled={presentes} activo={esHoy} onClick={() => periodo(hoy, hoy)}>Hoy</ChipFiltro>
            <ChipFiltro disabled={presentes} activo={filtros.desde === ayer && filtros.hasta === ayer} onClick={() => periodo(ayer, ayer)}>Ayer</ChipFiltro>
            <ChipFiltro disabled={presentes} activo={filtros.desde === hace7 && filtros.hasta === hoy} onClick={() => periodo(hace7, hoy)}>7 días</ChipFiltro>
            <AppDatePicker title="Desde" value={filtros.desde} max={filtros.hasta} onChange={(v) => v && cambiar({ desde: v })} trigger={botonFecha(rango, 'Elegir fecha desde')} />
            {filtros.desde !== filtros.hasta && <AppDatePicker title="Hasta" value={filtros.hasta} min={filtros.desde} onChange={(v) => v && cambiar({ hasta: v })} trigger={botonFecha('Hasta', 'Elegir fecha hasta')} />}
          </div>
        </div>
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="relative block">
            <span className="sr-only">Buscar patente, tarjeta o apellido</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Patente, tarjeta o apellido"
              className="gm-mono h-11 w-full rounded-xl border border-gm-line-strong bg-background pl-[42px] pr-3.5 text-sm uppercase tracking-[0.06em] text-foreground outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-gm-yellow" />
          </label>
          <TariffSelect name="Operador" value={filtros.operador ?? 'ALL'} onValueChange={(v) => cambiar({ operador: v === 'ALL' ? undefined : v })}
            options={[{ value: 'ALL', label: 'Todos los operadores' }, ...(datos?.operadores ?? []).map((o) => ({ value: o, label: o }))]} />
          <TariffSelect name="Tipo de vehículo" value={filtros.tipo ?? 'ALL'} onValueChange={(v) => cambiar({ tipo: v === 'ALL' ? undefined : v })}
            options={[{ value: 'ALL', label: 'Todos los tipos' }, ...types.map((t) => ({ value: t.code, label: t.name }))]} />
        </div>
        {presentes && <p className="px-1 text-xs text-muted-foreground">«Adentro ahora» muestra los vehículos que siguen en la playa, sin importar las fechas.</p>}
      </section>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <section aria-label="Movimientos" aria-busy={isPending} className={cn(tarjetaPlanilla, 'overflow-hidden')}>
        <CabeceraTabla titulo={presentes ? TITULOS.PRESENTES : `${TITULOS[filtros.estado]} ${esHoy ? 'de hoy' : rango}`} cantidad={total}>
          <LeyendaTramos />
        </CabeceraTabla>
        {isPending && !datos ? <div className="p-6"><DataLoading label="Cargando la planilla…" /></div> : !filas.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No hay movimientos con estos filtros.</p>
          </div>
        ) : (
          <div className={cn('transition-opacity', isPending && 'opacity-50')}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="bg-[#15130F]">
                  <tr>
                    <th scope="col" className={thPlanilla}>Vehículo</th>
                    <th scope="col" className={thPlanilla}>Tipo</th>
                    <th scope="col" className={thPlanilla}>Entrada</th>
                    <th scope="col" className={thPlanilla}>Salida</th>
                    <th scope="col" className={cn(thPlanilla, 'w-[190px]')}>Permanencia</th>
                    <th scope="col" className={thPlanilla}>Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id} className="border-t border-gm-line transition-colors hover:bg-gm-surface-2">
                      <td className={tdPlanilla}>
                        <div className="flex items-center gap-2.5">
                          <ChapaVehiculo texto={f.vehiculo} tarjeta={f.origen === 'BARCODE'} />
                          <span className="text-xs text-muted-foreground">{f.origen === 'BARCODE' ? 'Tarjeta' : 'Patente'}</span>
                        </div>
                      </td>
                      <td className={tdPlanilla}><EtiquetaTipo>{nombreTipo(f.tipo)}</EtiquetaTipo></td>
                      <td className={cn(tdPlanilla, 'whitespace-nowrap')}>
                        <span className="gm-mono block text-[15px] font-bold">{f.entradaHora?.slice(0, 5) ?? '—'}</span>
                        <span className="block text-xs text-muted-foreground">{fechaCorta(f.entradaDia)}</span>
                      </td>
                      <td className={cn(tdPlanilla, 'whitespace-nowrap')}>
                        {f.salidaDia ? (
                          <>
                            <span className="gm-mono block text-[15px] font-bold">{f.salidaHora?.slice(0, 5)}</span>
                            <span className="block text-xs text-muted-foreground">{fechaCorta(f.salidaDia)}</span>
                          </>
                        ) : <EtiquetaAdentro />}
                      </td>
                      <td className={tdPlanilla}><Permanencia minutos={f.permanenciaMinutos} sufijo={f.salidaDia ? undefined : 'y sigue'} /></td>
                      <td className={tdPlanilla}>
                        <div className="flex flex-col gap-1 text-[13px]">
                          <span className="inline-flex items-center gap-2"><Iniciales nombre={f.operadorEntrada} />{f.operadorEntrada ?? 'No registrado'}<span className="text-xs text-muted-foreground">entrada</span></span>
                          {f.salidaDia && <span className="inline-flex items-center gap-2"><Iniciales nombre={f.operadorSalida} />{f.operadorSalida ?? 'No registrado'}<span className="text-xs text-muted-foreground">salida</span></span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-2 p-3 md:hidden">
              {filas.map((f) => (
                <li key={f.id} className="flex flex-col gap-2.5 rounded-2xl border border-gm-line bg-gm-surface-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2"><ChapaVehiculo texto={f.vehiculo} tarjeta={f.origen === 'BARCODE'} /><span className="text-xs text-muted-foreground">{nombreTipo(f.tipo)}</span></div>
                    {!f.salidaDia && <EtiquetaAdentro />}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="block text-[11px] text-muted-foreground">Entrada</span><span className="gm-mono text-[15px] font-bold">{f.entradaHora?.slice(0, 5) ?? '—'}</span> <span className="text-xs text-muted-foreground">{fechaCorta(f.entradaDia)}</span></div>
                    <div><span className="block text-[11px] text-muted-foreground">Salida</span><span className="gm-mono text-[15px] font-bold">{f.salidaHora?.slice(0, 5) ?? '—'}</span> <span className="text-xs text-muted-foreground">{fechaCorta(f.salidaDia)}</span></div>
                  </div>
                  <Permanencia minutos={f.permanenciaMinutos} sufijo={f.salidaDia ? undefined : 'y sigue'} />
                  <p className="text-[12.5px] text-muted-foreground">Entró con {f.operadorEntrada ?? 'operador no registrado'}{f.salidaDia ? ` · salió con ${f.operadorSalida ?? 'operador no registrado'}` : ''}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <PieTabla pagina={pagina} porPagina={POR_PAGINA} total={total} mostrados={filas.length} onCambiar={setPagina} disabled={isPending} />
      </section>
    </div>
  );
}

function EtiquetaAdentro() {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-sky-400/[0.12] px-2.5 text-[12.5px] font-bold text-sky-300">
      <span aria-hidden className="size-[7px] rounded-full bg-sky-400" />Adentro
    </span>
  );
}
