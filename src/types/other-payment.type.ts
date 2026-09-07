import { BoxList } from "./box-list.type";

export const PAYMENT_TYPE = ['EGRESOS', 'INGRESOS'] as const;
export type PaymentType = (typeof PAYMENT_TYPE)[number];

export const PAYMENT_METHOD = ['CASH', 'TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export type OtherPayment = {
    id: string;
    description: string;
    price: number;
    type: PaymentType;
    paymentMethod: PaymentMethod;
    dateNow: Date | null;
    boxList: BoxList;
}