// Cuenta corriente de inquilinos: lo que devuelve /cuentas en el backend.
//
// Vocabulario (revisado con un contador): el ABONO MENSUAL es el precio de las cocheras; un
// CARGO es lo que se agrega a la cuenta por un período («Abono de octubre»); un PAGO es plata
// recibida y su RECIBO DE PAGO el comprobante que se entrega; el SALDO PENDIENTE es lo que falta
// pagar y el SALDO A FAVOR, crédito para próximos cargos. En la base, los cargos siguen siendo
// `receipts`: por eso algunos campos conservan el nombre viejo.

// Los medios que se eligen a mano al cobrar o devolver.
export type MetodoCobro = 'CASH' | 'TRANSFER';
export type TipoMovimiento = 'SALDO_INICIAL' | 'CARGO' | 'PAGO' | 'AJUSTE' | 'ANULACION' | 'DEVOLUCION';
export type TipoCargo = 'ABONO' | 'RECARGO' | 'SALDO_INICIAL';

// Lo pendiente no vencido, y lo vencido según cuántos días pasaron desde su vencimiento.
export type Tramo = 'PENDIENTE' | 'VENCIDO_30' | 'VENCIDO_60' | 'VENCIDO_MAS';
export type EstadoInquilino = 'AL_DIA' | 'A_FAVOR' | 'PENDIENTE' | 'VENCIDO';

export type InquilinoResumen = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  cocheras: string[];
  patentes: string[];
  abono: number;
  // Día (AAAA-MM-DD) en que se dio de baja; null si sigue alquilando.
  baja: string | null;
  // Positivo: saldo pendiente. Negativo: saldo a favor.
  saldo: number;
  vencido: number;
  vencidoDesde: string | null;
  estado: EstadoInquilino;
  tramo: Tramo | null;
  cargosPendientes: number;
  ultimoPago: { fecha: string; importe: number } | null;
};

export type ResumenCuentas = {
  kpis: {
    activos: number;
    bajas: number;
    conSaldo: number;
    conVencido: number;
    saldoPendiente: number;
    deudaVencida: number;
    aFavorTotal: number;
    // Todo lo recibido en el mes, sea del período que sea.
    cobradoMes: number;
    // Los cargos de abono del mes: cuánto se cargó y cuánto falta saldar.
    abonoMes: { cargado: number; pendiente: number; cantidad: number };
    abonoMensual: number;
    anulacionesMes: number;
  };
  inquilinos: InquilinoResumen[];
};

// Si se puede anular y, si no, por qué (la misma regla que aplica el backend al anular).
export type Anulable = { ok: boolean; code?: string; motivo?: string };

export type MovimientoCuenta = {
  id: string;
  fecha: string;
  creado: string;
  tipo: TipoMovimiento;
  concepto: string;
  debe: number;
  haber: number;
  saldo: number;
  // Saldo acumulado sin los anulados ni sus anulaciones: lo que se muestra por defecto.
  saldoSinAnulados: number;
  metodo: MedioRegistrado | null;
  numero: string | null;
  motivo: string | null;
  receiptId: string | null;
  anulado: boolean;
  anulaId: string | null;
  usuario: string | null;
  migrado: boolean;
  anulable: Anulable;
};

// Un cargo de la cuenta. Lo aplicado se separa: plata recibida, descuentos (bonificaciones) y
// saldo a favor usado. «Saldado» cuando no queda nada por pagar, por la vía que sea.
export type CargoCuenta = {
  id: string;
  numero: string | null;
  concepto: string;
  tipoCargo: TipoCargo | null;
  periodo: string | null;
  fecha: string;
  vencimiento: string;
  vencido: boolean;
  total: number;
  pagado: number;
  bonificado: number;
  aFavorAplicado: number;
  saldo: number;
  estado: 'PENDING' | 'PAID';
  situacion: 'SALDADO' | 'PARCIAL' | 'PENDIENTE';
  // El asiento que creó el cargo: anular el cargo es anular ese asiento.
  origen: { id: string; importe: number; anulable: Anulable } | null;
  pagos: { fecha: string | null; tipo: string; importe: number; cuentaMovimientoId: string | null }[];
};

export type PagoCuenta = {
  id: string;
  numero: string | null;
  fecha: string;
  total: number;
  medios: { metodo: MedioRegistrado | null; importe: number }[];
  anulado: boolean;
  usuario: string | null;
  nota: string | null;
  migrado: boolean;
  // Cómo quedaron la cuenta y cada cargo al cobrar; null/ausente en cobros migrados.
  saldoDespues: number | null;
  imputaciones: { receiptId: string; aplicado: number; resta?: number }[];
  anulable: Anulable;
};

export type EstadoCuenta = {
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string | null;
    comentarios: string | null;
    alta: string;
    baja: string | null;
    abono: number;
    cocheras: { numero: string | null; duenio: string | null; importe: number }[];
  };
  saldo: number;
  vencido: number;
  antiguedad: Record<Tramo, number>;
  // Primer mes sin abono cargado: desde ahí rige un cambio en el importe de las cocheras.
  proximoAbono: string;
  tieneSaldoInicial: boolean;
  recibos: CargoCuenta[];
  movimientos: MovimientoCuenta[];
  comprobantes: PagoCuenta[];
};

// Los medios que puede mostrar un pago ya registrado: además de los que se eligen a mano, el
// cheque de la historia y MercadoPago, que se acredita solo con el QR.
export type MedioRegistrado = MetodoCobro | 'CHECK' | 'MERCADOPAGO';

export type ResultadoPago = {
  // El asiento que representa al pago: con él se emite su recibo entregable.
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  total: number;
  medios: { metodo: MedioRegistrado; importe: number }[];
  imputaciones: { receiptId: string; concepto: string; aplicado: number; saldoRecibo: number }[];
  aFavor: number;
  saldoAnterior: number;
  saldo: number;
  nota: string | null;
  // true si era el reintento de un cobro ya registrado: no se cobró de nuevo.
  repetido?: boolean;
};

export type PlanAbonos = {
  mes: string;
  vencimientoDia: number;
  vencimiento: string;
  total: number;
  aCargar: { id: string; nombre: string; cocheras: string[]; importe: number }[];
  yaCargados: { id: string; nombre: string }[];
  sinCargar: { id: string; nombre: string; motivo: string }[];
};

export type ResultadoAbonos = {
  mes: string;
  vencimiento: string;
  cargados: number;
  total: number;
  yaCargados: { id: string; nombre: string }[];
  sinCargar: { id: string; nombre: string; motivo: string }[];
  detalle: string;
};

export type Anulacion = {
  id: string;
  creado: string;
  inquilino: { id: string; nombre: string };
  tipo: TipoMovimiento;
  concepto: string;
  fechaOriginal: string;
  medios: MedioRegistrado[];
  // Cómo cambió la cuenta: negativo si bajó la deuda, positivo si volvió deuda.
  efecto: number;
  motivo: string | null;
  usuario: string | null;
};

export type ListadoAnulaciones = {
  mes: string;
  lista: Anulacion[];
  totales: { cantidad: number; deudaAnulada: number; pagosAnulados: number };
};

export type SaldoInicial = {
  tipo: 'AL_DIA' | 'DEUDA' | 'A_FAVOR';
  modo?: 'TOTAL' | 'POR_MES';
  importe?: number;
  fecha?: string;
  meses?: { mes: string; importe: number }[];
  nota?: string;
};

// Los medios que se ofrecen al cobrar o devolver. El cheque ya no se ofrece (la playa no lo usa);
// los cobros viejos con cheque se siguen mostrando con su nombre (ver `nombreMetodo`).
export const METODOS_COBRO: { id: MetodoCobro; label: string }[] = [
  { id: 'CASH', label: 'Efectivo' },
  { id: 'TRANSFER', label: 'Transferencia' },
];

export const nombreMetodo = (m: string | null | undefined) =>
  ({ CASH: 'Efectivo', TRANSFER: 'Transferencia', CHECK: 'Cheque', MERCADOPAGO: 'MercadoPago (QR)', CREDIT: 'Saldo a favor', FIX: 'Descuento', MIX: 'Varios', TP: 'Transferencia' })[
    m ?? ''
  ] ?? '—';

// El recibo de un pago como comprobante público (mismo circuito que los tickets). Espejo de
// ReciboPagoSnapshot del backend: nada de usuarios ni ids internos.
export type ReciboPagoSnapshot = {
  kind: 'PAGO';
  parkingName: string;
  address: string | null;
  numero: string;
  fecha: string;
  cliente: string;
  total: number;
  medios: { medio: string; importe: number }[];
  aplicado: { concepto: string; importe: number; queda: number }[];
  aFavor: number;
  saldo: number;
  anulado?: boolean;
};

export type ReciboEntregable =
  | { deshabilitado: true; settings: import('./parking-receipt.type').ReceiptDeliverySettings }
  | {
      deshabilitado: false;
      token: string;
      snapshot: ReciboPagoSnapshot;
      settings: import('./parking-receipt.type').ReceiptDeliverySettings;
      // Solo dígitos, listo para wa.me; null si el inquilino no tiene un celular cargado.
      telefono: string | null;
    };
