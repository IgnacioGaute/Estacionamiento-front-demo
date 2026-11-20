'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getCobrosEfectivoAction } from '@/actions/turnos/cobros-efectivo.action';
import { cn } from '@/lib/utils';
import type { CobroEfectivo, CobrosEfectivoTurno, Turno } from '@/types/turno.type';
import { money } from './turno-ui';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';

const CONCEPTOS: Record<CobroEfectivo['concepto'], string> = {
  ANTICIPO: 'Anticipo',
  SALDO: 'Saldo al salir',
  AJUSTE: 'Ajuste',
  DEVOLUCION: 'Devolución',
  PAGO_INQUILINO: 'Pago de inquilino',
  DEVOLUCION_INQUILINO: 'Devolución a inquilino',
  ANULACION_INQUILINO: 'Anulación de pago de inquilino',
  ESTADIA_PERIODO: 'Estadía por período',
  DEVOLUCION_ANTICIPO: 'Devolución de anticipo',
  AJUSTE_CAJA: 'Ajuste de caja',
  COBRO: 'Cobro en efectivo',
};
const concepto = (c: CobroEfectivo) =>
  c.concepto === 'ESTADIA_PERIODO' && c.periodo ? `Estadía por ${c.periodo}`
    : c.concepto === 'ANULACION_INQUILINO' && c.anula === 'DEVOLUCION' ? 'Anulación de devolución a inquilino'
      : CONCEPTOS[c.concepto] ?? 'Cobro en efectivo';
const conSigno = (n: number) => (n < 0 ? '− ' : '') + money(Math.abs(n));

// En el historial, lo que este turno cobró en efectivo, operación por operación, para revisar un
// faltante sin buscar cada cobro en la planilla. Se pide al tocar: la lista de turnos no trae el
// detalle de cada uno. Es solo de este turno, aunque comparta la caja con otros operadores.
export function CobrosEfectivoHistorial({ turnoId, resumen }: { turnoId: string; resumen?: Turno['resumen'] }) {
  const [detalle, setDetalle] = useState<CobrosEfectivoTurno | null | undefined>(undefined);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function ver() {
    setAbierto(true);
    setCargando(true);
    try {
      setDetalle(await getCobrosEfectivoAction(turnoId));
    } catch {
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }

  if (!abierto)
    return <button type="button" onClick={() => void ver()}
      className="min-h-11 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
      Ver cobros en efectivo
    </button>;
  if (cargando) return <p role="status" className="text-xs text-muted-foreground">Buscando los cobros en efectivo…</p>;
  if (!detalle) return <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>No se pudieron traer los cobros en efectivo de este turno.</span>
    <button type="button" onClick={() => void ver()} className="min-h-11 font-semibold text-foreground underline-offset-2 hover:underline">Reintentar</button>
  </div>;
  if (!detalle.cobros.length) return <p className="text-xs text-muted-foreground">Este turno no registró cobros ni devoluciones en efectivo.</p>;

  // El total del detalle es lo cobrado menos lo devuelto en efectivo. El resumen del turno muestra
  // esas dos cosas por separado y suma aparte los gastos e ingresos de Varios.
  const delResumen = resumen ? resumen.efectivoCobrado - resumen.devolucionesEfectivo : null;
  const mismoAlcance = delResumen == null || delResumen === detalle.total;
  const multiDia = new Set(detalle.cobros.map((c) => dayjs(c.fecha).tz(TZ).format('YYYY-MM-DD'))).size > 1;
  return (
    <section aria-label="Cobros en efectivo del turno" className="overflow-hidden rounded-2xl border border-gm-line">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-gm-line bg-gm-surface-2/60 px-3.5 py-2.5">
        <h3 className="text-[13px] font-semibold">Cobros en efectivo</h3>
        <p className="text-xs text-muted-foreground">
          {detalle.cantidad} {detalle.cantidad === 1 ? 'cobro' : 'cobros'} · Total <strong className="tabular-nums text-foreground">{conSigno(detalle.total)}</strong>
        </p>
      </header>
      <ul className="divide-y divide-gm-line">
        {detalle.cobros.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-3.5 py-2.5">
            <span className="gm-mono w-11 shrink-0 pt-0.5 text-xs text-muted-foreground">
              {multiDia ? <>{dayjs(c.fecha).tz(TZ).format('DD/MM')}<br /></> : null}{dayjs(c.fecha).tz(TZ).format('HH:mm')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{concepto(c)}</span>
              <span className={cn('block break-words text-xs', c.sinDetalle ? 'text-gm-atencion' : 'text-muted-foreground')}>
                {c.sinDetalle ? 'Sin detalle de la operación' : c.identificacion ?? 'Sin vehículo asociado'}
              </span>
            </span>
            <span className={cn('shrink-0 pt-0.5 text-[13px] font-semibold tabular-nums', c.importe < 0 && 'text-gm-atencion')}>{conSigno(c.importe)}</span>
          </li>
        ))}
      </ul>
      <footer className="space-y-1.5 border-t border-gm-line bg-gm-surface-2/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {detalle.egresos > 0 && <p>Cobrado {money(detalle.ingresos)} · devuelto {money(detalle.egresos)}.</p>}
        {delResumen != null && mismoAlcance && <p>Coincide con el resumen del turno: lo cobrado en efectivo menos lo devuelto.</p>}
        <p>
          Solo lo que recibió este turno, aunque comparta la caja. No incluye transferencias, Mercado Pago, cortesías ni gastos e
          ingresos de Varios{resumen && (resumen.gastosEfectivo || resumen.ingresosVarios) ? ', que el resumen muestra aparte' : ''}.
        </p>
        {!mismoAlcance && <p className="text-gm-atencion">El resumen del turno da {conSigno(delResumen!)} entre lo cobrado y lo devuelto en efectivo, y este detalle {conSigno(detalle.total)}. Revisá la diferencia en la planilla del día.</p>}
        {detalle.sinDetalle > 0 && <p>{detalle.sinDetalle === 1 ? 'Un movimiento entró' : `${detalle.sinDetalle} movimientos entraron`} a la caja sin que se pueda saber de qué operación (por ejemplo, un pase marcado como pagado después o eliminado, o un ajuste de caja): se muestran con su hora e importe.</p>}
      </footer>
    </section>
  );
}
