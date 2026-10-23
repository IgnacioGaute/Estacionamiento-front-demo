'use client';

import { usePathname } from 'next/navigation';
import { OfflineConsultation } from '@/components/offline-consultation';
import { useIsMobile } from '@/hooks/use-mobile';

// En la computadora va arriba, a la derecha; en el celular, al final de la pantalla, para no
// empujar el contenido. Se monta una sola de las dos: cada una prepara la copia sin conexión y
// montadas a la vez pedirían los datos dos veces.
export function OfflinePreparation({ lugar }: { lugar: 'arriba' | 'abajo' }) {
  const pathname = usePathname();
  const movil = useIsMobile();
  // Tickets refreshes its own snapshot after each registration change.
  if (pathname === '/tickets') return null;
  if (movil === undefined || (lugar === 'abajo') !== movil) return null;

  return lugar === 'arriba'
    ? <div className="flex justify-end px-4 pt-2 sm:px-6"><OfflineConsultation /></div>
    : <div className="flex justify-center px-4 pb-8 pt-4"><OfflineConsultation /></div>;
}
