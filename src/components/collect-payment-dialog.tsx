'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { Dispatch, SetStateAction, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Receipt } from 'lucide-react';

interface CollectPaymentDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  customer: { name: string; garage: string; plate: string };
  amount: number;
  period: string;
  onConfirm: (data: { method: string; reference?: string; amount: number }) => void | Promise<void>;
  isPending?: boolean;
}

/**
 * Example dialog using the new design language — drop-in template for "cobrar mensualidad" /
 * receipt creation flows. Mirrors payment-type-receipt-dialog.tsx in the original repo.
 */
export function CollectPaymentDialog({
  open,
  setOpen,
  customer,
  amount,
  period,
  onConfirm,
  isPending,
}: CollectPaymentDialogProps) {
  const [method, setMethod] = useState('Efectivo');
  const [reference, setReference] = useState('');
  const [paid, setPaid] = useState(amount);

  const methods = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <Receipt className="size-4" />
            </span>
            <div>
              <DialogTitle>Cobrar mensualidad</DialogTitle>
              <DialogDescription className="mt-0.5">{period}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Customer summary strip */}
        <div className="rounded-md border border-border bg-gm-surface-2 p-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Cliente
            </div>
            <div className="mt-0.5 text-sm font-semibold truncate">{customer.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground gm-mono">
              <span>{customer.plate}</span>
              <span className="opacity-50">·</span>
              <span>Cochera {customer.garage}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              A cobrar
            </div>
            <div className="gm-display gm-tnum mt-0.5 text-[28px] font-bold leading-none text-gm-yellow">
              $ {amount.toLocaleString('es-AR')}
            </div>
          </div>
        </div>

        {/* Method selector — chip group */}
        <div className="space-y-2">
          <Label>Forma de pago</Label>
          <div className="flex flex-wrap gap-1.5">
            {methods.map((m) => {
              const active = m === method;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    'rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                    (active
                      ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                      : 'border-border bg-gm-surface-2 text-muted-foreground hover:text-foreground hover:bg-gm-surface-3')
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount-paid">Monto recibido</Label>
            <Input
              id="amount-paid"
              type="number"
              value={paid}
              onChange={(e) => setPaid(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">Referencia / N° operación</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        {paid !== amount && (
          <div className="rounded-md border border-gm-orange/40 bg-gm-orange/10 p-2.5 text-[12px] text-[#FF8458]">
            {paid > amount ? (
              <>Vuelto: <span className="gm-mono gm-tnum font-bold">$ {(paid - amount).toLocaleString('es-AR')}</span></>
            ) : (
              <>Faltan: <span className="gm-mono gm-tnum font-bold">$ {(amount - paid).toLocaleString('es-AR')}</span></>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ method, reference, amount: paid })}
            disabled={isPending || paid < amount}
          >
            {isPending ? <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} /> : <CreditCard className="size-4" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
