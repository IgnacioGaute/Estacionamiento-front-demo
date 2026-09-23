export type ReceiptDeliverySettings = {
  whatsapp: boolean;
  qr: boolean;
  print: boolean;
  paperWidth: 58 | 80;
};
export const defaultReceiptDelivery: ReceiptDeliverySettings = {
  whatsapp: false, qr: false, print: false, paperWidth: 80,
};
export type ParkingReceiptSnapshot = {
  kind: 'ENTRY' | 'EXIT';
  parkingName: string;
  address: string | null;
  plate: string;
  vehicleType: string;
  entryDay: string | null;
  entryTime: string | null;
  departureDay: string | null;
  departureTime: string | null;
  total: number | null;
  collected: number | null;
};
export type IssuedParkingReceipt = {
  phoneCustomer: string | null;
  token: string;
  snapshot: ParkingReceiptSnapshot;
  settings: ReceiptDeliverySettings;
};
