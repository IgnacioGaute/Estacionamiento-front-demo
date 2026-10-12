import type { ReactNode } from 'react';
import { ArrowRight, Car } from 'lucide-react';
import { Turno } from '@/types/turno.type';
import { cn } from '@/lib/utils';
import { Etiqueta, money } from '@/components/turno-ui';

// Lo mismo se lee en «Mi turno», en el historial y en la planilla: primero cómo se cobró, después
// qué salió de la caja, cuántos vehículos pasaron y qué quedó para el siguiente.
export function TurnoResumenPanel({ turno }: { turno: Turno }) {
  const r = turno.resumen;
  if (!r) return null;
  const retiros = [['Gastos', r.gastosEfectivo], ['Sueldo', r.sueldoRetirado], ['Recaudación', r.retirosRecaudacion]] as const;
  const detalleRetiros = retiros.filter(([, amount]) => amount !== 0);
  const abierto = turno.estado === 'ABIERTO';
  const fondoInicialCaja = turno.cashSession?.fondoInicial ?? turno.fondoInicial;
  const mercadoPago = r.mercadoPagoAlias + r.mercadoPagoQr;
  const vehiculos = (n: number | null) => n == null ? 'No informado' : String(n);
  return <section aria-label="Resumen del turno" className="w-full space-y-3">
    <div className="rounded-2xl border border-gm-line bg-gm-surface-2/50">
      <Etiqueta className="px-4 pt-3.5">Cobros del turno</Etiqueta>
      <dl className="grid divide-y divide-gm-line py-1.5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-3">
        <Medio punto="bg-emerald-400" label="Efectivo" value={money(r.efectivoCobrado)} />
        <Medio punto="bg-sky-400" label="Mercado Pago" value={money(mercadoPago)}>
          {mercadoPago !== 0 && <span className="mt-1 flex flex-wrap justify-end gap-x-2 text-[11px] font-medium leading-snug text-muted-foreground sm:justify-start"><span>Alias {money(r.mercadoPagoAlias)}</span><span>QR {money(r.mercadoPagoQr)}</span></span>}
        </Medio>
        <Medio punto="bg-violet-400" label="Transferencias" value={money(r.transferencias)} />
      </dl>
    </div>

    <div className="divide-y divide-gm-line overflow-hidden rounded-2xl border border-gm-line">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold">Retirado de caja</p><p className="font-bold tabular-nums">{money(r.totalRetirado)}</p></div>
        {detalleRetiros.length > 0 && <dl className="mt-2.5 flex flex-wrap gap-1.5">
          {detalleRetiros.map(([label, value]) => <div key={label} className="inline-flex items-baseline gap-1.5 rounded-full bg-gm-surface-3 px-2.5 py-1 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{money(value)}</dd></div>)}
        </dl>}
      </div>

      <div className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Car className="size-3.5" aria-hidden />Vehículos · toda la playa</p>
        <dl className={cn('mt-2 grid gap-3', abierto ? 'grid-cols-2' : 'grid-cols-3')}>
          <Conteo label="Recibidos" value={vehiculos(r.vehiculosInicio)} />
          <Conteo label="Salidas" value={vehiculos(r.salidas)} />
          {!abierto && <Conteo label="Quedan dentro" value={vehiculos(r.vehiculosFin)} />}
        </dl>
      </div>

      {r.efectivoParaSiguiente != null ? <div className="bg-emerald-400/[0.06] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold"><ArrowRight className="size-4 text-emerald-400" aria-hidden />Deja al siguiente turno</span>
          <strong className="tabular-nums text-emerald-400">{money(r.efectivoParaSiguiente)}</strong>
        </div>
        {fondoInicialCaja != null && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Fondo inicial de caja: {money(fondoInicialCaja)}. Lo que queda no se incluye en lo retirado.</p>}
      </div>
        : !abierto && <p className="px-4 py-3 text-xs text-muted-foreground">{turno.cierreAutomatico ? 'Corte de las 00:00. La caja continúa abierta.' : 'La caja sigue abierta con otros operadores.'}</p>}
    </div>

    {turno.alertaSueldo && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">{turno.alertaSueldo}</p>}
    {r.movimientos.length > 0 && <details className="group text-xs">
      <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">Ver movimientos de caja</summary>
      <ul className="mt-2 divide-y divide-gm-line rounded-xl border border-gm-line">
        {r.movimientos.map(m => <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
          <span className="min-w-0"><span className="block font-semibold">{m.tipo === 'SUELDO' ? 'Sueldo' : m.tipo === 'APORTE' ? 'Dinero agregado' : 'Retiro'}</span><span className="mt-0.5 block text-muted-foreground">{m.operador || 'No informado'} · {m.motivo}</span></span>
          <span className={cn('shrink-0 font-semibold tabular-nums', m.tipo === 'APORTE' ? 'text-emerald-400' : '')}>{m.tipo === 'APORTE' ? '+' : '−'}{money(Math.abs(m.amount))}</span>
        </li>)}
      </ul>
    </details>}
  </section>;
}

function Medio({ punto, label, value, children }: { punto: string; label: string; value: string; children?: ReactNode }) {
  // En el celular, una fila por medio de pago; desde sm, tres columnas.
  return <div className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-2 sm:block sm:py-0">
    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', punto)} /><span className="truncate">{label}</span></dt>
    <dd className="text-right text-base font-bold tabular-nums sm:mt-1 sm:text-left sm:text-lg">{value}{children}</dd>
  </div>;
}

function Conteo({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-lg font-bold tabular-nums">{value}</dd></div>;
}
