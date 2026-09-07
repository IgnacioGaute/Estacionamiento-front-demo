'use client';
import { useEffect, useState } from 'react';
import { PaymentSummaryTable } from './payment-summary-customer-table';
import { Customer } from '@/types/cutomer.type';
import { useRouter, useSearchParams } from 'next/navigation';

export const PaymentSummaryCell = ({ customer }: { customer: Customer }) => {
  const [autoOpen, setAutoOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const showSummary = searchParams.get('showSummary');
  const lastName = searchParams.get('lastName');

  const shouldOpen =
    showSummary === 'true' &&
    lastName?.toLowerCase() === customer.lastName.toLowerCase();

  useEffect(() => {
    const refreshKey = `refreshed-${customer.id}`;

    if (shouldOpen) {
      const alreadyRefreshed = sessionStorage.getItem(refreshKey);

      if (!alreadyRefreshed) {
        sessionStorage.setItem(refreshKey, 'true');
        router.refresh(); // ⬅️ Hacemos el refresh manualmente
      }

      setAutoOpen(true);

      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('showSummary');
        url.searchParams.delete('lastName');
        window.history.replaceState({}, '', url.toString());

        sessionStorage.removeItem(refreshKey); // limpiamos el flag
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setAutoOpen(false);
    }
  }, [shouldOpen, customer.id, router]);

  if (customer.deletedAt !== null) return null;

  return <PaymentSummaryTable customer={customer} autoOpen={autoOpen} />;
};
