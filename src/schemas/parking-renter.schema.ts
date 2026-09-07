import { z } from 'zod';

export const parkingRenterSchema = z.object({
  id: z.string().optional(),
  garageNumber: z.string().max(50, 'Máximo 50 caracteres').optional(),
  licensePlate: z.string().max(50, 'Máximo 50 caracteres').optional(),
  amount: z.coerce.number().optional(),
  // Id de un ParkingOwner real, o el nombre de un RenterParkingType elegido
  // (caso "dueño sin spot real").
  owner: z.string().optional()
});



export type ParkingRenterSchemaType = z.infer<typeof parkingRenterSchema>;


export const updateParkingRenterSchema = z.object({
  id: z.string().optional(),
  garageNumber: z.string().max(50, 'Máximo 50 caracteres').optional(),
  licensePlate: z.string().max(50, 'Máximo 50 caracteres').optional(),
  amount: z.coerce.number().optional(),
  owner: z.string().optional()
  });
export type UpdateParkingRenterSchemaType = z.infer<typeof updateParkingRenterSchema>;
