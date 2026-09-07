import { z } from 'zod';

export const parkingOwnerSchema = z.object({
  id: z.string().optional(),
  rent: z.boolean().optional(),
  garageNumber: z.string().max(50, 'Máximo 50 caracteres').optional(),
  amount: z.coerce.number().optional(),
  ownerParkingTypeId: z.string().optional(),
  amountRenter: z.coerce.number().optional(),
});



export type ParkingOwnerSchemaType = z.infer<typeof parkingOwnerSchema>;


export const updateParkingOwnerSchema = z.object({
    id: z.string().optional(),
    rent: z.boolean().optional(),
    garageNumber: z.string().max(50, 'Máximo 50 caracteres').optional(),
    amount: z.coerce.number().optional(),
    ownerParkingTypeId: z.string().optional(),
    amountRenter: z.coerce.number().optional(),
  });
export type UpdateParkingOwnerSchemaType = z.infer<typeof updateParkingOwnerSchema>;
