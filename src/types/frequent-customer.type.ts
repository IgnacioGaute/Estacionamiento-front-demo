export type FrequentCustomer = {
  licensePlateNormalized: string;
  licensePlateOriginal: string;
  lastNameCustomer: string | null;
  vehicleType: string;
  visits: number;
  firstVisit: string;
  lastVisit: string;
  avgDaysBetweenVisits: number | null;
  medianDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  mostCommonBracket: string | null;
  totalSpent: number;
};
