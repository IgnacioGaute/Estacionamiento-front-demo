import { ParkingOwner } from "./parking-owner.type";

export type OwnerParkingType = {
    id: string;
    name: string;
    amount: number;
    parkingOwners?: ParkingOwner[];
}
