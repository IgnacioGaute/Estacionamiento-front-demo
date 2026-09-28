'use client';

// Entregar el recibo de un pago por los mismos canales que los comprobantes de los tickets. QR e
// impresora térmica, según lo que la playa tenga prendido en Configuración → Comprobantes.
// WhatsApp, siempre que el inquilino tenga un celular cargado: es un contacto conocido, no un
// cliente de paso. El enlace es del sitio de comprobantes (otro dominio): el inquilino nunca ve la
// dirección del sistema. Sin ningún medio queda la impresión en hoja de siempre.

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, Loader2, MessageCircle, PhoneOff, Printer } from 'lucide-react';
import { toast } from '@/lib/toast';
import { emitirReciboPagoAction } from '@/actions/cuentas/cuentas.action';
import { ReciboEntregable, ResultadoPago } from '@/types/cuenta.type';
import { imprimirComprobante } from './util';

const boton =
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-center text-sm font-semibold hover:bg-gm-surface-2 [&_svg]:shrink-0';

// Sin celular no se ofrece WhatsApp; se avisa, sin alarmar, por qué no está la opción.
function SinCelular() {
  return (
    <p className="mb-3 flex items-center gap-2 rounded-lg bg-gm-surface-2/70 px-3 py-2 text-xs text-muted-foreground">
      <PhoneOff className="size-3.5 shrink-0" />
      No tiene celular cargado: el recibo no se puede mandar por WhatsApp.
    </p>
  );
}

export function EntregaRecibo({
  pagoId,
  resultado,
  playa,
}: {
  // Cualquier asiento del pago: el servidor arma el recibo con todos sus medios.
  pagoId: string;
  // Si está, se ofrece además la impresión en hoja (la de siempre, sin pasar por el sitio).
  resultado?: ResultadoPago | null;
  playa?: string;
}) {
  const [recibo, setRecibo] = useState<ReciboEntregable | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setRecibo(null);
    setError('');
    void emitirReciboPagoAction(pagoId).then((r) => {
      if (!vigente) return;
      if (r.data) setRecibo(r.data);
      else setError(r.error ?? 'No se pudo preparar el recibo.');
    });
    return () => {
      vigente = false;
    };
  }, [pagoId, intento]);

  const enHoja = resultado ? (
    <button
      type="button"
      onClick={() => imprimirComprobante(resultado, playa) || toast.error('El navegador bloqueó la ventana de impresión.')}
      className={boton}
    >
      <Printer className="size-4" /> Imprimir en hoja
    </button>
  ) : null;

  if (error)
    return (
      <div className="space-y-2 rounded-2xl border border-border p-4">
        <p role="alert" className="text-sm text-[#FF7A4D]">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setIntento((n) => n + 1)} className={`${boton} w-auto`}>
            Reintentar
          </button>
        </div>
        {enHoja}
      </div>
    );

  if (!recibo)
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Preparando el recibo para entregar…
      </p>
    );

  // Sin celular y con QR y térmica apagados: no hay enlace que entregar.
  if (recibo.deshabilitado)
    return (
      <div className="rounded-2xl border border-border p-4">
        <SinCelular />
        <p className="mb-3 text-sm text-muted-foreground">
          El QR y la térmica están apagados en esta playa. La administración los prende en{' '}
          <strong className="text-foreground">Configuración → Comprobantes</strong>.
        </p>
        {enHoja}
      </div>
    );

  // El sitio de comprobantes vive en otro dominio (repo `estacionamiento-comprobantes-demo`).
  const base = process.env.NEXT_PUBLIC_RECEIPTS_URL?.replace(/\/+$/, '') ?? '';
  const url = base ? `${base}/c/${recibo.token}` : '';
  const { settings, snapshot, telefono } = recibo;

  if (!url)
    return (
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <p role="alert" className="text-sm">
          El recibo quedó listo, pero falta configurar la dirección del sitio de comprobantes (
          <code>NEXT_PUBLIC_RECEIPTS_URL</code>) para poder entregarlo.
        </p>
        {enHoja}
      </div>
    );

  const mensaje = `Recibo de pago N° ${snapshot.numero} · ${snapshot.parkingName}\n${url}`;

  return (
    <div className="rounded-2xl border border-border p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Entregar el recibo</h3>
      {!telefono && <SinCelular />}
      <div className={settings.qr ? 'grid gap-4 sm:grid-cols-[188px_1fr] sm:items-center' : ''}>
        {settings.qr && (
          <div className="text-center">
            {/* Fondo blanco siempre: un QR sobre fondo oscuro no lo lee ningún celular. */}
            <QRCodeSVG
              value={url}
              size={188}
              marginSize={3}
              className="mx-auto h-auto w-full max-w-[188px] rounded-lg bg-white"
              title="Escaneá para ver el recibo"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Que lo escanee con el celular</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {telefono && (
            <a
              href={`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gm-yellow px-4 py-2 text-center text-sm font-bold text-gm-ink hover:bg-[#FFD23A]"
            >
              <MessageCircle className="size-4 shrink-0" />
              <span className="flex flex-col items-start leading-tight">
                <span>Enviar por WhatsApp</span>
                <span className="text-[11px] font-semibold tabular-nums opacity-70">
                  {telefono.startsWith('549') ? `+54 9 ${telefono.slice(3)}` : `+${telefono}`}
                </span>
              </span>
            </a>
          )}
          {settings.print && (
            <a href={`${url}?print=${settings.paperWidth}`} target="_blank" rel="noopener noreferrer" className={boton}>
              <Printer className="size-4" /> Imprimir en térmica ({settings.paperWidth} mm)
            </a>
          )}
          {!settings.print && enHoja}
          {/* Al lado del QR la columna es angosta: uno debajo del otro, para que no se partan. */}
          <div className={settings.qr ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'}>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Enlace copiado');
                } catch {
                  toast.error('No se pudo copiar. Abrí el recibo para copiar su enlace.');
                }
              }}
              className={boton}
            >
              <Copy className="size-4" /> Copiar enlace
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className={boton}>
              <ExternalLink className="size-4" /> Ver recibo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

