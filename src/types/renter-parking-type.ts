import { ParkingRenter } from "./parking-renter.type";

// Además de catálogo de precios, cumple el rol de "dueño manual" (inquilino sin
// ParkingOwner real como dueño): su `name` es el mismo valor que se guarda en
// ParkingRenter.owner para ese caso.
export type RenterParkingType = {
    id: string;
    name: string;
    amount: number;
    parkingRenters?: ParkingRenter[];
}
