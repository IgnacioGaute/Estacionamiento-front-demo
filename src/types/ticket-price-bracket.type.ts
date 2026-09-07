import { TicketDayType, VehicleType } from './ticket-price';

export type TicketPriceBracket = {
  id: string;
  vehicleType: VehicleType;
  ticketDayType: TicketDayType | null;
  label: string;
  uptoMinutes: number | null;
  price: number;
  recurringUnitMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};
