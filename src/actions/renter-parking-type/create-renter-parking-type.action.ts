'use server';

import { renterParkingTypeSchema, RenterParkingTypeSchemaType } from '@/schemas/renter-parking-type.schema';
import { createRenterParkingType as createRenterParkingTypeAPI } from '@/services/customers.service'
import { CustomerError, handleCustomerError } from '../customers/customer.utility';

export async function createRenterParkingTypeAction(values: RenterParkingTypeSchemaType) {
  const validatedFields = renterParkingTypeSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  try {
    const parking = await createRenterParkingTypeAPI(validatedFields.data);

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
