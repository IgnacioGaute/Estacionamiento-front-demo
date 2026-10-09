'use client';

// El cobro por transferencia al alias en el mostrador. El cajero lo abre, el cliente transfiere
// al alias el importe exacto, y esta pantalla se entera sola: cada pocos segundos le pregunta al
// backend, que mira la cuenta de MercadoPago de la empresa.
//
// Si hay una sola transferencia de ese importe y un solo cobro esperándola en toda la cuenta, el
// sistema la asocia y registra cobro y salida. Si hay dudas (dos transferencias iguales, dos autos
// del mismo importe, un pago tardío de un cobro cancelado), NO elige: muestra las opciones y el
// cajero pregunta quién transfirió. Un error al consultar se dice como error, nunca como «no pagó».
//
// Los botones van al pie del diálogo (ActionDialogFooterPortal): en el celular quedan siempre a
// mano, aunque haya varias transferencias para elegir.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Info, RefreshCw, RotateCcw } from 'lucide-react';
import {
  ActionDialogFooterPortal,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { CobroAlias } from '@/types/verificacion-alias.type';
import { ConfirmacionDePago } from './pago-recibido';
import {
  ampliarCobroAliasAction,
  asignarTransferenciaAliasAction,
  cancelarCobroAliasAction,
  consultarCobroAliasAction,
} from '@/actions/mercadopago/verificacion-alias.action';

const SEGUNDOS_ENTRE_CONSULTAS = 4;
const ZONA = 'America/Argentina/Buenos_Aires';

const abiertos = ['ESPERANDO', 'REVISION'];

const horaCorta = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' }) : '—';

// Los últimos dígitos alcanzan para distinguir dos operaciones en pantalla.
const operacionCorta = (id: string) => (id.length > 6 ? `…${id.slice(-6)}` : id);

// «Transferencia de Ignacio Gaute · 22:57», o sin nombre si MercadoPago no lo informó.
const quienYCuando = (cobro: CobroAlias) => {
  const t = cobro.transferencia;
  if (!t) return 'Transferencia recibida';
  return t.nombre ? `Transferencia de ${t.nombre} · ${horaCorta(t.fechaOperacion)}` : `Transferencia de las ${horaCorta(t.fechaOperacion)}`;
};

// «1:12» desde que se empezó a esperar: el cajero ve que la búsqueda sigue viva.
const transcurridoDesde = (desde: string) => {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
};

function useTranscurrido(desde: string) {
  const [texto, setTexto] = useState(() => transcurridoDesde(desde));
  useEffect(() => {
    const reloj = setInterval(() => setTexto(transcurridoDesde(desde)), 1000);
    return () => clearInterval(reloj);
  }, [desde]);
  return texto;
}

/** Una transferencia que registró la salida: la confirmación común, con quién pagó. */
export function PagoRecibido({ cobro, onCerrar }: { cobro: CobroAlias; onCerrar: () => void }) {
  return (
    <ConfirmacionDePago
      importe={cobro.importe}
      detalle={quienYCuando(cobro)}
      nota={
        (cobro.modo === 'MANUAL'
          ? 'Transferencia elegida por el cajero'
          : 'Única transferencia de ese importe: se asoció sola') +
        (cobro.transferencia ? ` · operación ${operacionCorta(cobro.transferencia.operacionId)}` : '')
      }
      onCerrar={onCerrar}
    />
  );
}

const MOTIVOS: Record<string, string> = {
  VARIAS_TRANSFERENCIAS: 'Entró más de una transferencia de este importe.',
  VARIOS_COBROS: 'Hay más de un auto esperando una transferencia de este importe (puede ser en otra playa o un cobro cancelado hace poco).',
  YA_EN_REVISION: 'Esta transferencia quedó para revisar.',
};

export function CobroAliasPanel({
  cobro: inicial,
  onTerminado,
  onCancelado,
}: {
  cobro: CobroAlias;
  // Confirmado (con o sin salida) o pagado por otro medio: el panel de cierre recarga la estadía.
  onTerminado: (cobro: CobroAlias) => void;
  onCancelado: () => void;
}) {
  const [cobro, setCobro] = useState(inicial);
  const [elegida, setElegida] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const avisado = useRef(false);
  // En una ref para que cada render del panel no reinicie el reloj de consultas.
  const alTerminar = useRef(onTerminado);
  alTerminar.current = onTerminado;
  const abierto = abiertos.includes(cobro.estado);
  const transcurrido = useTranscurrido(cobro.creadoEl);

  const actualizar = useCallback((nuevo: CobroAlias) => {
    setCobro(nuevo);
    if (['CONFIRMADO', 'PAGADO_OTRO_MEDIO'].includes(nuevo.estado) && !avisado.current) {
      avisado.current = true;
      alTerminar.current(nuevo);
    }
  }, []);

  const consultar = useCallback(async () => {
    const r = await consultarCobroAliasAction(cobro.id);
    if (r.datos) actualizar(r.datos);
  }, [cobro.id, actualizar]);

  // Mientras espera, se consulta solo. Lo que pasa entre consultas lo decide el backend, que es
  // quien recupera el estado real si se cierra la pantalla o se corta la conexión.
  useEffect(() => {
    if (!abierto) return;
    const reloj = setInterval(() => void consultar(), SEGUNDOS_ENTRE_CONSULTAS * 1000);
    return () => clearInterval(reloj);
  }, [abierto, consultar]);

  // Si la opción elegida desapareció (la usó otra caja), se deselecciona.
  useEffect(() => {
    if (elegida && !cobro.opciones.some((o) => o.operacionId === elegida)) setElegida(null);
  }, [cobro.opciones, elegida]);

  const asignar = async () => {
    if (!elegida) return;
    setOcupado(true);
    const r = await asignarTransferenciaAliasAction(cobro.id, elegida);
    setOcupado(false);
    if (r.error) {
      toast.error(r.error);
      await consultar();
      return;
    }
    if (r.datos) actualizar(r.datos);
  };

  const ampliar = async () => {
    setOcupado(true);
    const r = await ampliarCobroAliasAction(cobro.id);
    setOcupado(false);
    if (r.error) toast.error(r.error);
    else if (r.datos) actualizar(r.datos);
  };

  const cancelar = async () => {
    setOcupado(true);
    const r = await cancelarCobroAliasAction(cobro.id);
    setOcupado(false);
    if (r.error || !r.datos) { toast.error(r.error ?? 'No se pudo cancelar el cobro.'); return; }
    if (r.datos.estado === 'CONFIRMADO' || r.datos.estado === 'PAGADO_OTRO_MEDIO') actualizar(r.datos);
    else if (['CANCELADO', 'VENCIDO'].includes(r.datos.estado)) onCancelado();
  };

  const copiarAlias = async () => {
    if (!cobro.alias) return;
    try {
      await navigator.clipboard.writeText(cobro.alias);
      toast.success('Alias copiado.');
    } catch {
      // Sin portapapeles no pasa nada: el alias está a la vista.
    }
  };

  // ── Confirmado con saldo pendiente ────────────────────────────────────────
  // (Con la salida registrada lo muestra PagoRecibido, que además cierra el diálogo.) Entró la
  // transferencia pero la tarifa subió mientras esperaba: abajo vuelve lo que falta cobrar.
  if (cobro.estado === 'CONFIRMADO')
    return (
      <div role="status" className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-emerald-500/50 bg-emerald-500/10 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-400">
          <Check className="size-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="gm-display text-lg font-bold tracking-wide text-emerald-400">
            Pago recibido · <span className="gm-mono">{formatImporte(cobro.importe)}</span>
          </p>
          <p className="text-[13.5px] text-muted-foreground">
            {quienYCuando(cobro)}. La tarifa subió mientras esperaba.
          </p>
        </div>
      </div>
    );

  // ── Terminó sin transferencia ─────────────────────────────────────────────
  if (!abierto)
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-border bg-gm-surface-2 p-3.5">
        <p className="min-w-0 flex-1 text-[13.5px] text-muted-foreground">
          {cobro.estado === 'VENCIDO'
            ? 'Pasaron 15 minutos sin que llegue la transferencia. La estadía sigue sin cobrar.'
            : cobro.estado === 'PAGADO_OTRO_MEDIO'
              ? 'La estadía ya se cobró por otro medio.'
              : 'Se canceló la espera de la transferencia.'}
        </p>
        <button type="button" onClick={onCancelado} className="min-h-11 shrink-0 rounded-xl px-3 text-[13.5px] font-semibold text-gm-yellow">
          Entendido
        </button>
      </div>
    );

  const fallo = cobro.consulta && cobro.consulta.ok === false ? cobro.consulta : null;
  const revision = cobro.estado === 'REVISION';
  const opcionElegida = cobro.opciones.find((o) => o.operacionId === elegida);

  return (
    <>
      {/* Para elegir entre varias transferencias el alias ya no hace falta: el lugar es de ellas. */}
      {!revision && (
        <div className="overflow-hidden rounded-[20px] border-[1.5px] border-gm-yellow/50 bg-gm-surface-2">
          <div className="px-4 py-4 text-center short:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Importe exacto a transferir</p>
            <p className="gm-mono mt-1 text-[36px] font-bold leading-tight short:text-[30px]">{formatImporte(cobro.importe)}</p>
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-gm-yellow/[0.07] py-3 pl-4 pr-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alias de la playa</span>
              <span className="gm-mono mt-0.5 block break-all text-[22px] font-bold leading-tight">{cobro.alias ?? '—'}</span>
            </span>
            <button
              type="button"
              onClick={() => void copiarAlias()}
              disabled={!cobro.alias}
              aria-label={cobro.alias ? 'Copiar alias ' + cobro.alias : 'Alias no disponible'}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] border-gm-yellow px-3.5 text-sm font-bold text-gm-yellow transition-colors hover:bg-gm-yellow/10 disabled:opacity-50"
            >
              <Copy className="size-[18px]" aria-hidden />
              Copiar
            </button>
          </div>
        </div>
      )}

      {fallo ? (
        <div role="alert" className="flex gap-2.5 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gm-orange" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">No se pudo consultar MercadoPago</p>
            <p className="text-muted-foreground">{fallo.error} Esto no quiere decir que no pagó. Se sigue reintentando.</p>
          </div>
          <button type="button" aria-label="Consultar de nuevo" disabled={ocupado} onClick={() => void consultar()} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-4" aria-hidden />
          </button>
        </div>
      ) : revision ? (
        <>
          <div className="flex gap-3 rounded-2xl border-[1.5px] border-gm-yellow/45 bg-gm-yellow/[0.08] p-3.5">
            <Info className="mt-0.5 size-5 shrink-0 text-gm-yellow" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Confirmá cuál es el pago de este {cobro.tipo === 'INQUILINO' ? 'inquilino' : 'auto'}</p>
              <p className="text-[#D9D1C3]">{cobro.tipo === 'INQUILINO' && cobro.motivoRevision === 'VARIOS_COBROS' ? 'Hay más de un cobro esperando una transferencia de este importe.' : MOTIVOS[cobro.motivoRevision ?? ''] ?? 'Hay más de una posibilidad.'} Preguntale a nombre de quién transfirió.</p>
            </div>
          </div>
          {cobro.opciones.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground" role="status">
              La transferencia que coincidía ya se usó en otro cobro. Si el cliente transfirió, su transferencia va a aparecer acá.
            </p>
          ) : (
            <fieldset className="min-w-0 space-y-2.5" disabled={ocupado}>
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transferencias recibidas ({cobro.opciones.length})</legend>
              {cobro.opciones.map((o) => (
                <label
                  key={o.operacionId}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-3.5 transition-colors focus-within:ring-2 focus-within:ring-gm-yellow',
                    elegida === o.operacionId ? 'border-gm-yellow bg-gm-yellow/10 shadow-[inset_0_0_0_1px_hsl(var(--gm-yellow))]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/50',
                    ocupado && 'pointer-events-none opacity-60',
                  )}
                >
                  <input type="radio" name={'transferencia-' + cobro.id} value={o.operacionId} checked={elegida === o.operacionId} onChange={() => setElegida(o.operacionId)} className="mt-0.5 size-5 shrink-0 accent-yellow-400" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 break-words text-base font-bold">{o.nombre || o.documento || 'Pagador sin identificar'}</span>
                      <span className="gm-mono shrink-0 text-[13px] font-semibold text-[#D9D1C3]">{horaCorta(o.fechaOperacion)}</span>
                    </span>
                    {o.nombre && o.documento && <span className="gm-mono block text-[13px] text-muted-foreground">{o.documento}</span>}
                    <span className="mt-0.5 block break-all text-[11.5px] text-muted-foreground">
                      {[o.entidad, `Operación ${o.operacionId}`, o.importe !== cobro.importe ? formatImporte(o.importe) : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {cobro.opciones.length > 0 && cobro.opciones.every((o) => !o.nombre) && (
            <p className="text-xs text-muted-foreground">
              Compará el CUIT o documento del pagador con el comprobante del cliente. Si falta, verificá la hora y el número de operación antes de elegir.
            </p>
          )}
        </>
      ) : (
        <div role="status" className="flex items-center gap-3.5 rounded-2xl border border-border bg-gm-surface-2/60 px-4 py-3">
          <span className="relative grid size-3 shrink-0" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-gm-yellow/70" />
            <span className="relative size-3 rounded-full bg-gm-yellow" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Buscando la transferencia</span>
            <span className="block text-[12.5px] leading-snug text-muted-foreground">
              Desde las {horaCorta(cobro.buscarDesde)}. Si llega una sola de {formatImporte(cobro.importe)}, {cobro.tipo === 'INQUILINO' ? 'el pago se registra solo.' : 'la salida se registra sola.'}
            </span>
          </span>
          <span className="gm-mono text-[15px] font-semibold text-muted-foreground">{transcurrido}</span>
        </div>
      )}

      {cobro.puedeAmpliar && !revision && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void ampliar()}
          className="flex min-h-[54px] w-full shrink-0 items-center gap-3 rounded-2xl border border-dashed border-gm-line-strong px-3.5 py-2 text-left transition-colors hover:border-gm-yellow/50 disabled:opacity-50"
        >
          <RotateCcw className="size-5 shrink-0 text-gm-yellow" aria-hidden />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold">Buscar desde 5 min antes</span>
            <span className="block text-xs text-muted-foreground">Si te dice que transfirió antes de que abrieras esto</span>
          </span>
        </button>
      )}

      <ActionDialogFooterPortal>
        <ActionDialogSecondaryButton
          tone={revision ? 'ghost' : 'outline'}
          className={revision ? 'order-last sm:order-none' : undefined}
          disabled={ocupado}
          onClick={() => void cancelar()}
        >
          Cancelar y cobrar de otra forma
        </ActionDialogSecondaryButton>
        {revision && cobro.opciones.length > 0 && (
          <ActionDialogPrimaryButton
            disabled={!elegida || ocupado}
            onClick={() => void asignar()}
            detail={opcionElegida ? (opcionElegida.nombre || opcionElegida.documento || `Operación ${operacionCorta(opcionElegida.operacionId)}`) : 'Elegí una transferencia'}
          >
            {ocupado ? 'Registrando…' : cobro.tipo === 'INQUILINO' ? 'Confirmar pago' : 'Confirmar pago y salida'}
          </ActionDialogPrimaryButton>
        )}
      </ActionDialogFooterPortal>
    </>
  );
}
