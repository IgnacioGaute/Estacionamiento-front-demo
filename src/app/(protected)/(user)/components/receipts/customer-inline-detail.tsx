'use client';

import { Customer } from '@/types/cutomer.type';
import { Receipt } from '@/types/receipt.type';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PaymentSummaryTable } from './payment-summary-customer-table';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Argentina/Buenos_Aires';

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

function getGarageNumbers(c: Customer): string {
  if (c.customerType === 'RENTER' || c.customerType === 'PRIVATE') {
    const nrs = (c.parkingRenters ?? [])
      .filter((v) => !v.deletedAt)
      .map((v) => v.garageNumber);
    if (nrs.length > 0) return nrs.join(' · ');
  }
  const nrs = (c.parkingOwners ?? []).map((v) => v.garageNumber).filter(Boolean);
  return nrs.length > 0 ? nrs.join(' · ') : '—';
}

function getLastPaid(receipts: Receipt[]): string {
  const paid = receipts
    .filter((r) => r.status === 'PAID' && r.paymentDate)
    .sort(
      (a, b) =>
        dayjs.tz(b.paymentDate!, TZ).valueOf() -
        dayjs.tz(a.paymentDate!, TZ).valueOf(),
    );
  if (!paid[0]) return '—';
  return dayjs.tz(paid[0].paymentDate!, TZ).format('DD MMM YYYY');
}

function getPendingTotal(receipts: Receipt[]): number {
  return receipts
    .filter((r) => r.status === 'PENDING')
    .reduce((s, r) => s + (r.price > 0 ? r.price : r.startAmount), 0);
}

function StatCell({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div style={{ animation: `gm-rc-stat 440ms cubic-bezier(.2,.7,.3,1) ${delay}ms both` }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="gm-display text-[17px] font-bold tracking-[0.02em] tabular-nums text-foreground">
        {children}
      </div>
    </div>
  );
}

export function CustomerInlineDetail({ customer }: { customer: Customer }) {
  const receipts = customer.receipts ?? [];
  const pending = getPendingTotal(receipts);
  const lastPaid = getLastPaid(receipts);
  const garages = getGarageNumbers(customer);

  return (
    <div className="gm-rc-detail">
      <StatCell label="Cocheras" delay={80}>
        {garages}
      </StatCell>

      <StatCell label="Último pago" delay={150}>
        {lastPaid}
      </StatCell>

      <StatCell label="Saldo a pagar" delay={220}>
        <span className={pending === 0 ? 'text-[#9AD588]' : 'text-[#FF8458]'}>
          {ars(pending)}
        </span>
      </StatCell>

      <div
        className="flex gap-2 items-center"
        style={{ animation: `gm-rc-stat 440ms cubic-bezier(.2,.7,.3,1) 290ms both` }}
      >
        <PaymentSummaryTable customer={customer}>Ficha completa</PaymentSummaryTable>
      </div>
    </div>
  );
}
