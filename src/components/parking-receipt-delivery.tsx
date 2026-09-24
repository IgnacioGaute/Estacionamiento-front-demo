'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { issueParkingReceiptAction } from '@/actions/tickets/parking-receipt.action';
import { IssuedParkingReceipt } from '@/types/parking-receipt.type';
import { ParkingReceiptView } from './parking-receipt-view';
import { toast } from 'sonner';

export function ParkingReceiptDelivery({ registrationId, kind, onDismiss, showDisabledMessage = false }: {
  registrationId: string | null; kind: 'ENTRY' | 'EXIT'; onDismiss: () => void; showDisabledMessage?: boolean;
}) {
  const [receipt, setReceipt] = useState<IssuedParkingReceipt | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setReceipt(null); setError('');
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
  return <Dialog open={!!registrationId && (!!receipt || !!error)} onOpenChange={open => { if (!open) onDismiss(); }}>
    <DialogContent className="max-h-[90dvh] overflow-hidden sm:max-w-md [&_a]:h-auto [&_a]:min-h-10 [&_a]:whitespace-normal [&_a]:text-center [&_svg]:shrink-0">
      <DialogHeader><DialogTitle>Entregar comprobante</DialogTitle><DialogDescription>La {kind === 'ENTRY' ? 'entrada' : 'salida'} ya está registrada.</DialogDescription></DialogHeader>
      {error ? <div className="space-y-3"><p role="alert">{error}</p><Button onClick={() => setAttempt(value => value + 1)}>Reintentar comprobante</Button></div> : receipt && <>
        {/* Fondo blanco fijo: el operador ve exactamente el papel que recibe el cliente, no una
            versión adaptada al tema oscuro del sistema. */}
        <div className="rounded-xl bg-white p-4 text-black"><ParkingReceiptView receipt={receipt.snapshot} /></div>
        {!url ? <p role="alert" className="text-sm">El comprobante quedó registrado, pero falta configurar la dirección del sitio de comprobantes (<code>NEXT_PUBLIC_RECEIPTS_URL</code>) para poder entregarlo.</p> : <>
        {receipt.settings.qr && <div className="min-w-0 space-y-2 text-center"><QRCodeSVG value={url} size={224} marginSize={4} className="mx-auto h-auto w-full max-w-[224px] rounded bg-white" title="Escaneá para ver el comprobante" /><p className="text-sm">Escaneá el QR con tu celular</p></div>}
        <div className="flex flex-col gap-2">
          {receipt.settings.whatsapp && <><Button asChild><a href={`https://wa.me/${receipt.phoneCustomer ?? ''}?text=${encodeURIComponent(`Comprobante de ${kind === 'ENTRY' ? 'entrada' : 'salida'} · ${receipt.snapshot.parkingName}\n${url}`)}`} target="_blank" rel="noopener noreferrer">{receipt.phoneCustomer ? `Enviar por WhatsApp a +${receipt.phoneCustomer}` : 'Elegir contacto en WhatsApp'}</a></Button><p className="text-xs text-muted-foreground">Enviá desde la sesión de WhatsApp de la empresa.</p></>}
          {(receipt.settings.whatsapp || receipt.settings.qr) && <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); } catch { toast.error('No se pudo copiar. Abrí el comprobante para copiar su enlace.'); } }}>Copiar enlace</Button>}
          {receipt.settings.print && <Button asChild variant="outline"><a href={`${url}?print=${receipt.settings.paperWidth}`} target="_blank" rel="noopener noreferrer">Imprimir en térmica ({receipt.settings.paperWidth} mm)</a></Button>}
          <Button asChild variant="ghost"><a href={url} target="_blank" rel="noopener noreferrer">Ver comprobante</a></Button>
        </div>
        </>}
      </>}
    </DialogContent>
  </Dialog>;
}
