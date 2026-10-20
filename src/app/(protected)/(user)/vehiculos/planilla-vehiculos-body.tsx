'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CalendarDays, Download, Inbox, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { AppDatePicker } from '@/components/app-date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataLoading } from '@/components/ui/data-loading';
import { CompactPagination } from '@/components/compact-pagination';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatEstadia } from '@/utils/estadia';
import { planillaVehiculosAction } from '@/actions/tickets/planilla-vehiculos.action';
import type { EstadoPlanilla, FilaPlanillaVehiculos, FiltrosPlanillaVehiculos, PlanillaVehiculos } from '@/services/tickets.service';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const POR_PAGINA = 50;
const ESTADOS: { id: EstadoPlanilla; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'ENTRADAS', label: 'Entradas' },
  { id: 'SALIDAS', label: 'Salidas' },
  { id: 'PRESENTES', label: 'Adentro ahora' },
];

const fecha = (dia: string | null, hora: string | null) => (dia ? `${dayjs(dia).format('DD/MM/YYYY')} ${hora?.slice(0, 5) ?? ''}`.trim() : '—');
const permanencia = (minutos: number | null) => (minutos == null ? '—' : formatEstadia(minutos));

export function PlanillaVehiculosBody() {
  const hoy = dayjs().tz(TZ).format('YYYY-MM-DD');
  const { types } = useVehicleTypes();
  const nombreTipo = (code: string | null) => (code ? types.find((t) => t.code === code)?.name ?? code : '—');
  const [filtros, setFiltros] = useState<FiltrosPlanillaVehiculos>({ desde: hoy, hasta: hoy, estado: 'TODAS' });
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PlanillaVehiculos | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [exportando, setExportando] = useState(false);
  const pedido = useRef(0);

  const cargar = (f: FiltrosPlanillaVehiculos, p: number) => {
    const n = ++pedido.current;
    startTransition(async () => {
      const r = await planillaVehiculosAction({ ...f, page: p + 1, limit: POR_PAGINA });
      if (n !== pedido.current) return;
      if ('error' in r) { setError(r.error); return; }
      setError('');
      setDatos(r);
    });
  };
  useEffect(() => { cargar(filtros, pagina); }, [filtros, pagina]);
  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => { setPagina(0); setFiltros((f) => (f.q === busqueda.trim() ? f : { ...f, q: busqueda.trim() || undefined })); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);
  const cambiar = (cambios: Partial<FiltrosPlanillaVehiculos>) => { setPagina(0); setFiltros((f) => ({ ...f, ...cambios })); };

  // Exporta todas las filas del filtro (no solo la página), en tandas como las pide la pantalla.
  const exportar = async () => {
    setExportando(true);
    try {
      const filas: FilaPlanillaVehiculos[] = [];
      for (let p = 1; p <= 50; p++) {
        const r = await planillaVehiculosAction({ ...filtros, page: p, limit: 100 });
        if ('error' in r) { toast.error(r.error); return; }
        filas.push(...r.data);
        if (p >= r.meta.totalPages) break;
      }
      if (!filas.length) { toast.error('No hay vehículos para exportar con estos filtros.'); return; }
      const hoja = XLSX.utils.json_to_sheet(filas.map((f) => ({
        'Vehículo': f.vehiculo,
        'Tipo': nombreTipo(f.tipo),
        'Origen': f.origen === 'BARCODE' ? 'Tarjeta' : 'Patente',
        'Entrada': fecha(f.entradaDia, f.entradaHora),
        'Salida': f.salidaDia ? fecha(f.salidaDia, f.salidaHora) : 'Adentro',
        'Permanencia': permanencia(f.permanenciaMinutos),
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
      setExportando(false);
    }
  };

  const filas = datos?.data ?? [];
  const total = datos?.meta.totalItems ?? 0;
  const presentes = filtros.estado === 'PRESENTES';
  const selector = (titulo: string, valor: string, min: string | undefined, max: string | undefined, onChange: (v: string) => void) => (
    <div className="min-w-0 space-y-2 text-sm font-medium">
      <span className="block">{titulo}</span>
      <AppDatePicker title={titulo} value={valor} min={min} max={max} onChange={(v) => v && onChange(v)}
        trigger={<Button type="button" variant="outline" disabled={presentes} aria-label={`Elegir fecha ${titulo.toLowerCase()}`} className="h-11 w-full justify-start gap-2 rounded-xl font-normal"><CalendarDays className="size-4 shrink-0 text-gm-yellow" />{dayjs(valor).format('DD/MM/YYYY')}</Button>} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Planilla de vehículos']}
        title="Planilla de vehículos"
        description="Entradas, salidas y vehículos adentro, con permanencia y quién registró cada movimiento."
        actions={<Button type="button" variant="outline" onClick={exportar} disabled={exportando || isPending}><Download className="size-4" />{exportando ? 'Exportando…' : 'Exportar Excel'}</Button>}
      />

      <section aria-label="Filtros" className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div role="group" aria-label="Qué movimientos" className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button key={e.id} type="button" aria-pressed={filtros.estado === e.id} onClick={() => cambiar({ estado: e.id })}
              className={cn('min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                filtros.estado === e.id ? 'border-gm-yellow/50 bg-gm-yellow/10 text-gm-yellow' : 'border-border hover:bg-secondary/40')}>
              {e.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {selector('Desde', filtros.desde, undefined, filtros.hasta, (desde) => cambiar({ desde }))}
          {selector('Hasta', filtros.hasta, filtros.desde, undefined, (hasta) => cambiar({ hasta }))}
          <label className="min-w-0 space-y-2 text-sm font-medium">
            <span className="block">Operador</span>
            <select value={filtros.operador ?? ''} onChange={(e) => cambiar({ operador: e.target.value || undefined })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Todos</option>
              {(datos?.operadores ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-2 text-sm font-medium">
            <span className="block">Tipo de vehículo</span>
            <select value={filtros.tipo ?? ''} onChange={(e) => cambiar({ tipo: e.target.value || undefined })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Todos</option>
              {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar patente, tarjeta o apellido" aria-label="Buscar patente, tarjeta o apellido" className="h-11 rounded-xl pl-9" />
        </div>
        {presentes && <p className="text-xs text-muted-foreground">«Adentro ahora» muestra los vehículos que siguen en la playa, sin importar las fechas.</p>}
      </section>

      {datos && (
        <dl className="grid grid-cols-3 gap-3">
          {[['Entradas', datos.resumen.entradas], ['Salidas', datos.resumen.salidas], ['Adentro ahora', datos.resumen.presentes]].map(([titulo, valor]) => (
            <div key={titulo} className="rounded-2xl border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{titulo}{titulo !== 'Adentro ahora' ? ' del período' : ''}</dt>
              <dd className="gm-mono mt-1 text-2xl font-bold">{Number(valor).toLocaleString('es-AR')}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <section aria-busy={isPending} className="space-y-3 rounded-2xl border bg-card p-3 sm:p-5">
        <h2 className="text-lg font-semibold">Movimientos <span className="ml-1 text-sm font-normal text-muted-foreground">{total.toLocaleString('es-AR')}</span></h2>
        {isPending && !datos ? <DataLoading label="Cargando la planilla…" /> : !filas.length ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No hay movimientos con estos filtros.</p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', isPending && 'opacity-50')}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Vehículo</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Entrada</th>
                  <th className="px-3 py-2 font-medium">Salida</th>
                  <th className="px-3 py-2 font-medium">Permanencia</th>
                  <th className="px-3 py-2 font-medium">Operador</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-t border-border/60">
                    <td className="px-3 py-2.5">
                      <span className="gm-mono font-bold">{f.vehiculo}</span>
                      <span className="block text-xs text-muted-foreground">{f.origen === 'BARCODE' ? 'Tarjeta' : 'Patente'}</span>
                    </td>
                    <td className="px-3 py-2.5">{nombreTipo(f.tipo)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fecha(f.entradaDia, f.entradaHora)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{f.salidaDia ? fecha(f.salidaDia, f.salidaHora) : <span className="font-semibold text-sky-400">Adentro</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{permanencia(f.permanenciaMinutos)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="block">Entrada: {f.operadorEntrada ?? 'No registrado'}</span>
                      {f.salidaDia && <span className="block text-muted-foreground">Salida: {f.operadorSalida ?? 'No registrado'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <CompactPagination page={pagina} total={total} pageSize={POR_PAGINA} onChange={setPagina} />
      </section>
    </div>
  );
}
