import type { ResumenCaja } from '@/types/box-list.type';
const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dinero = (n: number) => formato.format(n);

export function ResumenCajaNeto({ resumen }: { resumen: ResumenCaja }) {
  const medios = resumen.medios.filter(m => m.porcentaje !== 0 && (m.comision !== 0 || (m.pendiente ?? 0) > 0));
  if (!medios.length) return null;
  return <details className="border-t border-border/60 px-5 py-3 sm:px-6">
    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Totales de comisión <span className="ml-1 tabular-nums">· {dinero(resumen.comisionEstimada)}</span></summary>
    <div className="mt-3 divide-y divide-border/60">{medios.map(m => <div key={m.metodo} className="space-y-2 py-3 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{m.etiqueta}</span><span className="text-muted-foreground">{m.porcentaje === null ? 'Comisión a definir' : m.porcentaje.toLocaleString('es-AR', { maximumFractionDigits: 4 }) + '%'}</span></div>
      <dl className="grid grid-cols-3 gap-2 tabular-nums"><div><dt className="text-muted-foreground">Bruto</dt><dd className="mt-1">{dinero(m.bruto)}</dd></div><div><dt className="text-muted-foreground">Comisión</dt><dd className="mt-1">{m.pendiente ? 'Pendiente' : '− ' + dinero(m.comision)}</dd></div><div className="text-right"><dt className="text-muted-foreground">{m.pendiente ? 'Neto parcial' : 'Neto digital'}</dt><dd className="mt-1 font-medium">{dinero(m.neto)}</dd></div></dl>
    </div>)}</div>
    {(resumen.importePendienteComision ?? 0) > 0 && <p className="mt-2 text-xs text-muted-foreground">Comisión pendiente sobre {dinero(resumen.importePendienteComision ?? 0)}. Se conserva el importe sin descuento.</p>}
    <p className="mt-2 text-xs text-muted-foreground">Estimación con los porcentajes actuales. Los cobros digitales no se suman al efectivo.</p>
  </details>;
}