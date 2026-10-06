'use client';

// El cobro por transferencia al alias en el mostrador. El cajero lo abre, el cliente transfiere
// al alias el importe exacto, y esta pantalla se entera sola: cada pocos segundos le pregunta al
// backend, que mira la cuenta de MercadoPago de la empresa.
//
// Si hay una sola transferencia de ese importe y un solo cobro esperándola en toda la cuenta, el
// sistema la asocia y registra cobro y salida. Si hay dudas (dos transferencias iguales, dos autos
// del mismo importe, un pago tardío de un cobro cancelado), NO elige: muestra las opciones y el
// cajero pregunta quién transfirió. Un error al consultar se dice como error, nunca como «no pagó».

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Flag, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { CobroAlias } from '@/types/verificacion-alias.type';
import {
  ampliarCobroAliasAction,
  asignarTransferenciaAliasAction,
  cancelarCobroAliasAction,
  consultarCobroAliasAction,
} from '@/actions/mercadopago/verificacion-alias.action';

const SEGUNDOS_ENTRE_CONSULTAS = 4;
const ZONA = 'America/Argentina/Buenos_Aires';

const hora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

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

const SEGUNDOS_PARA_CERRAR = 4;

/**
 * La confirmación de un cobro por transferencia que registró la salida: queda en el mismo cuadro
 * de cobro, con quién pagó, y el diálogo se cierra solo (o antes, con «Cerrar ahora»). El aviso de
 * abajo es el de siempre, «Salida registrada exitosamente»: lo dispara el panel de cierre.
 */
export function PagoRecibido({ cobro, onCerrar }: { cobro: CobroAlias; onCerrar: () => void }) {
  const [restante, setRestante] = useState(SEGUNDOS_PARA_CERRAR * 1000);
  const cerrado = useRef(false);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;

  const cerrar = useCallback(() => {
    if (cerrado.current) return;
    cerrado.current = true;
    alCerrar.current();
  }, []);

  useEffect(() => {
    const desde = Date.now();
    const reloj = setInterval(() => {
      const falta = Math.max(0, SEGUNDOS_PARA_CERRAR * 1000 - (Date.now() - desde));
      setRestante(falta);
      if (falta === 0) {
        clearInterval(reloj);
        cerrar();
      }
    }, 100);
    return () => clearInterval(reloj);
  }, [cerrar]);

  return (
    <div role="status" className="flex flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-emerald-500/50 bg-emerald-500/10 px-5 pb-4 pt-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-400">
        <Check className="size-9" strokeWidth={2.2} />
      </span>
      <p className="mt-1.5 gm-display text-[28px] font-bold tracking-wide text-emerald-400">PAGO RECIBIDO</p>
      <p className="gm-mono gm-tnum text-3xl font-semibold text-foreground">{formatPrice(cobro.importe)}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{quienYCuando(cobro)}</p>
      <p className="text-xs text-muted-foreground">
        {cobro.modo === 'MANUAL'
          ? 'Transferencia elegida por el cajero'
          : 'Única transferencia de ese importe: se asoció sola'}
        {cobro.transferencia ? ` · operación ${operacionCorta(cobro.transferencia.operacionId)}` : ''}
      </p>

      <div className="my-2.5 h-px w-full bg-emerald-400/25" />

      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <Flag className="size-[18px] text-emerald-400" />
        Salida registrada
      </p>

      <div className="mt-2.5 w-full space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-400/15">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(restante / (SEGUNDOS_PARA_CERRAR * 1000)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-muted-foreground">Se cierra sola en {Math.ceil(restante / 1000)} s</span>
          <Button variant="outline" className="min-h-11" onClick={cerrar}>
            Cerrar ahora
          </Button>
        </div>
      </div>
    </div>
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
    await cancelarCobroAliasAction(cobro.id);
    setOcupado(false);
    onCancelado();
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
            PAGO RECIBIDO · {formatPrice(cobro.importe)}
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
      <div role="status" className="space-y-3 rounded-2xl border border-border bg-gm-surface-2 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {cobro.estado === 'VENCIDO'
            ? 'Pasaron 15 minutos sin que llegue la transferencia. La estadía sigue sin cobrar.'
            : cobro.estado === 'PAGADO_OTRO_MEDIO'
              ? 'La estadía ya se cobró por otro medio.'
              : 'Se canceló la espera de la transferencia.'}
        </p>
        <Button variant="outline" className="min-h-11 w-full" onClick={onCancelado}>
          Elegir otro medio
        </Button>
      </div>
    );

  const fallo = cobro.consulta && cobro.consulta.ok === false ? cobro.consulta : null;
  const revision = cobro.estado === 'REVISION';

  return (
    <div className="space-y-4 rounded-2xl border border-gm-yellow/50 bg-gm-surface-2 p-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-background/40">
        <div className="px-5 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Importe a transferir</p>
          <p className="gm-display gm-tnum mt-2 text-4xl font-bold">{formatPrice(cobro.importe)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Transferir el importe exacto permite encontrar el pago.</p>
        </div>
        <button
          type="button"
          onClick={() => void copiarAlias()}
          disabled={!cobro.alias}
          className="group flex min-h-20 w-full items-center gap-4 border-t border-border bg-gm-yellow/5 px-5 py-4 text-left transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow disabled:opacity-50"
          aria-label={cobro.alias ? 'Copiar alias ' + cobro.alias : 'Alias no disponible'}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alias de la playa</span>
            <span className="gm-mono mt-1 block break-all text-xl font-semibold text-foreground">{cobro.alias ?? '—'}</span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-1 text-gm-yellow">
            <Copy className="size-5" aria-hidden="true" />
            <span className="text-xs font-semibold">Copiar</span>
          </span>
        </button>
      </div>

      {fallo ? (
        <div role="alert" className="flex gap-2 rounded-xl border border-gm-orange/40 bg-gm-orange/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gm-orange" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">No se pudo consultar MercadoPago</p>
            <p className="text-muted-foreground">{fallo.error} Esto no quiere decir que no pagó. Se sigue reintentando.</p>
          </div>
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => void consultar()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      ) : revision ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-gm-yellow/40 bg-gm-yellow/10 p-3 text-sm">
            <p className="font-medium">Confirmá cuál es el pago de este auto</p>
            <p className="text-muted-foreground">{MOTIVOS[cobro.motivoRevision ?? ''] ?? 'Hay más de una posibilidad.'}</p>
          </div>
          {cobro.opciones.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground" role="status">
              La transferencia que coincidía ya se usó en otro cobro. Si el cliente transfirió, su transferencia va a aparecer acá.
            </p>
          ) : (
            <fieldset className="min-w-0 space-y-3" disabled={ocupado}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transferencias disponibles ({cobro.opciones.length})</legend>
              {cobro.opciones.map((o) => (
                <label
                  key={o.operacionId}
                  className={cn(
                    'relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-gm-yellow',
                    elegida === o.operacionId ? 'border-gm-yellow bg-gm-yellow/10' : 'border-border bg-background/30 hover:border-gm-yellow/50',
                    ocupado && 'pointer-events-none opacity-60',
                  )}
                >
                  <input type="radio" name={'transferencia-' + cobro.id} value={o.operacionId} checked={elegida === o.operacionId} onChange={() => setElegida(o.operacionId)} className="mt-1 size-5 shrink-0 accent-yellow-400" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pagador</span>
                        <span className="mt-1 block break-words text-base font-semibold">{o.nombre || o.documento || 'Pagador sin identificar'}</span>
                        {o.nombre && o.documento && <span className="gm-mono mt-1 block text-sm text-muted-foreground">{o.documento}</span>}
                      </span>
                      <span className="gm-mono gm-tnum text-lg font-semibold">{formatPrice(o.importe)}</span>
                    </span>
                    <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                      <span>Recibida a las <span className="gm-mono text-foreground">{hora(o.fechaOperacion)}</span></span>
                      {o.entidad && <span>{o.entidad}</span>}
                    </span>
                    <span className="mt-1 block break-all text-xs text-muted-foreground">Operaci&oacute;n <span className="gm-mono">{o.operacionId}</span></span>
                    {elegida === o.operacionId && <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gm-yellow"><Check className="size-4" aria-hidden="true" />Seleccionada para este auto</span>}
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
          <Button className="min-h-12 w-full whitespace-normal" disabled={!elegida || ocupado} onClick={() => void asignar()}>
            {ocupado ? 'Registrando…' : 'Confirmar pago y registrar salida'}
          </Button>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          <span>Buscando el pago desde las {hora(cobro.buscarDesde)}<span className="mt-1 block text-xs">Si hay una coincidencia única, se registra automáticamente.</span></span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {cobro.puedeAmpliar && (
          <Button variant="outline" className="min-h-11 flex-1" disabled={ocupado} onClick={() => void ampliar()}>
            Buscar desde 5 min antes
          </Button>
        )}
        <Button variant="ghost" className="min-h-11 flex-1" disabled={ocupado} onClick={() => void cancelar()}>
          Cancelar y cobrar de otra forma
        </Button>
      </div>
    </div>
  );
}
