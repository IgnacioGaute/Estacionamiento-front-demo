'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { saveReceiptDeliveryAction } from '@/actions/tickets/parking-receipt.action';
import { defaultReceiptDelivery, ReceiptDeliverySettings } from '@/types/parking-receipt.type';
import { Check, MessageCircle, Printer, QrCode, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const enabledCount = [settings.whatsapp, settings.qr, settings.print].filter(Boolean).length;
  const channels = [
    { key: 'whatsapp', title: 'WhatsApp manual', subtitle: 'Envío al teléfono del cliente', icon: MessageCircle,
      description: 'Abrí el chat con el enlace preparado y confirmá el envío desde el WhatsApp de la empresa.', hint: 'Usa el teléfono guardado en la entrada. Si no hay número, podés elegir el contacto.' },
    { key: 'qr', title: 'QR en pantalla', subtitle: 'El cliente lo escanea', icon: QrCode,
      description: 'Mostrá el código en el mostrador para que el cliente abra su comprobante en el celular.', hint: 'Sin iniciar sesión. El cliente puede descargar el comprobante en PDF o imagen.' },
    { key: 'print', title: 'Impresora USB', subtitle: 'Comprobante en papel', icon: Printer,
      description: 'Imprimí desde la computadora del mostrador con una térmica instalada en el sistema.', hint: 'Elegí la térmica al imprimir y desactivá los encabezados y pies de página.' },
  ] as const;
  return <section className="w-full space-y-6 py-2">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl"><h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Entrega de comprobantes</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Elegí cómo entregar las entradas y salidas de esta playa. Podés combinar los medios que necesites.</p></div>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"><span className={cn('size-1.5 rounded-full', enabledCount ? 'bg-gm-yellow' : 'bg-muted-foreground')} />{enabledCount} de 3 seleccionados</span>
    </header>

    <div className="grid items-stretch gap-4 lg:grid-cols-3">
      {channels.map(({ key, title, subtitle, icon: Icon, description, hint }) => {
        const enabled = settings[key];
        return <article key={key} className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card transition-colors', enabled ? 'border-gm-yellow/50' : 'border-border')}>
          <div className={cn('h-1', enabled ? 'bg-gm-yellow' : 'bg-transparent')} />
          <div className="flex flex-1 flex-col p-5 xl:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className={cn('grid size-12 place-items-center rounded-xl border', enabled ? 'border-gm-yellow/20 bg-gm-yellow/10 text-gm-yellow' : 'border-border bg-secondary text-muted-foreground')}><Icon className="size-6" /></span>
              <Switch id={`receipt-${key}`} aria-describedby={`receipt-${key}-description`} checked={enabled} disabled={pending} onCheckedChange={value => setSettings(current => ({ ...current, [key]: value }))} />
            </div>
            <label htmlFor={`receipt-${key}`} className="cursor-pointer text-lg font-semibold">{title}</label>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
            <p id={`receipt-${key}-description`} className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="mt-auto pt-6">
              {key === 'print' && <fieldset disabled={!enabled || pending} className="mb-4 space-y-2 disabled:opacity-40">
                <legend className="mb-2 text-xs font-medium">Ancho de papel</legend>
                <div className="grid grid-cols-2 gap-2">{([58, 80] as const).map(width => <label key={width} className="cursor-pointer">
                  <input type="radio" name="receipt-paper-width" value={width} checked={settings.paperWidth === width} onChange={() => setSettings(current => ({ ...current, paperWidth: width }))} className="peer sr-only" />
                  <span className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm transition-colors peer-checked:border-gm-yellow/60 peer-checked:bg-gm-yellow/10 peer-checked:text-gm-yellow peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{settings.paperWidth === width && <Check className="size-3.5" />}{width} mm</span>
                </label>)}</div>
              </fieldset>}
              <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{hint}</p>
            </div>
          </div>
          <div className={cn('flex items-center gap-2 border-t px-5 py-3 text-xs font-medium xl:px-6', enabled ? 'border-gm-yellow/15 bg-gm-yellow/5 text-gm-yellow' : 'border-border text-muted-foreground')}><span className={cn('size-1.5 rounded-full', enabled ? 'bg-gm-yellow' : 'bg-muted-foreground/50')} />{enabled ? 'Seleccionado' : 'Desactivado'}</div>
        </article>;
      })}
    </div>

    <footer className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-medium">Configuración de esta playa</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{enabledCount ? 'Guardá los cambios para aplicar esta selección a las entradas y salidas.' : 'Con todos desactivados, no se ofrecerán medios de entrega.'}</p></div>
      <Button onClick={save} disabled={pending} className="min-h-11 shrink-0 gap-2 sm:px-6"><Save className="size-4" />{pending ? 'Guardando…' : 'Guardar configuración'}</Button>
    </footer>
  </section>;
}
