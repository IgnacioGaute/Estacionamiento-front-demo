import { Customer } from "./cutomer.type";
import { ParkingOwner } from "./parking-owner.type";
import { RenterParkingType } from "./renter-parking-type";

export type ParkingRenter = {
    id: string;
    garageNumber: string;
    licensePlate?: string;
    amount: number;
    // Id de un ParkingOwner real, o el nombre de un RenterParkingType (caso
    // "dueño sin spot real" — ver renter-parking-type.ts).
    owner: string;
    parkingOwner?: ParkingOwner;
    parkingType?: RenterParkingType;
    customer: Customer;
    deletedAt: Date;
 }
