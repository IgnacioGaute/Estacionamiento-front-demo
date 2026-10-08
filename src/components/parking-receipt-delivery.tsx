'use client';

// Entregar el comprobante después de registrar una entrada o una salida. Misma hoja que esos
// diálogos (action-dialog.tsx): en el celular, apoyada abajo y con «Listo» siempre a mano. Primero
// lo que se usa en el mostrador —el QR que escanea el cliente y los medios de entrega— y el papel
// completo plegado, para el que quiera revisarlo.

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronDown, Copy, ExternalLink, MessageCircle, Printer } from 'lucide-react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import { PlateChip } from '@/components/plate-chip';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import { issueParkingReceiptAction } from '@/actions/tickets/parking-receipt.action';
import { IssuedParkingReceipt } from '@/types/parking-receipt.type';
import { ParkingReceiptView } from './parking-receipt-view';
import { toast } from 'sonner';

const medio = 'flex min-h-[62px] min-w-0 flex-col items-start justify-center gap-0.5 rounded-2xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 px-3.5 py-2 text-left transition-colors hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow short:min-h-12';
const medioTitulo = 'flex items-center gap-2 text-[14.5px] font-semibold';
const medioDetalle = 'w-full truncate text-xs text-muted-foreground short:hidden';

export function ParkingReceiptDelivery({ registrationId, kind, onDismiss, showDisabledMessage = false }: {
  registrationId: string | null; kind: 'ENTRY' | 'EXIT'; onDismiss: () => void; showDisabledMessage?: boolean;
}) {
  const [receipt, setReceipt] = useState<IssuedParkingReceipt | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [verPapel, setVerPapel] = useState(false);
  useEffect(() => {
    let active = true;
    setReceipt(null); setError(''); setVerPapel(false);
    if (registrationId) issueParkingReceiptAction(registrationId, kind).then(result => {
      if (!active) return;
      if (result.receipt) setReceipt(result.receipt);
      else if (result.error) setError(result.error);
      else if (result.disabled && showDisabledMessage) setError('Los medios de entrega están desactivados. Podés habilitarlos desde administración.');
    });
    return () => { active = false; };
  }, [registrationId, kind, attempt, showDisabledMessage]);
  // El comprobante lo sirve otro dominio (repo `estacionamiento-comprobantes-demo`): el cliente
  // recibe ese enlace por QR o WhatsApp y nunca la dirección del sistema.
  const receiptsBase = process.env.NEXT_PUBLIC_RECEIPTS_URL?.replace(/\/+$/, '') ?? '';
  const url = receipt && receiptsBase ? `${receiptsBase}/c/${receipt.token}` : '';
  const salida = kind === 'EXIT';
  const snapshot = receipt?.snapshot;
  const hora = snapshot ? (salida ? snapshot.departureTime : snapshot.entryTime)?.slice(0, 5) : null;
  const importe = snapshot ? (snapshot.collected ?? snapshot.total) : null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Abrí el comprobante para copiar su enlace.');
    }
  };

  return <ActionDialog open={!!registrationId && (!!receipt || !!error)} onOpenChange={open => { if (!open) onDismiss(); }}>
    <ActionDialogContent className="sm:max-w-md">
      <ActionDialogHeader
        title={salida ? 'Comprobante de salida' : 'Comprobante de entrada'}
        description={`La ${salida ? 'salida' : 'entrada'} ya está registrada.`}
      />
      <ActionDialogBody>
        {error ? (
          <p role="alert" className="rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3.5 text-sm leading-relaxed">{error}</p>
        ) : receipt && snapshot && (
          <>
            {/* El comprobante en una línea; tocándola se despliega el papel tal cual lo recibe el cliente. */}
            <button
              type="button"
              aria-expanded={verPapel}
              aria-controls="comprobante-papel"
              onClick={() => setVerPapel(v => !v)}
              className="flex w-full shrink-0 items-center gap-3 rounded-2xl border border-border bg-gm-surface-2 py-2.5 pl-2.5 pr-3 text-left transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
            >
              <PlateChip plate={snapshot.plate} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{snapshot.parkingName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {hora ? `${salida ? 'Salida' : 'Entrada'} ${hora}` : 'Comprobante'}
                  {/* La flecha ya dice que se despliega; el texto queda para lectores de pantalla. */}
                  <span className="sr-only">{verPapel ? ' · Ocultar comprobante' : ' · Ver comprobante completo'}</span>
                </span>
              </span>
              {salida && importe !== null && <span className="gm-mono shrink-0 text-[17px] font-bold">{formatImporte(importe)}</span>}
              <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', verPapel && 'rotate-180')} aria-hidden />
            </button>
            {/* Fondo blanco fijo: el operador ve exactamente el papel que recibe el cliente, no una
                versión adaptada al tema oscuro del sistema. */}
            <div id="comprobante-papel" hidden={!verPapel} className="shrink-0 rounded-2xl bg-white p-4 text-black">
              <ParkingReceiptView receipt={snapshot} />
            </div>

            {!url ? (
              <p role="alert" className="text-sm">El comprobante quedó registrado, pero falta configurar la dirección del sitio de comprobantes (<code>NEXT_PUBLIC_RECEIPTS_URL</code>) para poder entregarlo.</p>
            ) : (
              <>
                {receipt.settings.qr && (
                  <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-[22px] bg-[#F7F5EF] px-4 pb-3.5 pt-3 text-[#1A1814]">
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#4A443B]">Que lo escanee el cliente</p>
                    <QRCodeSVG value={url} size={224} marginSize={4} className="mx-auto h-auto w-full max-w-[196px] rounded bg-white short:max-w-[150px]" title="Escaneá para ver el comprobante" />
                    <p className="text-center text-[13px] text-[#4A443B]">Se abre el comprobante en su celular</p>
                  </div>
                )}

                {/* Con una cantidad impar de medios, el último ocupa la fila entera. */}
                <div className="grid shrink-0 grid-cols-2 gap-2.5 short:gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
                  {receipt.settings.whatsapp && (
                    <a
                      className={medio}
                      href={`https://wa.me/${receipt.phoneCustomer ?? ''}?text=${encodeURIComponent(`Comprobante de ${salida ? 'salida' : 'entrada'} · ${snapshot.parkingName}\n${url}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={medioTitulo}><MessageCircle className="size-[18px] shrink-0 text-emerald-400" aria-hidden />WhatsApp</span>
                      <span className={cn(medioDetalle, 'gm-mono')}>{receipt.phoneCustomer ? `+${receipt.phoneCustomer}` : 'Elegir contacto'}</span>
                    </a>
                  )}
                  {receipt.settings.print && (
                    <a className={medio} href={`${url}?print=${receipt.settings.paperWidth}`} target="_blank" rel="noopener noreferrer">
                      <span className={medioTitulo}><Printer className="size-[18px] shrink-0 text-[#D9D1C3]" aria-hidden />Imprimir</span>
                      <span className={medioDetalle}>Térmica de {receipt.settings.paperWidth} mm</span>
                    </a>
                  )}
                  {(receipt.settings.whatsapp || receipt.settings.qr) && (
                    <button type="button" className={medio} onClick={() => void copiar()}>
                      <span className={medioTitulo}><Copy className="size-[18px] shrink-0 text-gm-yellow" aria-hidden />Copiar enlace</span>
                      <span className={medioDetalle}>Para otro medio</span>
                    </button>
                  )}
                  <a className={medio} href={url} target="_blank" rel="noopener noreferrer">
                    <span className={medioTitulo}><ExternalLink className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />Abrir</span>
                    <span className={medioDetalle}>Verlo en el navegador</span>
                  </a>
                </div>
                {receipt.settings.whatsapp && <p className="text-xs text-muted-foreground short:hidden">WhatsApp: enviá desde la sesión de la empresa.</p>}
              </>
            )}
          </>
        )}
      </ActionDialogBody>
      <ActionDialogFooter>
        {error ? (
          <>
            <ActionDialogSecondaryButton tone="ghost" className="order-last sm:order-none" onClick={onDismiss}>Cerrar</ActionDialogSecondaryButton>
            <ActionDialogPrimaryButton onClick={() => setAttempt(value => value + 1)}>Reintentar comprobante</ActionDialogPrimaryButton>
          </>
        ) : (
          <ActionDialogPrimaryButton onClick={onDismiss}>Listo</ActionDialogPrimaryButton>
        )}
      </ActionDialogFooter>
    </ActionDialogContent>
  </ActionDialog>;
}
