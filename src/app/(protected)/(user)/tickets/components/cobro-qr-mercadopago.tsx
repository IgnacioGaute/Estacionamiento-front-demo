'use client';

// El cobro con QR en el mostrador. El cajero lo genera, el cliente escanea y paga, y esta
// pantalla se entera sola: cada pocos segundos le pregunta a MercadoPago si ese cobro entró.
// No espera un aviso de MercadoPago, pregunta ella — por eso funciona igual aunque el aviso
// se pierda.
//
// A propósito no hay botón de "ya pagó", ni de copiar el link, ni de mandarlo por WhatsApp: el
// cliente está parado enfrente y escanea. La consulta automática hace innecesario el primero y
// los otros dos son de un flujo distinto, el del cobro sin pasar por caja.

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import { ActionDialogFooterPortal, ActionDialogSecondaryButton } from '@/components/ui/action-dialog';
import { formatImporte } from '@/components/pricing-breakdown';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import {
  cancelarCobroMercadoPagoAction,
  consultarCobroMercadoPagoAction,
} from '@/actions/mercadopago/mercadopago.action';
import { ConfirmacionDePago } from './pago-recibido';

const SEGUNDOS_ENTRE_CONSULTAS = 4;

const horaCorta = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
    : null;

/** Un QR pagado que registró la salida: la misma confirmación que la transferencia al alias. */
export function PagoQrRecibido({ cobro, onCerrar }: { cobro: CobroMercadoPago; onCerrar: () => void }) {
  const hora = horaCorta(cobro.acreditadoEl);
  return (
    <ConfirmacionDePago
      importe={cobro.monto}
      detalle={hora ? `Pagado con QR · ${hora}` : 'Pagado con QR'}
      nota="MercadoPago confirmó que el dinero entró a la cuenta"
      onCerrar={onCerrar}
    />
  );
}

function cuentaRegresiva(hasta: string) {
  const faltan = Math.max(
    0,
    Math.floor((new Date(hasta).getTime() - Date.now()) / 1000),
  );
  const minutos = Math.floor(faltan / 60);
  return { faltan, texto: `${minutos}:${String(faltan % 60).padStart(2, '0')}` };
}

export function CobroQrMercadoPago({
  cobro: inicial,
  onAcreditado,
  onCancelar,
}: {
  cobro: CobroMercadoPago;
  // Recibe el cobro ya acreditado: el panel de cierre lo necesita para saber que este QR dejó de
  // estar esperando y volver a habilitar el resto de las opciones.
  onAcreditado: (cobro: CobroMercadoPago) => void;
  onCancelar: () => void;
}) {
  const [cobro, setCobro] = useState(inicial);
  const [restante, setRestante] = useState(() =>
    cuentaRegresiva(inicial.expiraEl),
  );
  const [cancelando, setCancelando] = useState(false);
  const yaAviso = useRef(false);

  const pendiente = cobro.estado === 'PENDIENTE';

  const consultar = useCallback(async () => {
    const r = await consultarCobroMercadoPagoAction(cobro.id);
    if (r.error || !r.cobro) return;
    setCobro(r.cobro);
    if (r.cobro.estado === 'ACREDITADO' && !yaAviso.current) {
      yaAviso.current = true;
      onAcreditado(r.cobro);
    }
  }, [cobro.id, onAcreditado]);

  // La cuenta regresiva corre cada segundo; la consulta a MercadoPago, cada pocos.
  useEffect(() => {
    if (!pendiente) return;
    const reloj = setInterval(() => setRestante(cuentaRegresiva(cobro.expiraEl)), 1000);
    return () => clearInterval(reloj);
  }, [pendiente, cobro.expiraEl]);

  useEffect(() => {
    if (!pendiente) return;
    // Se sigue consultando un rato después de vencido: el cliente puede haber apretado pagar
    // justo sobre la hora y sería absurdo perder ese pago.
    const reloj = setInterval(() => void consultar(), SEGUNDOS_ENTRE_CONSULTAS * 1000);
    return () => clearInterval(reloj);
  }, [pendiente, consultar]);

  // Queda en el lugar donde estaba el QR cuando el pago no terminó la operación: quedó un saldo
  // (la tarifa subió mientras pagaba) o es el pago de un inquilino. Si registró la salida, la
  // pantalla lo reemplaza por la confirmación que se cierra sola (PagoQrRecibido).
  if (cobro.estado === 'ACREDITADO')
    return (
      <div role="status" className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-emerald-500/50 bg-emerald-500/10 p-4">
        <CheckCircle2 className="size-11 shrink-0 text-emerald-400" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="gm-display text-xl font-bold text-emerald-400">Pagado · <span className="gm-mono">{formatImporte(cobro.monto)}</span></p>
          <p className="text-[13px] text-muted-foreground">MercadoPago confirmó que el dinero entró a la cuenta.</p>
        </div>
      </div>
    );

  const vencido = cobro.estado === 'VENCIDO' || restante.faltan === 0;

  return (
    <>
      {/* Fondo blanco siempre: un QR sobre fondo oscuro no lo lee ningún celular. Con caja de la
          playa es el código estándar (QR interoperable); sin caja, el link de MercadoPago. */}
      <div className="flex flex-col items-center gap-2 rounded-[22px] bg-[#F7F5EF] px-4 pb-4 pt-3.5 text-[#1A1814] short:gap-1.5 short:pb-3 short:pt-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#4A443B]">Escaneá para pagar</p>
        <p className="gm-mono text-[30px] font-bold leading-none text-[#111] short:text-[26px]">{formatImporte(cobro.monto)}</p>
        <QRCodeSVG
          value={cobro.qr || cobro.initPoint}
          size={224}
          marginSize={2}
          className="h-auto w-full max-w-[208px] short:max-w-[172px]"
          title={cobro.interoperable ? 'Escaneá con cualquier banco o billetera' : 'Escaneá para pagar con MercadoPago'}
        />
        <p className="text-center text-[13px] text-[#4A443B]">
          {cobro.interoperable ? 'Con la app de cualquier banco o billetera' : 'Con la cámara o la app de MercadoPago'}
        </p>
      </div>

      {vencido ? (
        <p role="alert" className="rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3.5 text-[13.5px] leading-relaxed">
          El código venció. Cancelalo y generá uno nuevo con el importe actualizado. Si el cliente
          igual llega a pagarlo, esa plata se descuenta del total.
        </p>
      ) : (
        <div role="status" className="flex items-center gap-3.5 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.07] px-4 py-3">
          <span className="relative grid size-3 shrink-0" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-gm-yellow/70" />
            <span className="relative size-3 rounded-full bg-gm-yellow" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Esperando el pago</span>
            <span className="block text-[12.5px] text-muted-foreground">Se acredita solo. El importe vale por</span>
          </span>
          <span className="gm-mono text-[15px] font-semibold text-muted-foreground">{restante.texto}</span>
        </div>
      )}

      <ActionDialogFooterPortal>
        <ActionDialogSecondaryButton
          disabled={cancelando}
          onClick={async () => {
            setCancelando(true);
            await cancelarCobroMercadoPagoAction(cobro.id);
            setCancelando(false);
            onCancelar();
          }}
        >
          {cancelando ? 'Cancelando…' : 'Cancelar QR y cobrar de otra forma'}
        </ActionDialogSecondaryButton>
      </ActionDialogFooterPortal>
    </>
  );
}
