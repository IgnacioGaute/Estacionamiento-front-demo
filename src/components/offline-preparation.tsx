'use client';

import { usePathname } from 'next/navigation';
import { OfflineConsultation } from '@/components/offline-consultation';
import { useTenant } from '@/components/tenant-provider';

export function OfflinePreparation() {
  const pathname = usePathname();
  // La contingencia sin conexión cobra salidas con tarifas: en una playa gratuita no se prepara.
  const { cobroHabilitado } = useTenant();

  // Tickets refreshes its own snapshot after each registration change.
  if (pathname === '/tickets' || !cobroHabilitado) return null;

  return <div className="flex justify-end px-4 pt-2 sm:px-6"><OfflineConsultation /></div>;
}
