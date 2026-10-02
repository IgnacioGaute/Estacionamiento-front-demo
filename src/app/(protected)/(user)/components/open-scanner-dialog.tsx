'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, ScanLine, Trash2, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

import { receiptSchema, ReceiptSchemaType } from '@/schemas/receipt.schema';
import { Receipt } from '@/types/receipt.type';
import { Customer } from '@/types/cutomer.type';

interface OpenScannerDialogProps {
  open: boolean;
  onConfirm: (data: ReceiptSchemaType) => Promise<void>;
  onClose: () => void;
  receipt?: Receipt;
  customer?: Customer;
  customerType?: string;
}

const ars = (n: number | undefined | null) =>
  n != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(n)
    : '—';

export function OpenScannerDialog({
  open, onConfirm, onClose, receipt, customer, customerType,
}: OpenScannerDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ReceiptSchemaType>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      payments: [{ paymentType: 'TRANSFER', price: undefined }],
      print: false,
      onAccount: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control, name: 'payments',
  });

  const onAccount = form.watch('onAccount');
  const paymentType = form.watch('payments.0.paymentType');
  const isCredit = paymentType === 'CREDIT';

  useEffect(() => {
    if (isCredit) form.setValue('payments', [{ paymentType: 'CREDIT', price: undefined }]);
  }, [isCredit, form]);

  useEffect(() => {
    if (!onAccount && fields.length === 1 && receipt?.price) {
      form.setValue('payments.0.price', receipt.price);
    }
  }, [onAccount, fields.length, form, receipt?.price]);

  const handleSubmit = async (data: ReceiptSchemaType) => {
    try {
      setIsPending(true);
      if (!data.onAccount && data.payments.length === 1 && receipt?.price) {
        data.payments[0].price = receipt.price;
      }
      await onConfirm(data);
      onClose();
      form.reset();
    } catch (err) {
      console.error('❌ Error al confirmar:', err);
    } finally {
      setIsPending(false);
    }
  };

  const typeOfCustomer = receipt?.customer?.customerType || customerType || null;

  const methodOptions: { value: 'TRANSFER'|'CASH'|'CHECK'|'CREDIT'; label: string }[] =
    typeOfCustomer === 'PRIVATE'
      ? [
          { value: 'TRANSFER', label: 'Transferencia' },
          { value: 'CASH',     label: 'Efectivo' },
        ]
      : [
          { value: 'TRANSFER', label: 'Transferencia' },
          { value: 'CASH',     label: 'Efectivo' },
          { value: 'CHECK',    label: 'Cheque' },
          { value: 'CREDIT',   label: 'Crédito' },
        ];

  const initials = `${customer?.firstName?.[0] ?? ''}${customer?.lastName?.[0] ?? ''}`.toUpperCase() || 'GM';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <ScanLine className="size-4" />
            </span>
            <div>
              <DialogTitle>Cobro por escaneo</DialogTitle>
              <DialogDescription className="mt-0.5">
                Confirmá el cliente y la forma de pago.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Customer summary */}
        {customer && (
          <div className="rounded-md border border-border bg-gm-surface-2 p-3 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-gm-orange text-white font-display font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Cliente
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {customer.firstName} {customer.lastName}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                <span className="gm-mono">{customer.phone}</span>
                <span className="opacity-50">·</span>
                <span>{customer.numberOfVehicles} {customer.numberOfVehicles === 1 ? 'cochera' : 'cocheras'}</span>
              </div>
            </div>
            {receipt && (
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Recibo #{receipt.receiptNumber}
                </div>
                <div className="gm-display gm-tnum mt-0.5 text-[22px] font-bold text-gm-yellow">
                  {ars(receipt.startAmount)}
                </div>
                <Badge variant={receipt.status === 'PAID' ? 'green' : 'orange'} className="mt-0.5">
                  {receipt.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                </Badge>
              </div>
            )}
          </div>
        )}

        {isCredit && customer && (
          <div className="rounded-md border border-gm-yellow/40 bg-gm-yellow/10 p-3 flex items-center gap-3 text-[13px]">
            <Wallet className="size-4 text-gm-yellow shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">Crédito disponible</div>
              <div className="text-muted-foreground">Se descontará del saldo a favor.</div>
            </div>
            <div className="gm-mono gm-tnum text-[16px] font-bold text-gm-yellow">{ars(customer.credit)}</div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="onAccount"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>¿Es un pago a cuenta?</FormLabel>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => field.onChange(true)}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors',
                        field.value === true
                          ? 'border-gm-orange bg-gm-orange/15 text-[#FF8458]'
                          : 'border-border bg-gm-surface-2 text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground'
                      )}>
                      Sí, pago a cuenta
                    </button>
                    <button type="button" onClick={() => field.onChange(false)}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors',
                        field.value === false
                          ? 'border-[hsl(120_35%_55%)] bg-[hsl(120_35%_55%/0.15)] text-[#9AD588]'
                          : 'border-border bg-gm-surface-2 text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground'
                      )}>
                      Paga el total
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Formas de pago</Label>
              {fields.map((f, index) => (
                <div key={f.id} className="rounded-md border border-border bg-gm-surface-2 p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <FormField
                      control={form.control}
                      name={`payments.${index}.paymentType`}
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[180px] space-y-1.5">
                          <FormLabel>Tipo</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-1.5">
                              {methodOptions.map((m) => {
                                const active = field.value === m.value;
                                return (
                                  <button key={m.value} type="button"
                                    onClick={() => field.onChange(m.value)}
                                    className={cn(
                                      'rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                                      active
                                        ? 'border-gm-yellow bg-gm-yellow/15 text-gm-yellow'
                                        : 'border-border bg-gm-surface text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground'
                                    )}>
                                    {m.label}
                                  </button>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isCredit && (onAccount || fields.length > 1) && (
                      <FormField
                        control={form.control}
                        name={`payments.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="w-40 space-y-1.5">
                            <FormLabel>Monto</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm gm-mono">$</span>
                                <Input type="number" placeholder="0" className="pl-7 gm-mono gm-tnum"
                                  {...field} value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}/>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {!isCredit && fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon"
                        className="size-9 text-muted-foreground hover:text-[#F08775]"
                        onClick={() => remove(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!isCredit && (
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => append({ paymentType: 'CASH', price: undefined })}
                  className="w-full justify-center border border-dashed border-border hover:border-gm-yellow/40">
                  <Plus className="size-3.5" />
                  Agregar otra forma de pago
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} /> : <CheckCircle2 className="size-4"/>}
                {isPending ? 'Procesando…' : 'Confirmar pago'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
