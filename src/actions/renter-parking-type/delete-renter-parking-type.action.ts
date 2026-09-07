'use server';

import { deleteRenterParkingType as deleteRenterParkingTypeAPI } from '@/services/customers.service';

export async function deleteRenterParkingTypeAction(id: string) {
  try {
    const success = await deleteRenterParkingTypeAPI(id);
    if (!success) {
      return { error: 'Error al eliminar el tipo de estacionamiento' };
    }
    return { success: 'Tipo de estacionamiento eliminado exitosamente' };
  } catch (error) {
    console.log(error);
    return { error: 'Error al eliminar el tipo de estacionamiento' };
  }
}
