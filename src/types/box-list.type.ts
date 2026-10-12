
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
    ticketMovements?: { id: string; monto: number; metodo: 'CASH' | 'TRANSFER' | 'MERCADOPAGO'; medioPagoDetalle?: string; comisionPagoEstimada?: DetalleComisionPago; tipo: 'ANTICIPO' | 'SALDO' | 'AJUSTE' | 'CORTESIA' | 'DESCUENTO'; operador?: string | null; motivo?: string | null; fechaHora: string; ticketRegistration: TicketRegistration }[];
    ticketRegistrationForDays: TicketRegistrationForDay[];
    receipts: Receipt[];
    otherPayments: OtherPayment[];
    receiptPayments: ReceiptPayment[];
    paymentHistoryOnAccount: PaymentHistoryOnAccount[]
    // Turnos de la fecha elegida: abiertos primero, luego cierres del más reciente al más
    // antiguo. Los turnos históricos sin fecha operativa pertenecen al día de apertura.
    // `turno: null` agrupa el efectivo del día registrado sin turno asignado.
    turnosDelDia?: TurnoDelDia[];
    salidasDelDia?: { id: string; identificacion: string; hora: string; operador: string | null }[];
    // Cobros a inquilinos del día (cuenta corriente), cada medio en su fila; null si la sección no
    // está habilitada en la playa.
    cobrosInquilinos?: CobroInquilinoDia[] | null;
}

export type ClaveComision = 'qrSaldo' | 'qrDebito' | 'qrCredito' | 'aliasSaldo' | 'aliasDebito' | 'aliasCredito';
export type DetalleComisionPago = { bruto: number; porcentaje: number | null; comision: number | null; neto: number; pendiente: boolean };
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
    comisionPagoEstimada?: DetalleComisionPago;
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
    operador?: string | null;
}

export type TurnoDelDia = {
    turnoId: string | null;
    turno: import('./turno.type').Turno | null;
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
