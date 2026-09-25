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
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/components/pricing-breakdown';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import {
  cancelarCobroMercadoPagoAction,
  consultarCobroMercadoPagoAction,
} from '@/actions/mercadopago/mercadopago.action';

const SEGUNDOS_ENTRE_CONSULTAS = 4;

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

  useEffect(() => {
    if (!pendiente) return;
    const reloj = setInterval(() => {
      setRestante(cuentaRegresiva(cobro.expiraEl));
      // Se sigue consultando un rato después de vencido: el cliente puede haber apretado pagar
      // justo sobre la hora y sería absurdo perder ese pago.
      void consultar();
    }, SEGUNDOS_ENTRE_CONSULTAS * 1000);
    return () => clearInterval(reloj);
  }, [pendiente, cobro.expiraEl, consultar]);

  // Queda en el lugar donde estaba el QR, para que el cajero vea de un vistazo que ya está pago
  // antes de registrar la salida.
  if (cobro.estado === 'ACREDITADO')
    return (
      <div
        role="status"
        className="rounded-2xl border-[1.5px] border-emerald-500/50 bg-emerald-500/10 p-6 text-center"
      >
        <CheckCircle2
          className="mx-auto size-14 text-emerald-400"
          strokeWidth={1.75}
        />
        <p className="mt-3 gm-display text-2xl font-bold text-emerald-400">
          PAGADO
        </p>
        <p className="gm-mono gm-tnum mt-1 text-lg font-semibold text-foreground">
          {formatPrice(cobro.monto)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          MercadoPago confirmó que el dinero entró a la cuenta.
        </p>
      </div>
    );

  const vencido = cobro.estado === 'VENCIDO' || restante.faltan === 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gm-surface-2 p-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Que escanee este código para pagar
        </p>
        <p className="gm-display gm-tnum text-2xl font-bold">
          {formatPrice(cobro.monto)}
        </p>
      </div>

      {/* Fondo blanco siempre: un QR sobre fondo oscuro no lo lee ningún celular. */}
      <QRCodeSVG
        value={cobro.initPoint}
        size={224}
        marginSize={4}
        className="mx-auto h-auto w-full max-w-[220px] rounded bg-white"
        title="Escaneá para pagar con MercadoPago"
      />

      {vencido ? (
        <p role="alert" className="text-center text-sm text-gm-orange">
          El código venció. Cancelalo y generá uno nuevo con el importe
          actualizado. Si el cliente igual llega a pagarlo, esa plata se
          descuenta del total.
        </p>
      ) : (
        <p className="text-center text-sm text-muted-foreground" role="status">
          Esperando el pago… el importe vale {restante.texto} min
        </p>
      )}

      <Button
        variant="ghost"
        className="min-h-11 w-full"
        onClick={async () => {
          await cancelarCobroMercadoPagoAction(cobro.id);
          onCancelar();
        }}
      >
        Cancelar y cobrar de otra forma
      </Button>
    </div>
  );
}
