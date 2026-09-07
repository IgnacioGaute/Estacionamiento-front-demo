'use server';

import { UpdateOwnerParkingTypeSchemaType } from '@/schemas/owner-parking-type.schema';
import { updateOwnerParkingType as updateOwnerParkingTypeAPI } from '@/services/customers.service'

export async function updateOwnerParkingTypeAction(
  id: string,
  values: Partial<UpdateOwnerParkingTypeSchemaType>,
) {
  try {
    const success = await updateOwnerParkingTypeAPI(id, values);
    if (!success) {
      return { error: 'Error al editar el tipo de estacionamiento' };
    }
    return { success: 'Tipo de estacionamiento editado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al editar el tipo de estacionamiento' };
  }
}
