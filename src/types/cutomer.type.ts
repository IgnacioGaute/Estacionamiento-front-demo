import { PaymentStatusType, Receipt } from "./receipt.type";
import { ParkingRenter } from "./parking-renter.type";
import { ParkingOwner } from "./parking-owner.type";


export const CUSTOMER_TYPE = ['OWNER', 'RENTER', 'PRIVATE'] as const;
export type CustomerType = (typeof CUSTOMER_TYPE)[number];



export type Customer = {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    comments: string;
    customerNumber: number;
    numberOfVehicles: number;
    startDate: string | null;
    previusStartDate: string | null;
    customerType: CustomerType;
    hasDebt: boolean;
    monthsDebt?: {
      month: string;
      amount: number;
      status?: PaymentStatusType;
    }[];
    credit: number;
    deletedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    receipts: Receipt[];
    parkingOwners: ParkingOwner[];
    parkingRenters: ParkingRenter[];
}
