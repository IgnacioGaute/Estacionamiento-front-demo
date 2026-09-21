export type PricingDayType = 'DAY' | 'NIGHT';
export interface PricingOptions {
  charging: { enabled: boolean; mode: 'STARTED' | 'COMPLETED' | 'PROPORTIONAL'; unitMinutes: number; rates: { vehicleType: string; dayPrice: number; nightPrice: number }[] };
  stay: { enabled: boolean; freeMinutes: number; minimumMinutes: number; capEnabled: boolean; capMinutes: number; caps: { vehicleType: string; amount: number }[] };
  crossing: { enabled: boolean; mode: 'ENTRY' | 'EXIT' | 'SPLIT' };
}
export interface PricingLine {
  label: string;
  amount: number;
  minutes?: number;
  dayType?: PricingDayType;
  units?: number;
  unitPrice?: number;
  startAt?: string;
  endAt?: string;
}
export const defaultPricingOptions = (): PricingOptions => ({
  charging: { enabled: false, mode: 'STARTED', unitMinutes: 60, rates: [] },
  stay: { enabled: false, freeMinutes: 0, minimumMinutes: 0, capEnabled: false, capMinutes: 1440, caps: [] },
  crossing: { enabled: false, mode: 'EXIT' },
});

export type PricingPreviewResult = { price: number; label: string; usedFallback: boolean; elapsedMinutes: number; billableMinutes: number; breakdown: PricingLine[]; pricingDayTypeBasis: 'ENTRY' | 'EXIT' | 'SPLIT'; ticketDayType: 'DAY' | 'NIGHT' | 'MIXED' };
