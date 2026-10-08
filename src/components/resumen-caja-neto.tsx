import type { ResumenCaja } from '@/types/box-list.type';
const dinero = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export function ResumenCajaNeto({ resumen }: { resumen: ResumenCaja }) {
  return <section aria-label="Total de caja con comisiones" className="overflow-hidden rounded-2xl border border-gm-yellow/25 bg-gm-yellow/5">
    <div className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total del día · efectivo y cobros digitales</p><h3 className="mt-2 text-sm font-medium">Neto estimado después de comisiones</h3><p className="mt-2 break-words text-3xl font-bold tabular-nums sm:text-4xl">{dinero(resumen.totalNetoEstimado)}</p>
      <dl className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Total antes de comisiones</dt><dd className="mt-1 font-semibold tabular-nums">{dinero(resumen.totalAntesComisiones)}</dd></div><div><dt className="text-xs text-muted-foreground">Comisiones estimadas</dt><dd className="mt-1 font-semibold tabular-nums">− {dinero(resumen.comisionEstimada)}</dd></div></dl>
    </div>
    <div className="space-y-3 border-t border-border bg-background/30 p-5 sm:px-6">
      {resumen.medios.map(medio => <div key={medio.metodo} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{medio.etiqueta}</span><span className="rounded-md bg-secondary px-2 py-1 text-xs tabular-nums">{medio.porcentaje.toLocaleString('es-AR')}%</span></div><dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Antes de comisión</dt><dd className="mt-1 break-words font-medium tabular-nums">{dinero(medio.bruto)}</dd></div><div><dt className="text-muted-foreground">Comisión</dt><dd className="mt-1 break-words font-medium tabular-nums">{dinero(medio.comision)}</dd></div><div><dt className="text-muted-foreground">Neto estimado</dt><dd className="mt-1 break-words font-semibold tabular-nums">{dinero(medio.neto)}</dd></div></dl></div>)}
      <p className="text-xs leading-relaxed text-muted-foreground">Incluye ingresos menos egresos del día. Calculado con los porcentajes actuales de la empresa, también al consultar fechas anteriores. El efectivo físico se muestra aparte.</p>
    </div>
  </section>;
}
