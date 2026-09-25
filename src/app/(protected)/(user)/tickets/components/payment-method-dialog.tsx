'use client';

import { useEffect, useState, useTransition } from 'react';
import { Banknote, Landmark, Loader2, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

interface PaymentMethodDialogProps {
  price: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ejecuta el guardado real — distinto según sea un ticket por código de barras o por día/semana/mes. */
  onPick: (metodo: 'CASH' | 'TRANSFER') => Promise<{ error?: string } | void>;
  /**
   * Genera el cobro con QR. Opcional: donde no se pase, el diálogo muestra sólo los dos medios
   * que el cajero declara a mano.
   */
  onQr?: () => Promise<{ cobro?: CobroMercadoPago; error?: string }>;
  /**
   * Se ejecuta al cerrar el QR ya pagado. El cobro deja el pago registrado, pero lo que falte para
   * completar la operación —marcar el abono como retirado, por ejemplo— lo sabe quien abre este
   * diálogo, no el diálogo.
   */
  onQrListo?: () => Promise<{ error?: string } | void>;
  onConfirmed?: () => void;
}

// Diálogo de un solo paso, pensado para tocarlo a las apuradas apenas se registra una salida:
// dos botones grandes, sin campos ni confirmaciones extra. Se reutiliza tanto para tickets por
// código de barras como para tickets por día/semana/mes.
export function PaymentMethodDialog({
  price,
  open,
  onOpenChange,
  onPick,
  onQr,
  onQrListo,
  onConfirmed,
}: PaymentMethodDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);

  // Al cerrar y volver a abrir no puede quedar el QR de la vez anterior.
  useEffect(() => {
    if (!open) setCobroQr(null);
  }, [open]);

  const handleQr = () => {
    if (!onQr) return;
    startTransition(async () => {
      const r = await onQr();
      if (r.error || !r.cobro) {
        toast.error(r.error ?? 'No se pudo generar el QR.');
        return;
      }
      setCobroQr(r.cobro);
    });
  };

  const handlePick = (metodo: 'CASH' | 'TRANSFER') => {
    startTransition(async () => {
      const result = await onPick(metodo);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(metodo === 'CASH' ? 'Pago en efectivo registrado' : 'Pago por transferencia registrado');
        onOpenChange(false);
        onConfirmed?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>¿Cómo pagó?</DialogTitle>
          {price !== null && (
            <DialogDescription className="gm-display gm-tnum text-[26px] font-bold text-gm-yellow">
              {ars(price)}
            </DialogDescription>
          )}
        </DialogHeader>

        {cobroQr ? (
          <div className="space-y-3 pt-1">
            <CobroQrMercadoPago
              cobro={cobroQr}
              onAcreditado={setCobroQr}
              onCancelar={() => setCobroQr(null)}
            />
            {cobroQr.estado === 'ACREDITADO' && (
              // El tilde de pagado queda a la vista y el operador cierra cuando lo leyó.
              <Button
                className="min-h-12 w-full"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await onQrListo?.();
                    if (r?.error) {
                      toast.error(r.error);
                      return;
                    }
                    onOpenChange(false);
                    onConfirmed?.();
                  })
                }
              >
                {isPending ? 'Guardando…' : 'Listo'}
              </Button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handlePick('CASH')}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-gm-surface-2 py-7 text-foreground transition-all active:scale-95 hover:border-gm-yellow/60 hover:bg-gm-yellow/10 disabled:opacity-60"
          >
            <Banknote className="size-8 text-gm-yellow" />
            <span className="text-[15px] font-bold uppercase tracking-[0.03em]">Efectivo</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handlePick('TRANSFER')}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-gm-surface-2 py-7 text-foreground transition-all active:scale-95 hover:border-gm-yellow/60 hover:bg-gm-yellow/10 disabled:opacity-60"
          >
            <Landmark className="size-8 text-gm-yellow" />
            <span className="text-[15px] font-bold uppercase tracking-[0.03em]">Transferencia</span>
          </button>
          {/* A diferencia de los otros dos, este no lo declara el cajero: lo verifica el sistema
              contra MercadoPago. */}
          {onQr && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleQr}
              className="col-span-2 flex items-center justify-center gap-3 rounded-2xl border-2 border-gm-yellow/60 bg-gm-yellow/10 py-5 text-foreground transition-all active:scale-95 hover:bg-gm-yellow/20 disabled:opacity-60"
            >
              <QrCode className="size-7 text-gm-yellow" />
              <span className="flex flex-col items-start">
                <span className="text-[15px] font-bold uppercase tracking-[0.03em]">
                  {isPending ? 'Generando…' : 'QR / Celular'}
                </span>
                <span className="text-[11px] font-normal normal-case text-muted-foreground">
                  Se verifica solo
                </span>
              </span>
            </button>
          )}
        </div>
        )}

        {isPending && (
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Guardando…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
