import { PAYMENT_METHOD, PAYMENT_TYPE } from '@/types/other-payment.type';
import { z } from 'zod';

export const otherPaymentSchema = z.object({
    description: z.string().min(2, 'La descripcion debe tener al menos 2 caracteres'),
    price: z.coerce.number().positive('Este campo es requerido'),
    type: z.enum(PAYMENT_TYPE),
    paymentMethod: z.enum(PAYMENT_METHOD),

});
export type OtherPaymentSchemaType = z.infer<typeof otherPaymentSchema>;

export const updateOtherPaymentSchema = z.object({
    description: z.string().min(2, 'La descripcion debe tener al menos 2 caracteres'),
    price: z.coerce.number().positive('Este campo es requerido'),
    type: z.enum(PAYMENT_TYPE),
    paymentMethod: z.enum(PAYMENT_METHOD),
});
export type updateOtherPaymentSchemaType = z.infer<typeof updateOtherPaymentSchema>;

export const deleteOtherPaymentSchema = z.object({
  confirmation: z.string().min(0, 'Ingrese la confirmación "Eliminar Gasto"'),
});
export type DeleteOtherPaymentSchemaType = z.infer<typeof deleteOtherPaymentSchema>;