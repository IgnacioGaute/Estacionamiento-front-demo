'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { saveReceiptDeliveryAction } from '@/actions/tickets/parking-receipt.action';
import { defaultReceiptDelivery, ReceiptDeliverySettings } from '@/types/parking-receipt.type';

export function ReceiptDeliveryCard({ initial }: { initial?: ReceiptDeliverySettings }) {
  const [settings, setSettings] = useState(initial ?? defaultReceiptDelivery);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  useEffect(() => setSettings(initial ?? defaultReceiptDelivery), [initial]);
  async function save() {
    setPending(true);
    const result = await saveReceiptDeliveryAction(settings);
    setPending(false);
    if (result.error) toast.error(result.error);
    else { toast.success('Medios de entrega guardados para esta playa.'); router.refresh(); }
  }
  return <section className="max-w-2xl space-y-5 rounded-xl border bg-card p-6">
    <div><h2 className="text-lg font-semibold">Entrega de comprobantes</h2>
      <p className="text-sm text-muted-foreground">Activá los medios que usa esta playa para entregar comprobantes de entrada y salida. Podés elegir uno, varios o ninguno.</p></div>
    {([
      ['whatsapp', 'WhatsApp manual', 'Abre WhatsApp con el enlace listo. Usá la sesión de la empresa y elegí el cliente antes de enviar.'],
      ['qr', 'QR en pantalla', 'El cliente escanea el código y abre el comprobante en su celular, sin iniciar sesión.'],
      ['print', 'Impresora USB', 'Imprime desde esta computadora usando una térmica instalada en el sistema.'],
    ] as const).map(([key, title, description]) => <div key={key} className="flex items-center justify-between gap-5 border-b pb-4">
      <label htmlFor={`receipt-${key}`} className="cursor-pointer"><span className="font-medium">{title}</span><p className="mt-1 text-sm text-muted-foreground">{description}</p></label>
      <Switch id={`receipt-${key}`} checked={settings[key]} disabled={pending} onCheckedChange={value => setSettings(current => ({ ...current, [key]: value }))} />
    </div>)}
    {settings.print && <div className="space-y-2"><label htmlFor="paper-width" className="text-sm font-medium">Ancho de papel</label>
      <select id="paper-width" className="ml-3 rounded border bg-background p-2" value={settings.paperWidth} disabled={pending} onChange={e => setSettings(current => ({ ...current, paperWidth: Number(e.target.value) as 58 | 80 }))}><option value={58}>58 mm</option><option value={80}>80 mm</option></select>
      <p className="text-xs text-muted-foreground">En el diálogo de impresión seleccioná la térmica, el mismo ancho de papel y desactivá encabezados y pies de página.</p>
    </div>}
    {!settings.whatsapp && !settings.qr && !settings.print && <p className="text-sm text-muted-foreground">No se ofrecerán medios de entrega al registrar entradas o salidas.</p>}
    <Button onClick={save} disabled={pending}>{pending ? 'Guardando…' : 'Guardar medios de entrega'}</Button>
  </section>;
}
