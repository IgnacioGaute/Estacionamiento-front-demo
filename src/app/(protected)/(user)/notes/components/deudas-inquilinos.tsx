'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Inbox, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/components/tenant-provider';
import { getDeudoresAction, marcarDeudasVistasAction } from '@/actions/cuentas/cuentas.action';
import { EVENTO_CUENTAS_CAMBIARON } from '@/hooks/use-deudores';
import type { Deudores, DeudorAviso } from '@/types/cuenta.type';
import { plata } from '@/components/plataforma/formato';
import { CabeceraTabla, tarjetaPlanilla } from '@/components/planilla/planilla-ui';
import { TRAMOS, enlaceRecordatorio, fechaAR, mensajeRecordatorio } from '@/app/(protected)/(user)/renters/components/cuenta/util';

const nombreDe = (d: DeudorAviso) => `${d.apellido ?? ''} ${d.nombre ?? ''}`.trim() || 'Sin nombre';

// Las deudas vencidas de los inquilinos, en Avisos. Abrir la pestaña las da por vistas: el número
// rojo del menú desaparece sin marcar una por una. Las que eran nuevas siguen marcadas mientras la
// pestaña está abierta, para saber cuáles se sumaron. La lista no se vacía al verla: cada deuda
// sigue acá hasta que la pagan.
export function DeudasInquilinos() {
  const { context, playaId } = useTenant();
  const playa = context?.playas.find((p) => p.id === playaId)?.nombre;
  const [datos, setDatos] = useState<Deudores | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    void getDeudoresAction().then(async (r) => {
      if (!vigente) return;
      if (r.data === undefined) { setError(r.error ?? 'No se pudieron cargar las deudas.'); return; }
      setDatos(r.data);
      if (r.data?.nuevos) {
        const vistas = await marcarDeudasVistasAction();
        if (vistas.data !== undefined) window.dispatchEvent(new Event(EVENTO_CUENTAS_CAMBIARON));
      }
    });
    return () => { vigente = false; };
  }, []);

  if (error) return <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>;
  const lista = datos?.deudores ?? [];
  return (
    <section aria-label="Inquilinos con deuda vencida" aria-busy={datos === undefined} className={cn(tarjetaPlanilla, 'overflow-hidden')}>
      <CabeceraTabla titulo="Inquilinos con deuda vencida" cantidad={datos?.cantidad ?? 0}>
        {!!datos?.total && <span className="text-sm text-muted-foreground">Total vencido <strong className="tabular-nums text-foreground">{plata(datos.total)}</strong></span>}
      </CabeceraTabla>
      {datos === undefined ? (
        <p className="px-[18px] py-10 text-center text-sm text-muted-foreground">Cargando deudas…</p>
      ) : !lista.length ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <h3 className="font-semibold">Ningún inquilino tiene deuda vencida</h3>
          <p className="text-sm text-muted-foreground">Cuando a alguien se le venza un cargo sin pagar, aparece acá y en rojo en el menú.</p>
        </div>
      ) : (
        <ul>
          {lista.map((d) => {
            const tramo = TRAMOS[d.tramo];
            return (
              // Botones siempre a la derecha y la antigüedad junto al nombre: en el celular la fila no
              // cambia de forma según lo largo de cada nombre.
              <li key={d.id} className={cn('relative flex items-center gap-3 border-t border-gm-line px-[18px] py-3.5 first:border-t-0', d.nuevo && 'bg-[#C93630]/[0.06]')}>
                {d.nuevo && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[#C93630]" />}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{nombreDe(d)}</span>
                    <span className="inline-flex h-[20px] items-center rounded-full px-2 text-[11px] font-semibold" style={{ color: tramo.color, background: 'hsl(var(--gm-surface-3))' }}>{tramo.corto}</span>
                    {d.baja && <span className="text-xs text-muted-foreground">De baja</span>}
                    {d.nuevo && <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F0716B]">Nueva</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-gm-texto-2">
                    Debe <strong className="tabular-nums text-foreground">{plata(d.vencido)}</strong> vencido desde el {fechaAR(d.vencidoDesde)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.whatsapp && (
                    <a
                      href={enlaceRecordatorio(d.whatsapp, mensajeRecordatorio(d, playa))}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Recordar el pago por WhatsApp a ${nombreDe(d)}`}
                      title="Recordar el pago por WhatsApp"
                      className="grid size-9 place-items-center rounded-[10px] border border-border hover:bg-gm-surface-2"
                    >
                      <MessageCircle className="size-4 text-gm-ok" aria-hidden />
                    </a>
                  )}
                  <Link
                    href={`/renters/${d.id}`}
                    aria-label={`Ver la cuenta de ${nombreDe(d)}`}
                    className="flex h-9 items-center gap-1 rounded-[10px] border border-border px-3 text-[13px] font-semibold hover:bg-gm-surface-2"
                  >
                    Ver
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
