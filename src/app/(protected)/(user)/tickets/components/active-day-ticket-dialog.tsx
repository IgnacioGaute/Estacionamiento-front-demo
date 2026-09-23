'use client';

import { useState, useTransition } from 'react';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';
import { useRouter } from 'next/navigation';
import { CalendarDays, CircleDollarSign, Landmark, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import { updateTicketRegistrationForDayStatusAction } from '@/actions/tickets/update-ticket-registration-for-day-status.action';
import { PaymentMethodDialog } from './payment-method-dialog';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

const metodoLabel: Record<'CASH' | 'TRANSFER', string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia' };

const ticketTimeTypeLabel: Record<string, string> = {
  DIA: 'Día/s',
  SEMANA: 'Semana/s',
  MES: 'Mes/es',
  SEMANA_Y_DIA: 'Semana/s y día/s',
  MES_Y_DIA: 'Mes/es y día/s',
};

function formatDate(date: string | Date | null) {
  if (!date) return '—';
  const value = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

// Fecha estimada de vencimiento: fecha de alta + la duración comprada. Cada tipo usa SOLO los
// campos que le corresponden — mezclar semanas/días de un tipo que no los usa (quedan pegados
// en el form como valor por defecto) da una fecha incorrecta.
function estimatedDueDate(registration: TicketRegistrationForDay) {
  if (!registration.dateNow) return null;
  const start = new Date(registration.dateNow);
  const t = registration.ticketTimeType;

  if (t === 'MES' || t === 'MES_Y_DIA') {
    start.setMonth(start.getMonth() + (registration.months ?? 0));
    if (t === 'MES_Y_DIA') {
      start.setDate(start.getDate() + (registration.days ?? 0));
    }
    return start;
  }

  const totalDays =
    t === 'SEMANA'
      ? (registration.weeks ?? 0) * 7
      : t === 'SEMANA_Y_DIA'
        ? (registration.weeks ?? 0) * 7 + (registration.days ?? 0)
        : registration.days ?? 0; // DIA
  start.setDate(start.getDate() + totalDays);
  return start;
}

interface ActiveDayTicketDialogProps {
  registration: TicketRegistrationForDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActiveDayTicketDialog({ registration, open, onOpenChange }: ActiveDayTicketDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const router = useRouter();

  const dueDate = registration ? estimatedDueDate(registration) : null;
  const overdueDays = dueDate
    ? Math.floor((new Date().setHours(0, 0, 0, 0) - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isOverdue = !registration?.retired && overdueDays > 0;

  const duration =
    registration?.ticketTimeType === 'SEMANA_Y_DIA'
      ? `${registration.weeks ?? 0} semana/s y ${registration.days ?? 0} día/s`
      : registration?.ticketTimeType === 'MES_Y_DIA'
        ? `${registration.months ?? 0} mes/es y ${registration.days ?? 0} día/s`
        : registration?.ticketTimeType === 'SEMANA'
          ? `${registration.weeks ?? 0} semana/s`
          : registration?.ticketTimeType === 'MES'
            ? `${registration.months ?? 0} mes/es`
            : `${registration?.days ?? 0} día/s`;

  const handleRegisterExit = () => {
    if (!registration) return;
    // Ya estaba pagado (al crearlo o antes) — solo hace falta marcar la salida, no vuelve a
    // pedir método de pago.
    if (registration.paid) {
      startTransition(async () => {
        const result = await updateTicketRegistrationForDayStatusAction(registration.id, { retired: true });
        if ('error' in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success('Salida registrada exitosamente');
          setReceiptId(registration.id);
          onOpenChange(false);
          router.refresh();
        }
      });
      return;
    }
    // Todavía no pagó — pide el método antes de cerrar, igual que al escanear la salida de un
    // ticket por código de barras.
    setShowPaymentDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto sm:max-h-[90dvh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <DialogTitle>
                  {registration?.vehiclePlateCustomer || 'Sin patente'}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  Ticket por {registration ? ticketTimeTypeLabel[registration.ticketTimeType] : '—'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {registration && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-gm-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Cliente
                  </span>
                  <Badge variant={registration.paid ? 'yellow' : 'blue'}>
                    {registration.paid ? 'Pagado' : 'Pendiente de pago'}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-foreground">
                  {[registration.firstNameCustomer, registration.lastNameCustomer].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {registration.vehicleType === 'CAMIONETA' ? 'Camioneta' : 'Automóvil'}
                </p>
                {registration.paid && registration.paymentMetodo && (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Pagó con {metodoLabel[registration.paymentMetodo]}
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border bg-gm-surface-2 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  Duración
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-foreground">{duration}</p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Desde
                  </span>
                  <span className="gm-mono gm-tnum text-[13px] font-semibold text-foreground">
                    {formatDate(registration.dateNow)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Vence (estimado)
                  </span>
                  <span
                    className={`gm-mono gm-tnum text-[13px] font-semibold ${isOverdue ? 'text-destructive' : 'text-foreground'}`}
                  >
                    {formatDate(dueDate)}
                  </span>
                </div>
                {isOverdue && (
                  <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                    Venció hace {overdueDays} día{overdueDays > 1 ? 's' : ''}. El sistema no cobra
                    ninguna tarifa extra por hora automáticamente — si corresponde cobrar algo más,
                    hay que acordarlo y registrarlo aparte.
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border bg-gm-surface-2 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <CircleDollarSign className="size-3.5" />
                  Precio
                </div>
                <p className="gm-display gm-tnum mt-1 text-[22px] font-bold leading-none text-gm-yellow">
                  {ars(registration.price)}
                </p>
              </div>

              {registration.paid && registration.boxList && (
                <div className="rounded-md border border-border bg-gm-surface-2 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <Landmark className="size-3.5" />
                    Imputado a caja
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[13px] font-medium text-foreground">
                      Caja #{registration.boxList.boxNumber}
                    </span>
                    <span className="gm-mono gm-tnum text-[13px] font-semibold text-foreground">
                      {formatDate(registration.boxList.date ?? registration.dateNow)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Corroborá en "Planilla de caja" (menú de usuario) buscando esta fecha — este
                    ticket ({ticketTimeTypeLabel[registration.ticketTimeType]}) aparece listado ahí.
                  </p>
                </div>
              )}

              {registration.retired ? (
                <p className="text-center text-[12px] text-muted-foreground">Salida ya registrada.</p>
              ) : (
                <Button className="w-full" size="sm" disabled={isPending} onClick={handleRegisterExit}>
                  <LogOut className="mr-1.5 size-3.5" />
                  Registrar salida
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ParkingReceiptDelivery registrationId={receiptId} kind="EXIT" onDismiss={() => setReceiptId(null)} />
      <PaymentMethodDialog
        price={registration?.price ?? null}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onPick={(metodo) =>
          updateTicketRegistrationForDayStatusAction(registration!.id, {
            paid: true,
            paymentMetodo: metodo,
            retired: true,
          })
        }
        onConfirmed={() => {
          if (registration) setReceiptId(registration.id);
          onOpenChange(false);
          router.refresh();
        }}
      />
    </>
  );
}
