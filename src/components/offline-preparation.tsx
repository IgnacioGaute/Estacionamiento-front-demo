'use client';

import { usePathname } from 'next/navigation';
import { OfflineConsultation } from '@/components/offline-consultation';

export function OfflinePreparation() {
  const pathname = usePathname();

  // Tickets refreshes its own snapshot after each registration change.
  if (pathname === '/tickets') return null;

  return <div className="flex justify-end px-4 pt-2 sm:px-6"><OfflineConsultation /></div>;
}
