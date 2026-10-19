'use client';

// «Se fue antes»: el auto se fue sin que nadie registrara la salida y el sistema siguió contando.
// Se elige la tarifa que le correspondía —las del vehículo que la estadía ya pasó y, después de la
// última, cuántas veces la que se repite— y se registra la salida en un solo paso: no hace falta la
// hora exacta ni corregir primero para cobrar después. Las tarifas y sus importes los arma el
// servidor con el mismo cálculo del cobro. El pago entra ahora, en el turno de quien lo registra
// (casi siempre el efectivo que ya estaba en el cajón). Queda en la Actividad.
//
// Sin startTransition a propósito, como CorregirEntrada: un error de red iría a la pantalla de error.

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, Landmark } from 'lucide-react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
} from '@/components/ui/action-dialog';
import { DataLoading } from '@/components/ui/data-loading';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { opcionesSalidaAnteriorAction, registrarSalidaAnteriorAction } from '@/actions/tickets/salida-anterior.action';
import type { OpcionesSalidaAnterior } from '@/services/tickets.service';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { cuandoEntro, formatEstadia } from '@/utils/estadia';

type Medio = 'CASH' | 'TRANSFER';
const MEDIOS: { id: Medio; texto: string; Icono: typeof Banknote }[] = [
  { id: 'CASH', texto: 'Efectivo', Icono: Banknote },
  { id: 'TRANSFER', texto: 'Transferencia', Icono: Landmark },
];

export function SeFueAntes({ registration, open, onOpenChange, onRegistrada }: {
  registration: TicketRegistration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrada: (registration: TicketRegistration) => void;
}) {
  const [datos, setDatos] = useState<OpcionesSalidaAnterior | null>(null);
  const [cargando, setCargando] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [medio, setMedio] = useState<Medio | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const id = registration?.id;

  const cargar = useCallback(async (estadia: string) => {
    setCargando(true);
    try {
      const resultado = await opcionesSalidaAnteriorAction(estadia);
      if (resultado.error || !resultado.opciones) { setError(resultado.error || 'No se pudieron cargar las tarifas.'); return; }
      setDatos({ ahora: resultado.ahora ?? 0, cobrado: resultado.cobrado ?? 0, opciones: resultado.opciones });
    } catch {
      setError('No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !id) return;
    setDatos(null); setElegida(null); setMedio(null); setError('');
    void cargar(id);
  }, [open, id, cargar]);

  if (!registration) return null;
  const opcion = datos?.opciones.find((o) => o.salidaEn === elegida) ?? null;
  const cobrado = datos?.cobrado ?? 0;
  const saldo = opcion ? Math.max(0, opcion.precio - cobrado) : 0;
  const devolver = opcion ? Math.max(0, cobrado - opcion.precio) : 0;
  const necesitaMedio = !!opcion && (saldo > 0 || devolver > 0);
  const listo = !!opcion && !enviando && (!necesitaMedio || !!medio);
  const patente = registration.licensePlateOriginal || registration.ticket?.codeBar || registration.codeBarTicket || registration.lastNameCustomer || 'Sin patente';
  const detalleMedio = medio === 'TRANSFER' ? 'por transferencia' : medio === 'CASH' ? 'en efectivo' : '';

  const confirmar = async () => {
    if (!opcion || !listo) return;
    setEnviando(true);
    setError('');
    try {
      const resultado = await registrarSalidaAnteriorAction(registration.id, {
        salidaEn: opcion.salidaEn,
        expectedPrice: opcion.precio,
        expectedCollected: cobrado,
        closeType: saldo > 0 ? 'PAYMENT' : 'NO_CHARGE',
        ...(saldo > 0 && medio ? { metodo: medio } : {}),
        ...(devolver > 0 && medio ? { refundMetodo: medio } : {}),
      });
      if (resultado.error || !resultado.registration) {
        setError(resultado.error || 'No se pudo registrar la salida.');
        // Cambió lo cobrado mientras tanto (un anticipo, otro cobro): se vuelven a pedir las tarifas.
        if (resultado.code === 'TICKET_PRICE_CHANGED') { setElegida(null); await cargar(registration.id); }
        return;
      }
      toast.success(`Salida registrada: ${patente} con «${opcion.etiqueta}».`);
      onOpenChange(false);
      onRegistrada(resultado.registration);
    } catch {
      setError('No se pudo registrar la salida. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ActionDialog open={open} onOpenChange={(o) => { if (!enviando) onOpenChange(o); }}>
      <ActionDialogContent>
        <ActionDialogHeader title="Se fue antes" description={`${patente} · entró ${cuandoEntro(registration)}`} />
        <ActionDialogBody>
          {cargando && !datos ? (
            <DataLoading label="Cargando tarifas…" />
          ) : datos && !datos.opciones.length ? (
            <p className="rounded-2xl border border-border bg-gm-surface-2 p-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Todavía está en la primera tarifa: no hay una más barata. Cobralo normal, con {formatImporte(datos.ahora)}.
            </p>
          ) : datos && (
            <section aria-labelledby="se-fue-tarifa" className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p id="se-fue-tarifa" className="text-[14px] font-semibold">¿Qué tarifa le corresponde?</p>
                <p className="shrink-0 text-[12px] text-muted-foreground">Ahora serían {formatImporte(datos.ahora)}</p>
              </div>
              <div role="radiogroup" aria-labelledby="se-fue-tarifa" className="grid gap-2">
                {datos.opciones.map((o) => {
                  const marcada = o.salidaEn === elegida;
                  return (
                    <button key={o.salidaEn} type="button" role="radio" aria-checked={marcada} disabled={enviando}
                      onClick={() => { setElegida(o.salidaEn); setMedio(null); setError(''); }}
                      className={cn('flex min-h-[54px] w-full items-center gap-3 rounded-xl border-[1.5px] px-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
                        marcada ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]', marcada ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-gm-line-strong')} aria-hidden>
                        {marcada && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{o.etiqueta}</span>
                        <span className="block text-[12px] text-muted-foreground">hasta {formatEstadia(o.minutos)}</span>
                      </span>
                      <span className="gm-mono shrink-0 text-[16px] font-bold">{formatImporte(o.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {error && <p role="alert" className="text-[13px] text-gm-orange">{error}</p>}

          {opcion && (cobrado > 0 || !necesitaMedio) && (
            <p className="text-[12.5px] text-muted-foreground">
              {saldo > 0 ? `Ya pagó ${formatImporte(cobrado)}: falta cobrar ${formatImporte(saldo)}.` : devolver > 0 ? `Ya pagó ${formatImporte(cobrado)}: se devuelven ${formatImporte(devolver)}.` : 'Ya está pago: solo se registra la salida.'}
            </p>
          )}

          {necesitaMedio && (
            <div role="group" aria-labelledby="se-fue-medio" className="space-y-2">
              <p id="se-fue-medio" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{saldo > 0 ? '¿Cómo pagó?' : '¿Cómo se devuelve?'}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDIOS.map(({ id: valor, texto, Icono }) => (
                  <button key={valor} type="button" aria-pressed={medio === valor} disabled={enviando} onClick={() => setMedio(valor)}
                    className={cn('flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
                      medio === valor ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                    <Icono className={cn('size-[18px]', medio === valor ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden />
                    {texto}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ActionDialogBody>
        <ActionDialogFooter>
          <ActionDialogPrimaryButton disabled={!listo} onClick={() => void confirmar()}
            detail={!opcion ? 'Elegí la tarifa' : saldo > 0 ? [formatImporte(saldo), detalleMedio].filter(Boolean).join(' ') : opcion.etiqueta}>
            {enviando ? 'Registrando…' : saldo > 0 ? 'Cobrar y registrar salida' : 'Registrar salida'}
          </ActionDialogPrimaryButton>
        </ActionDialogFooter>
      </ActionDialogContent>
    </ActionDialog>
  );
}
