'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Receipt } from '@/types/receipt.type';
import { ReceiptPayment, PaymentHistoryOnAccount } from '@/types/receipt.type';
import { useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Argentina/Buenos_Aires';

interface ReceiptMovementsDrawerProps {
  receipt: Receipt & {
    payments?: ReceiptPayment[];
    paymentHistoryOnAccount?: PaymentHistoryOnAccount[];
  };
  triggerClassName?: string;
  triggerLabel?: ReactNode;
}

const ars = (n: number | undefined | null) =>
  n != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

function translatePaymentType(type: string) {
  switch (type) {
    case 'TRANSFER': return 'Transferencia';
    case 'CASH':     return 'Efectivo';
    case 'CHECK':    return 'Cheque';
    case 'CREDIT':   return 'Crédito';
    case 'FIX':      return 'Corrección';
    default:         return 'Automático';
  }
}

function paymentTypeBadgeVariant(type: string) {
  switch (type) {
    case 'TRANSFER': return 'blue' as const;
    case 'CASH':     return 'green' as const;
    case 'CHECK':    return 'orange' as const;
    case 'CREDIT':   return 'yellow' as const;
    case 'FIX':      return 'red' as const;
    default:         return 'default' as const;
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = dayjs.tz(dateStr, TZ);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
}

export function ReceiptMovementsDrawer({ receipt, triggerClassName, triggerLabel }: ReceiptMovementsDrawerProps) {
  const [open, setOpen] = useState(false);

  const hasMovements =
    (receipt.payments?.length || 0) > 0 ||
    (receipt.paymentHistoryOnAccount?.length || 0) > 0 ||
    (!receipt.payments?.length &&
      !receipt.paymentHistoryOnAccount?.length &&
      receipt.status === 'PAID');

  if (!hasMovements) return null;

  const hasOnlyReceiptPayment =
    receipt.status === 'PAID' &&
    (!receipt.payments?.length || receipt.payments.length === 0) &&
    (!receipt.paymentHistoryOnAccount?.length || receipt.paymentHistoryOnAccount.length === 0);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <span className={triggerClassName ?? "text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-[12.5px] transition-colors"}>
          {triggerLabel ?? 'Ver movimientos'}
        </span>
      </DrawerTrigger>

      <DrawerContent className="p-6 sm:max-w-2xl mx-auto rounded-t-xl">
        <DrawerHeader className="mb-4 p-0">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <Banknote className="size-4" />
            </span>
            <div className="flex-1">
              <DrawerTitle className="text-base">Movimientos del Recibo</DrawerTitle>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Historial de pagos registrados.
              </p>
            </div>
            <Badge variant={receipt.status === 'PAID' ? 'green' : 'orange'}>
              {receipt.status === 'PAID' ? 'Pagado' : 'Pendiente'}
            </Badge>
          </div>
        </DrawerHeader>

        {/* Receipt summary strip */}
        <div className="rounded-md border border-border bg-gm-surface-2 p-3 flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Recibo
            </div>
            <div className="gm-mono mt-0.5 text-[13px] font-bold text-gm-yellow">
              #{receipt.receiptNumber}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Total inicial
            </div>
            <div className="gm-display gm-tnum mt-0.5 text-[20px] font-bold text-foreground">
              {ars(receipt.startAmount)}
            </div>
          </div>
          <div className="text-right">
            {receipt.status === 'PENDING' && receipt.price > 0 ? (
              <>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Restante
                </div>
                <div className="gm-display gm-tnum mt-0.5 text-[20px] font-bold text-[#FF8458]">
                  {ars(receipt.price)}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Restante
                </div>
                <div className="gm-display gm-tnum mt-0.5 text-[20px] font-bold text-[#9AD588]">
                  {ars(0)}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Pagos directos */}
          {receipt.payments?.length > 0 && (
            <section>
              <h3 className="gm-display text-[12px] font-bold tracking-[0.08em] text-muted-foreground mb-2">
                Pagos
              </h3>
              <div className="space-y-2">
                {receipt.payments.map((p, idx) => (
                  <div
                    key={`payment-${idx}`}
                    className="rounded-md border border-border bg-gm-surface-2 p-3 flex items-center gap-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[hsl(120_35%_55%/0.4)] bg-[hsl(120_35%_55%/0.15)] text-[#9AD588]">
                      <ArrowDownRight className="size-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={paymentTypeBadgeVariant(p.paymentType)}>
                          {translatePaymentType(p.paymentType)}
                        </Badge>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-1 gm-mono">
                        {formatDate(p.paymentDate)}
                      </div>
                    </div>
                    <div className="gm-display gm-tnum text-[16px] font-bold text-foreground">
                      {ars(p.price)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pago único del recibo (sin payments ni paymentHistory) */}
          {hasOnlyReceiptPayment && (
            <section>
              <h3 className="gm-display text-[12px] font-bold tracking-[0.08em] text-muted-foreground mb-2">
                Pagos
              </h3>
              <div className="space-y-2">
                <div className="rounded-md border border-border bg-gm-surface-2 p-3 flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[hsl(120_35%_55%/0.4)] bg-[hsl(120_35%_55%/0.15)] text-[#9AD588]">
                    <ArrowDownRight className="size-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={paymentTypeBadgeVariant(receipt.paymentType)}>
                        {translatePaymentType(receipt.paymentType)}
                      </Badge>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-1 gm-mono">
                      {formatDate(receipt.paymentDate)}
                    </div>
                  </div>
                  <div className="gm-display gm-tnum text-[16px] font-bold text-foreground">
                    {ars(receipt.startAmount)}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Pagos a cuenta */}
          {receipt.paymentHistoryOnAccount?.length > 0 && (
            <section>
              <h3 className="gm-display text-[12px] font-bold tracking-[0.08em] text-muted-foreground mb-2">
                Pagos a cuenta
              </h3>
              <div className="space-y-2">
                {receipt.paymentHistoryOnAccount.map((p, idx) => (
                  <div
                    key={`history-${idx}`}
                    className="rounded-md border border-border bg-gm-surface-2 p-3 flex items-center gap-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-gm-orange/40 bg-gm-orange/15 text-[#FF8458]">
                      <ArrowUpRight className="size-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={paymentTypeBadgeVariant(p.paymentType)}>
                          {translatePaymentType(p.paymentType)}
                        </Badge>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-1 gm-mono">
                        {formatDate(p.paymentDate)}
                      </div>
                    </div>
                    <div className="gm-display gm-tnum text-[16px] font-bold text-foreground">
                      {ars(p.price)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
