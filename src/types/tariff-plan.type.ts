import type { PricingOptions } from './pricing-options.type';

export type TariffBracket = {
  id?: string;
  vehicleType: string;
  ticketDayType: 'DAY' | 'NIGHT' | null;
  label: string;
  uptoMinutes: number | null;
  price: number;
  recurringUnitMinutes: number | null;
  recurringPriceMode?: 'FIXED' | 'DERIVED';
};
export type TariffDraft = {
  schedule: {
    dayStartHour: number;
    dayEndHour: number;
    graceMinutes: number;
    // El auto que se va antes de la tolerancia no paga. Ausente en un backend anterior: activo.
    sinCobroEnTolerancia?: boolean;
    pricingDayTypeBasis: 'ENTRY' | 'EXIT';
    pricingOptions: PricingOptions;
  };
  brackets: TariffBracket[];
};
// activeStays: vehículos adentro, para ofrecer pasarlos a la tarifa nueva al aplicar.
// estadiasActualizadas: cuántos pasaron en el último guardado.
export type TariffPlan = TariffDraft & { revision: string; activeStays?: number; estadiasActualizadas?: number };
export type TariffMethod = 'STARTED' | 'COMPLETED' | 'PROPORTIONAL' | 'CUSTOM';

