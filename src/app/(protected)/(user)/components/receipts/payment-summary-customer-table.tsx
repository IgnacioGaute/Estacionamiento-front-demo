'use client';

import { useState, useTransition, useEffect, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCustomerById } from '@/services/customers.service';
import {
  ArrowRightLeft,
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Printer,
  Save,
  X,
} from 'lucide-react';
import { Customer } from '@/types/cutomer.type';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { generateReceiptsWithoutRegistering } from '@/utils/generate-receipt-without-registering';
import { toast } from 'sonner';
import { cancelReceiptAction } from '@/actions/receipts/cancel-receipt.action';
import { ReceiptSchemaType } from '@/schemas/receipt.schema';
import { historialReceiptsAction } from '@/actions/receipts/create-receipt.action';
import { PaymentTypeReceiptDialog } from './payment-type-receipt-dialog';
import { Receipt } from '@/types/receipt.type';
import { ReceiptMovementsDrawer } from './receipt-movements-drower';
import { DeleteReceiptDialog } from './delete-receipt-dialog';
import { cn } from '@/lib/utils';
import { DialogTourButton, TOUR_POPUP_ATTR } from '../dialog-tour-button';

dayjs.extend(utc);
dayjs.extend(timezone);

interface PaymentSummaryTableProps {
  customer: Customer;
  children?: ReactNode;
  autoOpen?: boolean;
}

const TZ = 'America/Argentina/Buenos_Aires';

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ars = (n: number | undefined | null) =>
  n != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
    : '—';

function fmt(dateStr?: string | Date | null, format = 'DD/MM/YY') {
  if (!dateStr) return '—';
  const d = dayjs.tz(dateStr, TZ);
  return d.isValid() ? d.format(format) : '—';
}

function translatePaymentType(t: string) {
  switch (t) {
    case 'TRANSFER': return 'Transferencia';
    case 'CASH':     return 'Efectivo';
    case 'CHECK':    return 'Cheque';
    case 'CREDIT':   return 'Crédito';
    case 'FIX':      return 'Corrección';
    default:         return 'Automático';
  }
}

function paymentBadgeVariant(t: string) {
  switch (t) {
    case 'TRANSFER': return 'blue'    as const;
    case 'CASH':     return 'green'   as const;
    case 'CHECK':    return 'orange'  as const;
    case 'CREDIT':   return 'yellow'  as const;
    case 'FIX':      return 'red'     as const;
    default:         return 'default' as const;
  }
}

// ── Vehicle abstraction (works for OWNER, RENTER, PRIVATE) ───────────────────

type VehicleDisplay = {
  licensePlate: string | null;
  garageNumber: string;
  amount: number;
};

function getVehicleDisplays(customer: Customer): VehicleDisplay[] {
  if (customer.customerType === 'RENTER' || customer.customerType === 'PRIVATE') {
    const renters = (customer.parkingRenters ?? [])
      .filter(vr => !vr.deletedAt)
      .map(vr => ({
        licensePlate: vr.parkingOwner?.licensePlate || vr.licensePlate || null,
        garageNumber: vr.garageNumber,
        amount: vr.amount,
      }));
    if (renters.length > 0) return renters;
    // fallback to parkingOwners[] if parkingRenters not yet loaded
    return (customer.parkingOwners ?? []).map(v => ({
      licensePlate: v.licensePlate || null,
      garageNumber: v.garageNumber,
      amount: v.amount,
    }));
  }
  return (customer.parkingOwners ?? []).map(v => ({
    licensePlate: v.licensePlate || null,
    garageNumber: v.garageNumber,
    amount: v.amount,
  }));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MonthStatus = 'PAGADO' | 'POR_COBRAR';

type MonthEntry = {
  month: number;
  year: number;
  receipt: Receipt;
  status: MonthStatus;
  amount: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortDesc(list: Receipt[]) {
  const toTime = (v?: string | Date | null): number => {
    if (!v) return NaN;
    if (v instanceof Date) return v.getTime();
    const d = dayjs.tz(v as string, TZ);
    return d.isValid() ? d.valueOf() : NaN;
  };
  return [...list].sort((a, b) => {
    const aS = toTime(a.startDate) || -Infinity;
    const bS = toTime(b.startDate) || -Infinity;
    if (bS !== aS) return bS - aS;
    return (toTime(b.paymentDate || b.dateNow) || -Infinity) - (toTime(a.paymentDate || a.dateNow) || -Infinity);
  });
}

// Only shows months with real receipts — no FUTURO cards
function buildTimeline(year: number, receipts: Receipt[]): MonthEntry[] {
  const byMonth = new Map<number, Receipt>();
  receipts.forEach(r => {
    if (!r.startDate) return;
    const d = dayjs.tz(r.startDate, TZ);
    if (d.isValid() && d.year() === year) byMonth.set(d.month(), r);
  });

  if (byMonth.size === 0) return [];

  return Array.from(byMonth.keys())
    .sort((a, b) => a - b)
    .map(month => {
      const receipt = byMonth.get(month)!;
      const status: MonthStatus = receipt.status === 'PAID' ? 'PAGADO' : 'POR_COBRAR';
      const amount = receipt.price > 0 ? receipt.price : receipt.startAmount;
      return { month, year, receipt, status, amount };
    });
}

function getHabitual(receipts: Receipt[]): string | null {
  const counts: Record<string, number> = {};
  receipts.filter(r => r.status === 'PAID').forEach(r => {
    const types = r.payments?.length
      ? r.payments.map(p => p.paymentType)
      : r.paymentHistoryOnAccount?.length
      ? r.paymentHistoryOnAccount.map(p => p.paymentType)
      : r.paymentType ? [r.paymentType] : [];
    types.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  });
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
}

function receiptHasMovements(r: Receipt): boolean {
  return (
    (r.payments?.length || 0) > 0 ||
    (r.paymentHistoryOnAccount?.length || 0) > 0 ||
    (!(r.payments?.length) && !(r.paymentHistoryOnAccount?.length) && r.status === 'PAID')
  );
}

function getDueInfo(startDate: string | null | undefined, hasPending: boolean) {
  if (!hasPending || !startDate) return null;
  const today   = dayjs().tz(TZ);
  const sd      = dayjs.tz(startDate, TZ);
  if (!sd.isValid()) return null;
  const billingDay = sd.date();
  const dueDate = today.date(Math.min(billingDay, today.daysInMonth()));
  if (dueDate.isBefore(today, 'day')) {
    return { days: today.diff(dueDate, 'day'), overdue: true };
  }
  return { days: dueDate.diff(today, 'day'), overdue: false };
}

// ── Month card ────────────────────────────────────────────────────────────────

function MonthCard({ entry, isSelected, onClick }: { entry: MonthEntry; isSelected: boolean; onClick: () => void }) {
  const isPaid = entry.status === 'PAGADO';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 w-[112px] rounded-lg border p-3 flex flex-col gap-1.5 transition-all text-left cursor-pointer',
        isSelected
          ? 'border-gm-yellow bg-gm-yellow/10 ring-1 ring-gm-yellow/30'
          : isPaid
          ? 'border-border bg-gm-surface-2 hover:border-gm-line-strong'
          : 'border-gm-orange/60 bg-gm-orange/[0.08] hover:border-gm-orange/80',
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {MONTH_SHORT[entry.month]} {String(entry.year).slice(-2)}
      </div>
      <div className={cn(
        'gm-display gm-tnum text-[14px] font-bold leading-none',
        isSelected ? 'text-gm-yellow' : isPaid ? 'text-foreground' : 'text-[#FF8458]',
      )}>
        {entry.amount ? ars(entry.amount) : '—'}
      </div>
      {entry.receipt.paymentDate && isPaid && (
        <div className="gm-mono text-[10px] text-muted-foreground leading-none">
          {dayjs.tz(entry.receipt.paymentDate, TZ).format('DD/MM/YY')}
        </div>
      )}
      <div className={cn(
        'flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] mt-auto pt-0.5',
        isSelected && isPaid ? 'text-gm-yellow' : isPaid ? 'text-[#9AD588]' : 'text-[#FF8458]',
      )}>
        {isPaid ? <><Check size={9} className="shrink-0" /> PAGADO</> : 'POR COBRAR'}
      </div>
    </button>
  );
}

// ── Right-panel data row ──────────────────────────────────────────────────────

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

// ── Payment methods cell ──────────────────────────────────────────────────────

function PaymentMethods({ receipt }: { receipt: Receipt }) {
  const items = receipt.payments?.length
    ? receipt.payments
    : receipt.paymentHistoryOnAccount?.length
    ? receipt.paymentHistoryOnAccount
    : receipt.paymentType ? [{ paymentType: receipt.paymentType }] : [];

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((p, i) => (
        <Badge key={i} variant={paymentBadgeVariant(p.paymentType)} className="text-[10px]">
          {translatePaymentType(p.paymentType)}
        </Badge>
      ))}
    </div>
  );
}

// ── Dropdown item class ───────────────────────────────────────────────────────

const MENU_ITEM_CLS =
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-[7px] text-[12.5px] outline-none transition-colors hover:bg-accent hover:text-accent-foreground';


// ── Main component ────────────────────────────────────────────────────────────

export function PaymentSummaryTable({ customer, children, autoOpen }: PaymentSummaryTableProps) {
  const [open, setOpen]                           = useState(false);
  const [isPending, startTransition]              = useTransition();
  const [receipts, setReceipts]                   = useState(customer.receipts || []);
  const [currentPage, setCurrentPage]             = useState(1);
  const [openCancelDialog, setOpenCancelDialog]   = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedReceiptForPayment, setSelectedReceiptForPayment] = useState<Receipt | null>(null);
  const [updatedCustomer, setUpdatedCustomer]     = useState<Customer | null>(null);
  const [selectedYear, setSelectedYear]           = useState(dayjs().tz(TZ).year());
  const [selectedEntry, setSelectedEntry]         = useState<MonthEntry | null>(null);
  const [openDropdownId, setOpenDropdownId]       = useState<string | null>(null);

  const PAGE_SIZE = 5;
  const { data: session } = useSession();

  useEffect(() => {
    if (autoOpen) { setOpen(false); setTimeout(() => setOpen(true), 100); }
  }, [autoOpen]);

  useEffect(() => {
    if (!open) { setSelectedEntry(null); return; }
    startTransition(async () => {
      try {
        const updated = await getCustomerById(customer.id, session?.token);
        if (updated) {
          setUpdatedCustomer(updated);
          setReceipts(sortDesc(updated.receipts || []));
          setCurrentPage(1);
        }
      } catch { /* silent */ }
    });
  }, [open, customer.id, session?.token]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const active        = updatedCustomer || customer;
  const vehicles      = getVehicleDisplays(active);
  const initials      = `${customer.firstName?.[0] ?? ''}${customer.lastName?.[0] ?? ''}`.toUpperCase() || 'GM';

  const sorted        = sortDesc(receipts);
  const pendingAll    = receipts.filter(r => r.status === 'PENDING');
  const pendingCount  = pendingAll.length;
  const pendingTotal  = pendingAll.reduce((s, r) => s + (r.price > 0 ? r.price : r.startAmount), 0);
  const firstPending  = sorted.find(r => r.status === 'PENDING') ?? null;
  const firstPendingEntry: MonthEntry | null = firstPending?.startDate
    ? {
        month: dayjs.tz(firstPending.startDate, TZ).month(),
        year: dayjs.tz(firstPending.startDate, TZ).year(),
        receipt: firstPending,
        status: 'POR_COBRAR',
        amount: firstPending.price > 0 ? firstPending.price : firstPending.startAmount,
      }
    : null;
  // Sidebar always shows a specific month's balance, never the aggregate total —
  // falls back to the current pending month when nothing is explicitly selected.
  const effectiveEntry = selectedEntry ?? firstPendingEntry;

  const totalPages    = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated     = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const yearSet       = new Set([...receipts.map(r => r.startDate ? dayjs.tz(r.startDate, TZ).year() : null).filter(Boolean) as number[], dayjs().tz(TZ).year()]);
  const availableYears = [...yearSet].sort((a, b) => b - a);
  const timeline      = buildTimeline(selectedYear, receipts);
  const habitualType  = getHabitual(receipts);

  const typeLabel     = customer.customerType === 'OWNER' ? 'Propietario' : customer.customerType === 'RENTER' ? 'Inquilino' : 'Particular';
  const altaDate      = active.startDate ? dayjs.tz(active.startDate, TZ) : dayjs(active.createdAt);
  const altaFmt       = altaDate.isValid() ? altaDate.format('MM/YYYY') : null;
  const dueInfo       = getDueInfo(active.startDate, pendingCount > 0);

  const cleanPhone    = customer.phone?.replace(/\D/g, '') ?? '';

  // WhatsApp — use selected or first pending receipt to mention the specific month
  const receiptForWa  = effectiveEntry?.receipt ?? firstPending;
  const waMonthDate   = receiptForWa?.startDate ? dayjs.tz(receiptForWa.startDate, TZ) : null;
  const waMsg = encodeURIComponent(
    waMonthDate?.isValid()
      ? `Hola ${customer.firstName}, le recordamos que el abono del mes de ${MONTH_FULL[waMonthDate.month()]} ${waMonthDate.year()} se encuentra pendiente de pago. Muchas gracias.`
      : `Hola ${customer.firstName}, le recordamos que tiene mensualidades pendientes. Muchas gracias.`
  );
  const waUrl = cleanPhone ? `https://wa.me/549${cleanPhone}?text=${waMsg}` : null;

  const selectedMonth = effectiveEntry
    ? `${MONTH_SHORT[effectiveEntry.month]} ${String(effectiveEntry.year).slice(-2)}`
    : null;

  // Vehicle chips (max 4 shown, rest collapsed)
  const MAX_CHIPS = 4;
  const shownVehicles = vehicles.slice(0, MAX_CHIPS);
  const extraVehicles = vehicles.length - MAX_CHIPS;
  // Show license plate only when single vehicle or for first vehicle of owners
  const showLicensePlate = vehicles.length > 0 && vehicles[0].licensePlate && customer.customerType !== 'RENTER';

  // ── Actions ────────────────────────────────────────────────────────────────

  const refreshReceipts = async () => {
    try {
      const updated = await getCustomerById(customer.id, session?.token);
      if (updated) {
        setUpdatedCustomer(updated);
        setReceipts(sortDesc(updated.receipts || []));
        setCurrentPage(1);
      }
    } catch { /* silent */ }
  };

  const handlePrint    = async (r: Receipt) => { try { await generateReceiptsWithoutRegistering(active, r); } catch { /* silent */ } };
  const handleRegister = (r: Receipt) => { setSelectedReceiptForPayment(r); setOpenPaymentDialog(true); };

  const handleConfirmPayment = async (data: ReceiptSchemaType) => {
    try {
      const res = await historialReceiptsAction(selectedReceiptForPayment?.id || '', customer.id, data);
      if (res.error) toast.error(res.error.message);
      else { toast.success('Pago registrado exitosamente.'); await refreshReceipts(); }
    } catch { toast.error('Error al registrar el pago.'); }
    finally { setOpenPaymentDialog(false); setSelectedReceiptForPayment(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={cn('gm-rc', open && 'open')}
            onClick={() => setOpen(true)}
          >
            <span className="gm-rc__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                <rect className="l l1" x="4" y="6"  width="16" height="2.4" rx="1.2" fill="currentColor"/>
                <rect className="l l2" x="4" y="11" width="16" height="2.4" rx="1.2" fill="currentColor"/>
                <rect className="l l3" x="4" y="16" width="11" height="2.4" rx="1.2" fill="currentColor"/>
              </svg>
            </span>
            <span className="gm-rc__lbl">{children || 'Ver Resumen'}</span>
          </button>
        </DialogTrigger>

        <DialogContent
          className={cn(
            'max-w-[1100px] w-full h-[90vh] max-h-[760px] overflow-hidden',
            'grid-rows-[auto_1fr]',
            '[&>div:nth-child(2)]:p-0',
            '[&>div:nth-child(2)]:gap-0',
            '[&>div:nth-child(2)]:overflow-hidden',
          )}
          onPointerDownOutside={(e) => {
            // Tour tooltip/ring are portaled to document.body (real viewport
            // coordinates, so they aren't clipped by this dialog's own
            // overflow-hidden) — without this guard Radix would see clicks
            // on them as "outside" and close the dialog mid-tour.
            const target = e.detail.originalEvent.target as HTMLElement | null;
            if (target?.closest(`[${TOUR_POPUP_ATTR}]`)) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col h-full overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,197,24,.07) 0%, transparent 40%), hsl(var(--background))' }}>

            {/* ── HEADER ──────────────────────────────────────────────── */}
            <div data-dialog-tour="header" className="shrink-0 flex items-start gap-4 px-4 sm:px-6 py-4 pr-16 border-b border-border flex-wrap">
              {/* Avatar */}
              <div className="grid size-[52px] shrink-0 place-items-center rounded-md bg-gm-orange font-display font-bold text-[18px] text-white">
                {initials}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="gm-display text-[17px] font-bold uppercase tracking-[0.03em] text-foreground leading-none">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <Badge variant="default" className="text-[10px] uppercase tracking-wider shrink-0 rounded-full px-2.5">
                    {typeLabel}
                  </Badge>
                  {dueInfo && (
                    <Badge variant="orange" className="text-[10px] gap-1 shrink-0 rounded-full px-2.5">
                      <Clock size={9} />
                      {dueInfo.overdue
                        ? `ATRASADO ${dueInfo.days} DÍA${dueInfo.days !== 1 ? 'S' : ''}`
                        : dueInfo.days === 0 ? 'VENCE HOY'
                        : `VENCE EN ${dueInfo.days} DÍA${dueInfo.days !== 1 ? 'S' : ''}`}
                    </Badge>
                  )}
                  {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground ml-1" />}
                </div>

                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {!!active.customerNumber && (
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <span className="grid size-4 place-items-center rounded border border-border/60 text-[9px] font-bold">N°</span>
                      {active.customerNumber}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <Phone size={11} className="shrink-0" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.comments && (
                    <span className="text-[11.5px] text-muted-foreground max-w-[220px] truncate">
                      {customer.comments}
                    </span>
                  )}
                </div>
              </div>

              {/* Vehicle chips */}
              {vehicles.length > 0 && (
                <div className="flex items-end gap-2 shrink-0 flex-wrap justify-end max-w-[380px]">
                  {showLicensePlate && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Patente</span>
                      <div className="rounded border-2 border-foreground/25 bg-background px-2.5 py-1 text-center">
                        <div className="gm-display gm-mono text-[14px] font-bold text-foreground tracking-[0.12em]">
                          {vehicles[0].licensePlate}
                        </div>
                      </div>
                    </div>
                  )}
                  {shownVehicles.map((v, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cochera</span>
                      <div className="rounded border-2 border-gm-yellow/60 bg-gm-yellow/10 px-2.5 py-1 text-center min-w-[52px]">
                        <div className="gm-display text-[14px] font-bold text-gm-yellow tracking-wide">
                          {v.garageNumber}
                        </div>
                      </div>
                    </div>
                  ))}
                  {extraVehicles > 0 && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground invisible">·</span>
                      <div className="size-[38px] rounded border-2 border-border bg-gm-surface-2 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-muted-foreground">+{extraVehicles}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── TOUR STRIP ────────────────────────────────────────────── */}
            <div className="shrink-0 flex justify-end px-4 py-1.5 border-b border-border/40">
              <DialogTourButton />
            </div>

            {/* ── BODY ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">

              {/* Left panel */}
              <div className="flex-1 overflow-y-auto min-w-0 px-4 sm:px-6 py-5 space-y-6">

                {/* ESTADO DE CUENTA */}
                <section data-dialog-tour="timeline">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="gm-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Estado de Cuenta
                    </h3>
                    <div className="flex gap-0.5">
                      {availableYears.map(y => (
                        <button
                          key={y}
                          onClick={() => { setSelectedYear(y); setSelectedEntry(null); }}
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors',
                            selectedYear === y
                              ? 'bg-gm-surface-3 text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  {timeline.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
                      {timeline.map(entry => {
                        const key = `${entry.year}-${entry.month}`;
                        const isSel = effectiveEntry?.year === entry.year && effectiveEntry?.month === entry.month;
                        return (
                          <MonthCard
                            key={key}
                            entry={entry}
                            isSelected={isSel}
                            onClick={() => setSelectedEntry(isSel ? null : entry)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-gm-surface-2/40 p-5 text-center text-[12.5px] text-muted-foreground mt-3">
                      No hay recibos en {selectedYear}.
                    </div>
                  )}
                </section>

                {/* RECIBOS EMITIDOS */}
                <section data-dialog-tour="receipts">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="gm-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Recibos Emitidos
                    </h3>
                    <span className="gm-mono text-[11px] text-muted-foreground">{sorted.length} total</span>
                  </div>

                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] w-[88px]">Número</TableHead>
                          <TableHead className="text-[11px]">Estado</TableHead>
                          <TableHead className="text-[11px]">Concepto</TableHead>
                          <TableHead className="text-[11px]">Fecha</TableHead>
                          <TableHead className="text-[11px]">Forma de pago</TableHead>
                          <TableHead className="text-[11px] text-right">Importe</TableHead>
                          <TableHead className="text-[11px] text-center w-[64px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.length > 0 ? paginated.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="gm-mono text-[11.5px] text-gm-yellow font-semibold py-2">
                              {r.receiptNumber || '—'}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={r.status === 'PAID' ? 'green' : 'orange'} className="text-[10px] gap-1">
                                {r.status === 'PAID'
                                  ? <><BadgeCheck size={10} /> Pagado</>
                                  : <><Clock size={10} /> Pendiente</>}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[12px] py-2">
                              <div>
                                {r.startDate
                                  ? `Abono mensual · ${MONTH_FULL[dayjs.tz(r.startDate, TZ).month()]}`
                                  : 'Abono mensual'}
                              </div>
                              {r.createdAt && (
                                <div className="text-[10.5px] text-muted-foreground/70 mt-0.5">
                                  Creado {fmt(r.createdAt)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[11.5px] gm-mono text-muted-foreground py-2">
                              {fmt(r.paymentDate)}
                            </TableCell>
                            <TableCell className="py-2">
                              <PaymentMethods receipt={r} />
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <span className="gm-display gm-tnum text-[13px] font-bold">
                                {ars(r.price > 0 ? r.price : r.startAmount)}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 pr-3">
                              <DropdownMenu
                                open={openDropdownId === r.id}
                                onOpenChange={v => setOpenDropdownId(v ? r.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button data-dialog-tour="receipt-actions" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 p-1 border border-border bg-gm-surface shadow-[0_8px_32px_-6px_rgba(0,0,0,0.7)]"
                                >
                                  <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-border my-0.5" />

                                  <DropdownMenuItem
                                    className="gap-2 text-[12.5px] cursor-pointer px-2 py-[7px]"
                                    onClick={() => { handlePrint(r); setOpenDropdownId(null); }}
                                  >
                                    <Printer size={13} className="text-muted-foreground shrink-0" />
                                    Imprimir recibo
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    className="gap-2 text-[12.5px] cursor-pointer px-2 py-[7px]"
                                    onClick={() => { handleRegister(r); setOpenDropdownId(null); }}
                                  >
                                    <Save size={13} className="text-muted-foreground shrink-0" />
                                    Registrar pago
                                  </DropdownMenuItem>

                                  {receiptHasMovements(r) && (
                                    <>
                                      <DropdownMenuSeparator className="bg-border my-0.5" />
                                      <ReceiptMovementsDrawer
                                        receipt={r}
                                        triggerClassName={MENU_ITEM_CLS}
                                        triggerLabel={<><ArrowRightLeft size={13} className="text-muted-foreground shrink-0" /> Ver movimientos</>}
                                      />
                                    </>
                                  )}

                                  <DropdownMenuSeparator className="bg-border my-0.5" />

                                  <DropdownMenuItem
                                    className="gap-2 text-[12.5px] cursor-pointer px-2 py-[7px] text-[#F08775] focus:text-[#F08775] focus:bg-destructive/10"
                                    onClick={() => {
                                      setSelectedReceiptId(r.id);
                                      setOpenCancelDialog(true);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Ban size={13} className="shrink-0" />
                                    Cancelar recibo
                                  </DropdownMenuItem>

                                  <DeleteReceiptDialog
                                    receipt={r}
                                    triggerClassName="text-[12.5px] text-[#F08775] hover:text-[#F08775] hover:bg-destructive/10 rounded-sm font-normal h-auto py-[7px]"
                                  />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-20 text-center text-[13px] text-muted-foreground">
                              No hay recibos registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      <span className="text-[11px] text-muted-foreground gm-mono">
                        Página {currentPage} de {totalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                          <ChevronLeft size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                          <ChevronRight size={13} />
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
              <div data-dialog-tour="sidebar" className="w-full sm:w-[258px] shrink-0 border-t sm:border-t-0 sm:border-l border-border overflow-y-auto max-h-[45vh] sm:max-h-none px-4 py-5 flex flex-col gap-5">

                {/* SALDO A PAGAR */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="gm-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Saldo a Pagar
                    </h3>
                    {selectedEntry && (
                      <button
                        onClick={() => setSelectedEntry(null)}
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={10} /> Limpiar
                      </button>
                    )}
                  </div>

                  {effectiveEntry ? (
                    <>
                      <div className="mb-1">
                        <span className="text-[10.5px] font-semibold text-gm-yellow uppercase tracking-wide">
                          {selectedMonth}
                        </span>
                      </div>
                      <div className={cn(
                        'gm-display gm-tnum text-[30px] font-bold leading-none',
                        effectiveEntry.status === 'PAGADO' ? 'text-[#9AD588]' : 'text-foreground',
                      )}>
                        {ars(effectiveEntry.amount)}
                      </div>
                      <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-snug">
                        {effectiveEntry.status === 'PAGADO'
                          ? `Pagado · ${MONTH_FULL[effectiveEntry.month]} ${effectiveEntry.year}`
                          : `Pendiente · ${MONTH_FULL[effectiveEntry.month]} ${effectiveEntry.year}`}
                      </p>
                      {effectiveEntry.status === 'POR_COBRAR' && (
                        <div className="space-y-2 mt-4">
                          <Button
                            className="w-full h-8 text-[12.5px] gap-2"
                            onClick={() => effectiveEntry.receipt && handleRegister(effectiveEntry.receipt)}
                          >
                            <CreditCard size={13} />
                            {`Registrar · ${MONTH_SHORT[effectiveEntry.month]}`}
                          </Button>
                          {waUrl && (
                            <Button
                              variant="ghost"
                              className="w-full h-8 text-[12.5px] gap-2 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={13} /> Recordar por WhatsApp
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={cn(
                        'gm-display gm-tnum text-[30px] font-bold leading-none',
                        pendingCount === 0 ? 'text-[#9AD588]' : 'text-foreground',
                      )}>
                        {ars(pendingTotal)}
                      </div>
                      <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-snug">
                        {pendingCount === 0
                          ? 'Sin mensualidades pendientes'
                          : `${pendingCount} mensualidad${pendingCount !== 1 ? 'es' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`}
                      </p>
                      {pendingCount > 0 && (
                        <div className="space-y-2 mt-4">
                          <Button
                            className="w-full h-8 text-[12.5px] gap-2"
                            onClick={() => firstPending && handleRegister(firstPending)}
                          >
                            <CreditCard size={13} />
                            Registrar pago
                          </Button>
                          {waUrl && (
                            <Button
                              variant="ghost"
                              className="w-full h-8 text-[12.5px] gap-2 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={13} /> Recordar por WhatsApp
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>

                <div className="border-t border-border" />

                {/* DATOS DEL ABONO */}
                <section>
                  <h3 className="gm-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Datos del Abono
                  </h3>
                  <dl className="space-y-2.5">
                    <DataRow label="Tipo">{typeLabel}</DataRow>
                    {altaFmt && <DataRow label="Alta">{altaFmt}</DataRow>}
                    <DataRow label="Cocheras">{String(customer.numberOfVehicles || 0)}</DataRow>
                    {(active.credit ?? 0) > 0 && (
                      <DataRow label="Crédito">
                        <span className="gm-tnum text-gm-yellow">{ars(active.credit)}</span>
                      </DataRow>
                    )}
                    {habitualType && (
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-muted-foreground shrink-0">Forma habitual</span>
                        <Badge variant={paymentBadgeVariant(habitualType)} className="text-[10px]">
                          {translatePaymentType(habitualType)}
                        </Badge>
                      </div>
                    )}
                  </dl>
                </section>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel sub-dialog */}
      <Dialog open={openCancelDialog} onOpenChange={v => { if (!v) setOpenCancelDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-destructive/40 bg-destructive/15 text-[#F08775]">
                <Ban size={16} />
              </span>
              <div>
                <DialogTitle>¿Cancelar recibo?</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Se marcará como pendiente y se eliminará de la planilla de caja. Si se pagó con crédito, el monto será reintegrado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCancelDialog(false)}>Volver</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedReceiptId) return;
                const res = await cancelReceiptAction(selectedReceiptId, customer.id);
                if (res.error) toast.error(res.error.message);
                else { toast.success('Recibo cancelado exitosamente'); await refreshReceipts(); }
                setOpenCancelDialog(false);
              }}
            >
              Cancelar Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentTypeReceiptDialog
        open={openPaymentDialog}
        onConfirm={handleConfirmPayment}
        onClose={() => { setOpenPaymentDialog(false); setSelectedReceiptForPayment(null); }}
        receipt={selectedReceiptForPayment ?? undefined}
        customer={customer}
        customerType={customer.customerType}
      />
    </>
  );
}
