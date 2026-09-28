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
    pricingDayTypeBasis: 'ENTRY' | 'EXIT';
    pricingOptions: PricingOptions;
  };
  brackets: TariffBracket[];
};
export type TariffPlan = TariffDraft & { revision: string };
export type TariffMethod = 'STARTED' | 'COMPLETED' | 'PROPORTIONAL' | 'CUSTOM';

