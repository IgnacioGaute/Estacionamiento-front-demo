export type RevenueSummaryResponse = {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  series: { bucket: string; total: number }[];
};

export type OtherPaymentsSummaryResponse = {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  byType: { type: string; total: number; count: number }[];
  series: { bucket: string; ingresos: number; egresos: number }[];
};

export type ReceiptsSummaryResponse = {
  from: string;
  to: string;
  byStatus: { status: string; count: number; total: number }[];
  byPaymentType: { paymentType: string | null; count: number; total: number }[];
};

export type TicketRegistrationsSummaryResponse = {
  from: string;
  to: string;
  byVehicleType: { vehicleType: string | null; count: number; total: number }[];
};

export type TicketRegistrationForDaysSummaryResponse = {
  from: string;
  to: string;
  byVehicleTypeAndTimeType: {
    vehicleType: string;
    ticketTimeType: string | null;
    count: number;
    total: number;
  }[];
};

export type ParkingOccupancySummaryResponse = {
  offered: number;
  rented: number;
  available: number;
};

export type CustomersSummaryResponse = {
  from: string;
  to: string;
  byCustomerType: { customerType: 'OWNER' | 'RENTER' | 'PRIVATE'; count: number }[];
};

export type HourlyActivityResponse = {
  date: string;
  hours: { hour: number; entries: number; exits: number; count: number }[];
  peakEntry: { hour: number; count: number; time: string } | null;
  peakExit: { hour: number; count: number; time: string } | null;
};
