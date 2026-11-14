'use client';

import { ReactNode, useId, useState, useTransition } from 'react';
import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { ControlMercadoPago, Turno } from '@/types/turno.type';
import { getControlMercadoPagoAction } from '@/actions/turnos/control-mercadopago.action';
import { money } from '@/components/turno-ui';
import { cn } from '@/lib/utils';

const dia = (fecha: string) => new Date(fecha).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit' });
const hora = (fecha: string) => new Date(fecha).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// Lo que entró a la cuenta de Mercado Pago en el horario del turno contra lo que el sistema registró
// por Mercado Pago y transferencias. Si entró más de lo registrado, lo más común es un pago por
// transferencia cargado como efectivo: es la plata que «falta» en la caja. Se ve al comparar el
// conteo en el cierre y queda guardado en el historial del turno.
//
// En el historial, un turno cerrado sin control (anterior a esta función, un corte de medianoche o
// una consulta que falló) lo puede consultar la administración: se busca con el horario de ese
// turno y queda guardado, así que la próxima vez se ve sin consultar.
export function ControlMercadoPagoHistorial({ turno, disponible }: { turno: Turno; disponible: boolean }) {
  const [control, setControl] = useState(turno.controlMercadoPago ?? null);
  const [aviso, setAviso] = useState('');
  const [consultando, startTransition] = useTransition();
  const titulo = useId();
  if (turno.estado !== 'CERRADO' || !turno.fechaCierre) return null;
  // Un control con error se puede volver a pedir aunque hoy no se ofrezca a los turnos sin control.
  if (!control && !disponible) return null;
  const consultar = () => startTransition(async () => {
    setAviso('');
    const r = await getControlMercadoPagoAction(turno.id);
    if ('error' in r) setAviso(r.error);
    else if (r.control) setControl(r.control);
    else setAviso('Mercado Pago no está disponible: la cuenta tiene que estar conectada y un administrador tiene que aceptar las condiciones vigentes en Configuración → Mercado Pago.');
  });
  const boton = (texto: string) => <button type="button" onClick={consultar} disabled={consultando}
    className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gm-line px-3 text-sm font-semibold transition-colors hover:bg-gm-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60">
    <RefreshCw className={cn('size-4', consultando && 'animate-spin')} aria-hidden />{consultando ? 'Consultando…' : texto}
  </button>;
  const pie = aviso && <p role="alert" className="mt-2 text-xs text-gm-atencion">{aviso}</p>;
  if (!control)
    return <section aria-labelledby={titulo} className="rounded-2xl border border-gm-line p-3.5 text-sm">
      <h4 id={titulo} className="font-semibold">Mercado Pago del turno</h4>
      <p className="mt-1 text-xs text-muted-foreground">No se consultó al cerrar. Se busca lo que entró a la cuenta de {hora(turno.fechaApertura)} a {hora(turno.fechaCierre)} del {dia(turno.fechaApertura)} y queda guardado.</p>
      {boton('Consultar Mercado Pago')}{pie}
    </section>;
  return <ControlMercadoPagoPanel control={control}>{control.estado === 'ERROR' && <>{boton('Consultar de nuevo')}{pie}</>}</ControlMercadoPagoPanel>;
}

export function ControlMercadoPagoPanel({ control, children }: { control: ControlMercadoPago; children?: ReactNode }) {
  const titulo = useId();
  const horario = `${hora(control.desde)} a ${hora(control.hasta)}`;

  if (control.estado === 'ERROR')
    return <section aria-labelledby={titulo} className="rounded-2xl border border-gm-line p-3.5 text-sm">
      <h4 id={titulo} className="font-semibold">Mercado Pago del turno</h4>
      <p className="mt-1 text-xs text-muted-foreground">No se pudo consultar lo que entró a la cuenta ({horario}). {control.message}</p>
      {children}
    </section>;

  const { mercadoPago, sistema, diferencia } = control;
  const coincide = diferencia === 0;
  return <section aria-labelledby={titulo} className={cn('rounded-2xl border p-3.5 text-sm', coincide ? 'border-gm-line' : 'border-gm-aviso/30 bg-gm-aviso/[0.05]')}>
    <h4 id={titulo} className="font-semibold">Mercado Pago del turno</h4>
    <p className="mt-0.5 text-xs text-muted-foreground">De {horario}, en toda la playa.</p>
    <dl className="mt-2 space-y-1.5">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Entró a la cuenta</dt>
        <dd className="shrink-0 font-semibold tabular-nums">{money(mercadoPago.total)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Registrado en el sistema</dt>
        <dd className="shrink-0 font-semibold tabular-nums">{money(sistema.total)}</dd>
      </div>
    </dl>
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
      Registrado: alias {money(sistema.alias)} · QR {money(sistema.qr)} · transferencias {money(sistema.transferencias)}.
      {mercadoPago.otros > 0 && ` En la cuenta también entraron ${money(mercadoPago.otros)} de otros cobros (QR fijo, tarjeta).`}
    </p>
    {coincide
      ? <p className="mt-2 flex items-center gap-1.5 font-semibold text-gm-ok"><CheckCircle2 className="size-4 shrink-0" aria-hidden />Coincide</p>
      : <div role="status" className="mt-2 flex gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gm-aviso" aria-hidden />
        <p>
          {diferencia > 0
            ? <><strong className="tabular-nums">Entraron {money(diferencia)} más de lo registrado.</strong> Puede ser un pago por transferencia que se cargó como efectivo: es plata que falta en la caja pero está en Mercado Pago.</>
            : <><strong className="tabular-nums">Se registraron {money(-diferencia)} más de lo que entró.</strong> Puede ser una transferencia anotada que no llegó o que fue a otra cuenta, o un pago en efectivo cargado como transferencia.</>}
        </p>
      </div>}
    {control.variasPlayas && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">La cuenta es de toda la empresa: lo que entró incluye los cobros de las otras playas en ese horario.</p>}
  </section>;
}
