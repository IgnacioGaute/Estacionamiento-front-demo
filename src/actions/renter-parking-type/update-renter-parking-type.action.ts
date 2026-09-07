'use server';

import { UpdateRenterParkingTypeSchemaType } from '@/schemas/renter-parking-type.schema';
import { updateRenterParkingType as updateRenterParkingTypeAPI } from '@/services/customers.service'

export async function updateRenterParkingTypeAction(
  id: string,
  values: Partial<UpdateRenterParkingTypeSchemaType>,
) {
  try {
    const success = await updateRenterParkingTypeAPI(id, values);
    if (!success) {
      return { error: 'Error al editar el tipo de estacionamiento' };
    }
    return { success: 'Tipo de estacionamiento editado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al editar el tipo de estacionamiento' };
  }
}
