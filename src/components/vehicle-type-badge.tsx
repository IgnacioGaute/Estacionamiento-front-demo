'use client';

import { createContext, useContext } from 'react';
import { Bike, Bus, CarFront, Tag, Truck } from 'lucide-react';
import type { VehicleTypeItem } from '@/actions/tickets/vehicle-types.action';
import { cn } from '@/lib/utils';

// El catálogo se comparte entre todas las tarjetas, incluso para tipos ya desactivados.
export const VehicleTypeLabelsContext = createContext<VehicleTypeItem[]>([]);

export function VehicleTypeBadge({ code, className }: { code?: string | null; className?: string }) {
  const types = useContext(VehicleTypeLabelsContext);
  const value = code?.trim();
  if (!value) return null;
  const fallback = value.replace(/_/g, ' ').toLocaleLowerCase('es-AR');
  const name = types.find(t => t.code === value)?.name ?? fallback.charAt(0).toLocaleUpperCase('es-AR') + fallback.slice(1);
  const category = value.toUpperCase();
  const Icon = /MOTO|BICI/.test(category) ? Bike : /CAMION|UTILITARIO|TRUCK/.test(category) ? Truck : /BUS|OMNIBUS/.test(category) ? Bus : category === 'AUTO' ? CarFront : Tag;
  return <span title={name} className={cn('inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-md border border-gm-line-strong bg-gm-surface-3 px-2 py-1 text-[11px] font-semibold leading-none text-foreground/80', className)}>
    <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    <span className="sr-only">Tipo de vehículo: </span><span className="min-w-0 break-words leading-tight">{name}</span>
  </span>;
}
