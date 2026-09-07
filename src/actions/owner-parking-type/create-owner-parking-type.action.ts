'use server';

import { ownerParkingTypeSchema, OwnerParkingTypeSchemaType } from '@/schemas/owner-parking-type.schema';
import { createOwnerParkingType as createOwnerParkingTypeAPI } from '@/services/customers.service'
import { CustomerError, handleCustomerError } from '../customers/customer.utility';

export async function createOwnerParkingTypeAction(values: OwnerParkingTypeSchemaType) {
  const validatedFields = ownerParkingTypeSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const parking = await createOwnerParkingTypeAPI(validatedFields.data);

    if (!parking) {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Error inesperado en el servidor.',
        },
      };
    }
    if ('error' in parking) {
      return { error: handleCustomerError(parking.error as CustomerError) };
    }

    return { success: 'Tipo de estacionamiento creado exitosamente' };
  } catch (error) {
    console.error(error);
    return { error: 'Error al crear el tipo de estacionamiento' };
  }
}
