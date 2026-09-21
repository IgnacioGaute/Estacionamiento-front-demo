'use client';

import { useTransition } from 'react';
import { Banknote, Landmark, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';

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
  onConfirmed,
}: PaymentMethodDialogProps) {
  const [isPending, startTransition] = useTransition();

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
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>¿Cómo pagó?</DialogTitle>
          {price !== null && (
            <DialogDescription className="gm-display gm-tnum text-[26px] font-bold text-gm-yellow">
              {ars(price)}
            </DialogDescription>
          )}
        </DialogHeader>

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
        </div>

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
