import type { ResumenCaja } from '@/types/box-list.type';
const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dinero = (n: number) => formato.format(n);

export function ResumenCajaNeto({ resumen }: { resumen: ResumenCaja }) {
  const pendiente = (resumen.importePendienteComision ?? 0) > 0;
  return <section aria-label="Total de caja con comisiones" className="rounded-xl border border-border bg-background/30 p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs text-muted-foreground">Efectivo y cobros digitales</p><h3 className="mt-1 text-sm font-medium">{pendiente ? 'Neto estimado · cálculo parcial' : 'Total neto estimado'}</h3></div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{dinero(resumen.totalNetoEstimado)}</p>
    </div>
    <dl className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Antes de comisiones</dt><dd className="tabular-nums">{dinero(resumen.totalAntesComisiones)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Comisiones de Mercado Pago estimadas</dt><dd className="tabular-nums">− {dinero(resumen.comisionEstimada)}</dd></div></dl>
    {pendiente && <p role="status" className="mt-3 text-xs leading-relaxed text-muted-foreground">Falta calcular la comisión de {dinero(resumen.importePendienteComision ?? 0)}: no se informó el medio de pago o falta definir su porcentaje. Ese importe está incluido sin descuento.</p>}
    {resumen.medios.length > 0 && <div className="mt-4 border-t border-border/60 pt-3">
      <h4 className="text-xs font-medium">Cobros por medio de pago</h4>
      <div className="mt-2 divide-y divide-border/60">{resumen.medios.map(m => <div key={m.metodo} className="space-y-2 py-3 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{m.etiqueta}</span><span className="text-muted-foreground">{m.porcentaje === null ? 'Comisión a definir' : m.porcentaje.toLocaleString('es-AR', { maximumFractionDigits: 4 }) + '%'}</span></div>
        <dl className="grid grid-cols-3 gap-2 tabular-nums"><div><dt className="text-muted-foreground">Bruto</dt><dd className="mt-1">{dinero(m.bruto)}</dd></div><div><dt className="text-muted-foreground">Comisión</dt><dd className="mt-1">{m.pendiente ? 'Pendiente' : '− ' + dinero(m.comision)}</dd></div><div className="text-right"><dt className="text-muted-foreground">{m.pendiente ? 'Neto parcial' : 'Neto'}</dt><dd className="mt-1 font-medium">{dinero(m.neto)}</dd></div></dl>
      </div>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Porcentajes actuales de la empresa, también para fechas anteriores. El efectivo físico se muestra aparte.</p>
    </div>}
  </section>;
}
