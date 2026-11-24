// Historial de movimientos y correcciones de registros (backend: src/operaciones, docs/correcciones.md).

export type TipoMovimientoHistorial = 'ENTRADA' | 'SALIDA' | 'ANTICIPO' | 'COBRO_PARCIAL' | 'DEVOLUCION' | 'PASE' | 'CORRECCION';
export type MedioHistorial = 'CASH' | 'TRANSFER' | 'MERCADOPAGO';
export type EstadoCorreccionFiltro = 'CORREGIDA' | 'PENDIENTE' | 'RECHAZADA' | 'SIN';

// Un renglón del historial: un evento (entrada, salida con su cobro, anticipo, alta o retiro de un
// pase, corrección). `medios` son los vigentes, con las correcciones aplicadas.
export type MovimientoHistorial = {
  id: string;
  tipo: TipoMovimientoHistorial;
  fecha: string;
  registrationId: string | null;
  paseId: string | null;
  identificacion: string;
  operador: string | null;
  turnoId: string | null;
  importe: number | null;
  medios: Partial<Record<MedioHistorial | string, number>> | null;
  recibido: number | null;
  vuelto: number | null;
  correccion: Exclude<EstadoCorreccionFiltro, 'SIN'> | null;
  // Pases: «Alta» o «Retiro». Correcciones: su tipo. Devoluciones: el motivo.
  detalle: string | null;
  // Salidas: cuánto estuvo, en minutos.
  duracion?: number | null;
  // La patente (null si es tarjeta o sin patente) y el código del tipo de vehículo.
  patente?: string | null;
  vehiculo?: string | null;
};

// El resumen del período con los mismos filtros: `porTipo` sin el filtro de tipo (las cantidades de
// los filtros), lo cobrado por medio y las correcciones esperando revisión.
export type ResumenHistorial = {
  total: number;
  porTipo: Partial<Record<TipoMovimientoHistorial, number>>;
  cobrado: { total: number; porMedio: Partial<Record<MedioHistorial | string, number>> };
  pendientes: number;
};

export type FiltrosHistorial = {
  desde?: string;
  hasta?: string;
  turnoId?: string;
  operadorId?: string;
  q?: string;
  medio?: MedioHistorial;
  tipo?: TipoMovimientoHistorial;
  correccion?: EstadoCorreccionFiltro;
  page?: number;
};

export type HistorialMovimientos = {
  data: MovimientoHistorial[];
  meta: { totalItems: number; currentPage?: number; totalPages?: number; itemsPerPage?: number };
  filtros: { desde: string; hasta: string };
  resumen?: ResumenHistorial;
};

export type TipoCorreccion = 'IDENTIFICACION' | 'MEDIO_PAGO' | 'RECIBIDO_VUELTO' | 'VEHICULO' | 'OTRO';
export type EstadoCorreccion = 'APLICADA' | 'PENDIENTE' | 'RECHAZADA';

export type EfectoCorreccion = { lineas?: string[]; efectivo?: number; digital?: number; identificacion?: string; posteriorAlCierre?: boolean };

export type Correccion = {
  id: string;
  solicitudId: string;
  tipo: TipoCorreccion;
  estado: EstadoCorreccion;
  registrationId: string | null;
  paseId: string | null;
  movimientoId: string | null;
  destinoRegistrationId: string | null;
  turnoId: string | null;
  imputadaTurnoId: string | null;
  posteriorAlCierre: boolean;
  usuarioNombre: string | null;
  motivo: string;
  detalle: string | null;
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
  efecto: EfectoCorreccion;
  evidencia: { tipo: 'MERCADOPAGO' | 'ADMINISTRACION'; operacionId: string | null } | null;
  revisadoPorNombre: string | null;
  revisadoEl: string | null;
  resolucion: string | null;
  aplicadaEl: string | null;
  createdAt: string;
};

// Un cobro de la estadía que se puede corregir (anticipo o cobro de la salida).
export type CobroCorregible = {
  id: string;
  tipo: 'SALDO' | 'ANTICIPO';
  metodo: MedioHistorial;
  monto: number;
  fecha: string;
  operador: string | null;
  turnoId: string | null;
  efectivoRecibido: number | null;
  vuelto: number | null;
  recibidoCorregido: boolean;
  // Lo que ya se pasó a otro medio con correcciones aplicadas.
  corregido: number;
  confirmadoPorMp: boolean;
  // Si quien mira puede corregirlo directamente o queda para revisión (y por qué).
  directo: boolean;
  motivoRevision: string | null;
  // Pasó a la estadía que de verdad salió («vehículo equivocado»): ya no se corrige acá.
  movido?: boolean;
  // Llegó de otra estadía con una corrección de vehículo equivocado.
  deCorreccion?: boolean;
};

export type PermisoCorreccion = { directo: boolean; motivoRevision: string | null };

export type DetalleEstadia = {
  tipo: 'ESTADIA';
  id: string;
  identificacion: string;
  patente: string | null;
  vehicleType: string | null;
  entrada: string;
  salida: string | null;
  entryOperatorName: string | null;
  exitOperatorName: string | null;
  exitTurnoId: string | null;
  precio: number | null;
  cobrado: number;
  medios: Partial<Record<MedioHistorial | string, number>>;
  pagos: CobroCorregible[];
  ajustes: { id: string; tipo: string; metodo: string; monto: number; motivo: string | null; fecha: string; correccionId: string | null; operador: string | null }[];
  correcciones: Correccion[];
  version: string;
  permiso: PermisoCorreccion | null;
  comprobantes: { entrada: boolean; salida: boolean };
};

export type DetallePase = {
  tipo: 'PASE';
  id: string;
  identificacion: string;
  ticketTimeType: string;
  alta: string;
  retiro: string | null;
  precio: number;
  pagado: boolean;
  metodo: MedioHistorial | null;
  efectivoRecibido: number | null;
  vuelto: number | null;
  recibidoCorregido: boolean;
  entryOperatorName: string | null;
  paymentOperatorName: string | null;
  exitOperatorName: string | null;
  correcciones: Correccion[];
  version: string;
  permiso: PermisoCorreccion;
};

export type DetalleOperacion = DetalleEstadia | DetallePase;

export type CorreccionPayload = {
  solicitudId: string;
  tipo: TipoCorreccion;
  registrationId?: string;
  paseId?: string;
  version: string;
  motivo: string;
  detalle?: string;
  patente?: string;
  movimientoId?: string;
  metodo?: 'CASH' | 'TRANSFER';
  importe?: number;
  operacionId?: string;
  efectivoRecibido?: number;
  destinoRegistrationId?: string;
};

export type PrevisualizacionCorreccion = {
  estado: EstadoCorreccion;
  efecto: EfectoCorreccion;
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
  motivoRevision: string | null;
};

// Una acreditación de Mercado Pago que puede respaldar el cambio de un efectivo a transferencia.
export type TransferenciaCandidata = {
  operacionId: string;
  importe: number;
  fecha: string;
  // Quién pagó, si Mercado Pago lo informa.
  nombre: string | null;
  entidad: string | null;
  documento: string | null;
};

export type TransferenciasParaCorreccion = { disponible: boolean; motivo: string | null; opciones: TransferenciaCandidata[] };

// El error de la API, con su código cuando lo trae: la pantalla decide qué hacer (p. ej. recargar
// la operación si cambió mientras se corregía).
export type ResultadoApi<T> = { data: T; error?: undefined; code?: undefined } | { data?: undefined; error: string; code?: string };
