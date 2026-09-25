
import { OtherPayment } from "./other-payment.type";
import { PaymentHistoryOnAccount, Receipt, ReceiptPayment } from "./receipt.type";
import { TicketRegistrationForDay } from "./ticket-registration-for-day.type";
import { TicketRegistration } from "./ticket-registration.type";

export type BoxList = {
    id: string;
    date: Date;
    totalPrice: number;
    boxNumber: number;
    ticketRegistrations: TicketRegistration[];
    ticketMovements?: { id: string; monto: number; metodo: 'CASH' | 'TRANSFER' | 'MERCADOPAGO'; tipo: 'ANTICIPO' | 'SALDO' | 'AJUSTE' | 'CORTESIA'; fechaHora: string; ticketRegistration: TicketRegistration }[];
    ticketRegistrationForDays: TicketRegistrationForDay[];
    receipts: Receipt[];
    otherPayments: OtherPayment[];
    receiptPayments: ReceiptPayment[];
    paymentHistoryOnAccount: PaymentHistoryOnAccount[]
    // Un turno puede tocar varios días, así que aparece en la planilla de cada uno con la
    // parte del efectivo que cayó en ese día. `turno: null` es el efectivo registrado antes
    // de adoptar la caja por turnos; va en su propia fila para que el total siga cuadrando.
    turnosDelDia?: TurnoDelDia[];
}

export type TurnoDelDia = {
    turnoId: string | null;
    turno: {
        id: string;
        nombre: string;
        estado: 'ABIERTO' | 'CERRADO';
        usuarioApertura: { firstName: string; lastName: string };
    } | null;
    efectivoDelDia: number;
    movimientos: number;
    desde: string;
    hasta: string;
    abarcaOtrosDias: boolean;
}

export interface BoxListResponse {
  message: string;
  data: BoxList;
}