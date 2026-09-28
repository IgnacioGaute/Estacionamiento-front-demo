import { CUSTOMER_TYPE } from '@/types/cutomer.type';
import { z } from 'zod';
import { parkingOwnerSchema } from './parking-owner.schema';
import { parkingRenterSchema } from './parking-renter.schema';

export const customerSchema = z.object({
  firstName: z.string().max(50, 'Máximo 50 caracteres'),
  lastName: z.string().max(50, 'Máximo 50 caracteres'),
  phone: z.string().max(50, 'Máximo 50 caracteres'),
  comments: z.string().max(650, 'Máximo 650 caracteres').optional(),
  customerNumber: z.coerce.number().optional(),
  numberOfVehicles: z.coerce.number().min(1, 'Debe tener al menos un vehículo'),
  customerType: z.enum(CUSTOMER_TYPE),
  hasDebt:z.boolean().optional().default(false),
  monthsDebt: z.array(
  z.object({
    month: z.string(), // formato: YYYY-MM
    amount: z.number().min(0, "El monto debe ser mayor o igual a 0")
  })
).optional(),
  parkingOwners: z.array(parkingOwnerSchema).optional(),
  parkingRenters: z.array(parkingRenterSchema).optional(),
  credit: z.number().min(0).default(0),
  // Sólo inquilinos: cómo está su cuenta corriente al darlo de alta.
  saldoInicial: z
    .object({
      tipo: z.enum(['AL_DIA', 'DEUDA', 'A_FAVOR']),
      modo: z.enum(['TOTAL', 'POR_MES']).optional(),
      importe: z.number().int().positive().optional(),
      fecha: z.string().optional(),
      meses: z.array(z.object({ mes: z.string(), importe: z.number().int().positive() })).optional(),
      nota: z.string().max(255).optional(),
    })
    .optional(),
});



export type CustomerSchemaType = z.infer<typeof customerSchema>;


export const updateCustomerSchema = z.object({
  firstName: z.string().max(50, 'Máximo 50 caracteres'),
  lastName: z.string().max(50, 'Máximo 50 caracteres'),
  phone: z.string().max(50, 'Máximo 50 caracteres'),
  comments: z.string().max(650, 'Máximo 650 caracteres').optional(),
  customerNumber: z.coerce.number().optional(),
  numberOfVehicles: z.coerce.number().min(1, 'Debe tener al menos un vehículo'),
  customerType: z.enum(CUSTOMER_TYPE),
  hasDebt: z.boolean().optional(),
  monthsDebt: z.array(
  z.object({
    month: z.string(), // formato: YYYY-MM
    amount: z.number().min(0, "El monto debe ser mayor o igual a 0")
  })
),
  parkingOwners: z.array(parkingOwnerSchema).optional(),
  parkingRenters: z.array(parkingRenterSchema).optional(),
  credit: z.number().min(0).default(0),
  });
  export type UpdateCustomerSchemaType = z.infer<typeof updateCustomerSchema>;

export const deleteCustomerSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Cliente"'),
});
export type DeleteCustomerSchemaType = z.infer<typeof deleteCustomerSchema>;

export const restoredCustomerSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Restaurar Cliente"'),
});
export type RestoredCustomerSchemaType = z.infer<typeof restoredCustomerSchema>;
