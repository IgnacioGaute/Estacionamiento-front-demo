import { Customer } from "./cutomer.type";
import { OwnerParkingType } from "./owner-parking-type";
import { ParkingRenter } from "./parking-renter.type";

export type ParkingOwner = {
    id: string;
    licensePlate: string;
    garageNumber: string;
    rent: boolean;
    rentActive: boolean;
    amount: number;
    amountRenter: number;
    parkingType: OwnerParkingType;
    customer: Customer;
    parkingRenters: ParkingRenter[];
}
