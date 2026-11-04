'use client';

import { DataLoading } from '@/components/ui/data-loading';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import type { ticketPrice } from '@/types/ticket-price';
import { TariffPasses } from '../admin/tarifas/tariff-passes';

// Los pases por día, semana o mes, con los mismos diálogos que en Tarifas.
export function PasesConfiguracion({ precios }: { precios: ticketPrice[] }) {
  const { types, loading, error } = useVehicleTypes();
  if (loading && !types.length) return <DataLoading label="Cargando vehículos…" />;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  return <TariffPasses prices={precios} vehicles={types} enConfiguracionInicial />;
}
