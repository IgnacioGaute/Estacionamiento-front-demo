
import { OtherPayment } from "./other-payment.type";
import { PaymentHistoryOnAccount, Receipt, ReceiptPayment } from "./receipt.type";
import { TicketRegistrationForDay } from "./ticket-registration-for-day.type";
import { TicketRegistration } from "./ticket-registration.type";

export type BoxList = {
    resumenCaja?: ResumenCaja;
    id: string;
    date: Date;
    totalPrice: number;
    boxNumber: number;
    ticketRegistrations: TicketRegistration[];
    ticketMovements?: { id: string; monto: number; metodo: 'CASH' | 'TRANSFER' | 'MERCADOPAGO'; medioPagoDetalle?: string; tipo: 'ANTICIPO' | 'SALDO' | 'AJUSTE' | 'CORTESIA'; fechaHora: string; ticketRegistration: TicketRegistration }[];
    ticketRegistrationForDays: TicketRegistrationForDay[];
    receipts: Receipt[];
    otherPayments: OtherPayment[];
    receiptPayments: ReceiptPayment[];
    paymentHistoryOnAccount: PaymentHistoryOnAccount[]
    // Un turno puede tocar varios días, así que aparece en la planilla de cada uno con la
    // parte del efectivo que cayó en ese día. `turno: null` es el efectivo registrado antes
    // de adoptar la caja por turnos; va en su propia fila para que el total siga cuadrando.
    turnosDelDia?: TurnoDelDia[];
    // Cobros a inquilinos del día (cuenta corriente), cada medio en su fila; null si la sección no
    // está habilitada en la playa.
    cobrosInquilinos?: CobroInquilinoDia[] | null;
}

export type ClaveComision = 'qrSaldo' | 'qrDebito' | 'qrCredito' | 'aliasSaldo' | 'aliasDebito' | 'aliasCredito';
export type ComisionesCaja = Record<ClaveComision, number | null>;
export type ConfiguracionComisiones = { conectada: boolean; tasas: ComisionesCaja; referencia: ComisionesCaja };
export type ResumenCaja = {
    criterio: 'PORCENTAJES_ACTUALES';
    efectivo: number;
    totalAntesComisiones: number;
    comisionEstimada: number;
    totalNetoEstimado: number;
    importePendienteComision?: number;
    medios: { metodo: string; etiqueta: string; porcentaje: number | null; bruto: number; comision: number; pendiente?: number; neto: number }[];
};

export type CobroInquilinoDia = {
    id: string;
    medioPagoDetalle?: string;
    // ANULACION: la de un pago o devolución de otro día (las del mismo día no vienen: se compensan).
    tipo: 'PAGO' | 'DEVOLUCION' | 'ANULACION';
    tipoOriginal: 'PAGO' | 'DEVOLUCION' | null;
    metodo: 'CASH' | 'TRANSFER' | 'CHECK' | 'MERCADOPAGO';
    // Positivo: entra. Negativo: sale (devolución, o anulación de un pago).
    monto: number;
    numero: string | null;
    cliente: string;
    aFavor: number;
    hora: string;
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
