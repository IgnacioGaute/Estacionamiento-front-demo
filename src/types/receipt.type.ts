import { BoxList } from "./box-list.type";
import { Customer } from "./cutomer.type";

export const PAYMENT_STATUS_TYPE = ['PENDING', 'PAID'] as const;
export type PaymentStatusType = (typeof PAYMENT_STATUS_TYPE)[number];

export const PAYMENT_TYPE = ['TRANSFER', 'CASH', 'CHECK', 'MIX', 'CREDIT', 'TP', 'FIX'] as const;
export type PaymentType = (typeof PAYMENT_TYPE)[number];

export type Receipt = {
    id: string;
    status: PaymentStatusType;
    paymentType: PaymentType;
    receiptNumber: string;
    price: number;
    startAmount: number;
    lastInterestApplied: Date | null; 
    interestPercentage: number;
    paymentDate: string | null;
    barcode: string | null;
    receiptTypeKey: string;
    startDate: string | null;
    dateNow: string | null;
    boxList: BoxList;
    payments: ReceiptPayment[];
    paymentHistoryOnAccount: PaymentHistoryOnAccount[];
    customer: Customer;
    deletedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type ScannerReceipt ={
    paymentType: PaymentType
    codeBar: string;
}

export type ReceiptPayment ={
  id?: string;
  cuentaMovimientoId?: string | null;
  operatorName?: string | null;
  paymentType: PaymentType;
  price: number;
  paymentDate: string | null;
  receipt: Receipt;
  boxList: BoxList;
  numberInBox: number;
}

export type PaymentHistoryOnAccount ={
  id?: string;
  operatorName?: string | null;
  paymentType: PaymentType;
  price: number;
  paymentDate: string | null;
  receipt: Receipt;
  boxList: BoxList;
  numberInBox: number;
}