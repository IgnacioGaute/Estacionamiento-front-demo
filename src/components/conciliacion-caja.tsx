import { ConciliacionCaja, EstadiaParaRevisar } from '@/types/turno.type';
import { cashMoney } from './cash-amount-field';

const hora = (fecha: string) => new Date(fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });

const TITULOS: Record<EstadiaParaRevisar['motivo'], string> = {
  DESCUENTO_TOTAL: 'Salió sin cobro por descuento',
  COBRO_SIN_TIEMPO: 'Cobro de una estadía de minutos',
  REINGRESO: 'Volvió a entrar enseguida',
};

// `detalle`: undefined mientras se pide (se pide recién después de cargar el conteo), null si no se
// pudo traer. El cierre no depende de esto: es una ayuda para explicar una diferencia.
export function ConciliacionCajaPanel({ detalle }: { detalle?: ConciliacionCaja | null }) {
  if (detalle === undefined) return <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">Buscando cómo se calcula el efectivo…</p>;
  if (!detalle) return null;
  const conteos = detalle.conteos ?? [];
  const paraRevisar = detalle.paraRevisar ?? [];
  return <div className="mt-3 space-y-3">
    {paraRevisar.length > 0 && <section aria-labelledby="para-revisar" className="rounded-2xl border border-gm-aviso/30 bg-gm-aviso/[0.05] p-3.5">
      <h4 id="para-revisar" className="text-sm font-semibold">Para revisar antes de explicar la diferencia</h4>
      <p className="mt-0.5 text-xs text-muted-foreground">No son errores: son los casos que más seguido explican un faltante.</p>
      <ul className="mt-2 divide-y divide-gm-line text-sm">
        {paraRevisar.map(r => <li key={r.id + r.motivo} className="py-2">
          <p><span className="gm-mono font-semibold">{r.patente}</span> · {TITULOS[r.motivo]}</p>
          <p className="text-xs text-muted-foreground">{r.detalle}</p>
        </li>)}
      </ul>
    </section>}
    <details className="border-t border-gm-line pt-3">
      <summary className="min-h-11 cursor-pointer rounded-md py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">Ver cómo se calcula el efectivo</summary>
      <dl className="space-y-2 py-3 text-sm">
        {[
          ['Fondo inicial de la caja', detalle.fondoInicial],
          ['Cobros y aportes en efectivo', detalle.ingresos],
          ['Gastos, devoluciones y retiros ya registrados', -detalle.egresos],
          ['Esperado antes de este cierre', detalle.esperado],
        ].map(([label, amount]) => <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="shrink-0 font-semibold tabular-nums">{cashMoney(Number(amount))}</dd></div>)}
      </dl>
      <p className="mb-3 text-xs text-muted-foreground">Incluye todos los turnos de esta caja. El sueldo y la recaudación que retirás al confirmar todavía están dentro del total contado.</p>
      {conteos.length > 0 && <section aria-labelledby="conteos-relevo" className="mb-3">
        <h4 id="conteos-relevo" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conteos en los cambios de turno</h4>
        <ul className="mt-1 divide-y divide-gm-line text-sm">
          {conteos.map(k => <li key={k.id} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p>{k.operador} · {k.momento === 'INGRESO' ? 'al sumarse' : 'al irse'}</p>
              <p className="text-xs text-muted-foreground">{hora(k.fecha)}{k.motivo ? ' · ' + k.motivo : ''}</p>
            </div>
            <span className="shrink-0 text-right tabular-nums">{cashMoney(k.contado)}<span className="block text-xs text-muted-foreground">{k.diferencia === 0 ? 'Coincidía' : k.diferencia > 0 ? 'Faltaban ' + cashMoney(k.diferencia) : 'Sobraban ' + cashMoney(-k.diferencia)}</span></span>
          </li>)}
        </ul>
      </section>}
      <ol className="max-h-72 overflow-y-auto divide-y divide-gm-line" aria-label="Movimientos que explican el saldo">
        {detalle.movimientos.map(m => <li key={m.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div className="min-w-0"><p className="break-words">{m.concepto}</p><p className="text-xs text-muted-foreground">{m.operador} · {hora(m.fecha)}</p></div>
          <span className="shrink-0 tabular-nums">{cashMoney(m.amount)}</span>
        </li>)}
      </ol>
      {!detalle.movimientos.length && <p className="py-3 text-sm text-muted-foreground">Todavía no hay movimientos de efectivo.</p>}
    </details>
  </div>;
}
