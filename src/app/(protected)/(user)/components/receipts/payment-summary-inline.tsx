'use client';

import { useState, Fragment } from 'react';
import { Customer } from '@/types/cutomer.type';
import { Receipt } from '@/types/receipt.type';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PaymentSummaryTable } from './payment-summary-customer-table';
import { Button } from '@/components/ui/button';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Argentina/Buenos_Aires';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function getGarageNumbers(c: Customer): string {
  if (c.customerType === 'RENTER') {
    const nrs = (c.parkingRenters ?? []).filter(v => !v.deletedAt).map(v => v.garageNumber);
    if (nrs.length > 0) return nrs.join(' · ');
  }
  return (c.parkingOwners ?? []).map(v => v.garageNumber).join(' · ') || '—';
}

function getLicensePlate(c: Customer): string | null {
  if (c.customerType === 'RENTER') {
    return (c.parkingRenters ?? [])[0]?.parkingOwner?.licensePlate || null;
  }
  return (c.parkingOwners ?? [])[0]?.licensePlate || null;
}

function getLastPaid(receipts: Receipt[]): string {
  const paid = receipts
    .filter(r => r.status === 'PAID' && r.paymentDate)
    .sort((a, b) => dayjs.tz(b.paymentDate!, TZ).valueOf() - dayjs.tz(a.paymentDate!, TZ).valueOf());
  if (!paid[0]) return '—';
  return dayjs.tz(paid[0].paymentDate!, TZ).format('DD MMM YYYY');
}

function getPendingTotal(receipts: Receipt[]): number {
  return receipts
    .filter(r => r.status === 'PENDING')
    .reduce((s, r) => s + (r.price > 0 ? r.price : r.startAmount), 0);
}

// ── Animated stat cell ────────────────────────────────────────────────────────
function Stat({ label, value, valueClass, delay }: {
  label: string; value: string; valueClass?: string; delay: number;
}) {
  return (
    <div style={{ animation: `gm-rc-stat 440ms cubic-bezier(.2,.7,.3,1) ${delay}ms both` }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className={cn('gm-display text-[17px] font-bold tracking-[0.02em] tabular-nums', valueClass ?? 'text-foreground')}>
        {value}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface PaymentSummaryInlineTableProps {
  customers: Customer[];
  colSpan?: number;
}

export function PaymentSummaryInlineTable({ customers, colSpan = 5 }: PaymentSummaryInlineTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gm-surface-2/60">
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Apellido</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Nombre</th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Cocheras</th>
            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground w-[180px]">Resumen</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => {
            const isOpen = expandedId === customer.id;
            const pending = getPendingTotal(customer.receipts ?? []);
            const lastPaid = getLastPaid(customer.receipts ?? []);
            const garages = getGarageNumbers(customer);
            const plate = getLicensePlate(customer);
            const pendingCount = (customer.receipts ?? []).filter(r => r.status === 'PENDING').length;

            return (
              <Fragment key={customer.id}>
                {/* Main row */}
                <tr className={cn(
                  'border-b border-border/60 transition-colors',
                  isOpen ? 'border-b-0 bg-gm-surface-2/40' : 'hover:bg-gm-surface-2/30',
                )}>
                  <td className="px-4 py-3">
                    <span className="gm-display font-bold text-[13.5px] tracking-[0.02em] uppercase text-foreground">
                      {customer.lastName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-foreground">{customer.firstName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-grid place-items-center h-7 px-2 rounded-md border border-border bg-gm-surface-2 gm-display font-bold text-[12px] text-gm-yellow tabular-nums">
                      {customer.numberOfVehicles}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      aria-expanded={isOpen}
                      className={cn('gm-rc', isOpen && 'open')}
                      onClick={() => toggle(customer.id)}
                    >
                      <span className="gm-rc__ico" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                          <rect className="l l1" x="4" y="6"  width="16" height="2.4" rx="1.2" fill="currentColor" />
                          <rect className="l l2" x="4" y="11" width="16" height="2.4" rx="1.2" fill="currentColor" />
                          <rect className="l l3" x="4" y="16" width="11" height="2.4" rx="1.2" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="gm-rc__lbl">Ver Resumen</span>
                      <span
                        className="gm-rc__chev relative z-[1] grid place-items-center w-[13px] transition-transform duration-300"
                        style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  </td>
                  <td className="px-2 py-3 text-right">
                    {/* placeholder for actions dropdown */}
                    <button className="inline-grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground transition-colors text-[18px] leading-none tracking-widest">
                      ···
                    </button>
                  </td>
                </tr>

                {/* Detail row */}
                {isOpen && (
                  <tr className="border-b border-border">
                    <td colSpan={colSpan} className="p-0">
                      <div className="gm-rc-detail">
                        {plate && (
                          <Stat label="Patente" value={plate} valueClass="gm-mono text-[15px] text-foreground" delay={80} />
                        )}
                        <Stat label="Cocheras" value={garages} delay={plate ? 150 : 80} />
                        <Stat label="Último pago" value={lastPaid} delay={plate ? 220 : 150} />
                        <Stat
                          label="Saldo"
                          value={ars(pending)}
                          valueClass={pending === 0 ? 'text-[#9AD588]' : 'text-[#FF8458]'}
                          delay={plate ? 290 : 220}
                        />
                        <div
                          className="flex gap-2"
                          style={{ animation: `gm-rc-stat 440ms cubic-bezier(.2,.7,.3,1) ${plate ? 360 : 290}ms both` }}
                        >
                          <PaymentSummaryTable customer={customer}>
                            <span className="gm-rc__lbl">Ficha completa</span>
                          </PaymentSummaryTable>
                          {pendingCount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-[34px] border-[#FF8458]/50 text-[#FF8458] hover:bg-[#FF8458]/10 hover:text-[#FF8458] text-[12.5px]"
                            >
                              Cobrar
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
