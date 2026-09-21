'use client';

import { useState } from 'react';
import { JellyRadio } from '@/components/ui/jelly-radio';

/**
 * La página es un server component, así que el segmentado vive acá con su estado y recibe las
 * dos tablas ya renderizadas desde el servidor.
 */
export function ParkingTypeTabs({
  duenos,
  inquilinos,
}: {
  duenos: React.ReactNode;
  inquilinos: React.ReactNode;
}) {
  const [tab, setTab] = useState<'owners' | 'renters'>('owners');

  return (
    <div className="mt-6">
      <div data-tour="parking-type-tabs">
        <JellyRadio
          aria-label="Tipos de estacionamiento"
          value={tab}
          onChange={(v) => setTab(v as 'owners' | 'renters')}
          items={[
            { value: 'owners', label: 'Dueños' },
            { value: 'renters', label: 'Inquilinos' },
          ]}
        />
      </div>
      <div className="mt-4">{tab === 'owners' ? duenos : inquilinos}</div>
    </div>
  );
}
