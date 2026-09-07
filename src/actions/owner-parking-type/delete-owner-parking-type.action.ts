'use server';

import { deleteOwnerParkingType as deleteOwnerParkingTypeAPI } from '@/services/customers.service';

export async function deleteOwnerParkingTypeAction(id: string) {
  try {
    const success = await deleteOwnerParkingTypeAPI(id);
    if (!success) {
      return { error: 'Error al eliminar el tipo de estacionamiento' };
    }
    return { success: 'Tipo de estacionamiento eliminado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar el tipo de estacionamiento' };
  }
}
