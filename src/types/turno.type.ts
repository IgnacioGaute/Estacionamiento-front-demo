import type { ConteoBillete } from '@/utils/conteo-billetes';
import { User } from './user.type';

export type Turno = {
  cierreAutomatico?: boolean;
  continuacionDeId?: string | null;
  jornadaId?: string | null;
  fechaOperativa?: string | null;
  sueldoPrevisto?: number;
  sueldoRetirado?: number;
  alertaSueldo?: string | null;
  saldoAlCorte?: number | null;
  resumen?: TurnoResumen;
  id: string;
  nombre: string;
  cashVersion: number;
  duracionPrevistaHoras: number | null;
  turnoAnteriorId: string | null;
  fondoRecibido: number;
  efectivoRetirado: number | null;
  efectivoParaSiguiente: number | null;
  recibidoPorTurnoId: string | null;
  usuarioApertura: User;
  fechaApertura: string;
  fondoInicial: number;
  usuarioCierre: User | null;
  fechaCierre: string | null;
  efectivoContado: number | null;
  // El primer importe comparado en el arqueo y los billetes de cada conteo (null si no se guardaron:
  // cierres anteriores al conteo por billetes o sin arqueo).
  primerConteo?: number | null;
  conteoDesglose?: ConteoBillete[] | null;
  primerConteoDesglose?: ConteoBillete[] | null;
  efectivoTeorico: number | null;
  diferencia: number | null;
  observaciones: string | null;
  cierreForzado: boolean;
  motivoCierreForzado: string | null;
  cajaId?: string | null;
  caja?: Caja | null;
  cashSessionId?: string | null;
  cashSession?: CashSession | null;
  cierreCaja?: boolean;
  estado: 'ABIERTO' | 'CERRADO';
};

export type ConteoRelevoCaja = { id: string; momento: 'INGRESO' | 'SALIDA'; contado: number; esperado: number; diferencia: number; motivo: string | null; operador: string; fecha: string };
export type EstadiaParaRevisar = { id: string; patente: string; motivo: 'DESCUENTO_TOTAL' | 'COBRO_SIN_TIEMPO' | 'REINGRESO'; detalle: string; salida: string };
// Cobros digitales que nadie comprobó contra Mercado Pago: «Transferencia» cargada a mano, o una
// transferencia al alias que el operador eligió entre varias posibles.
// Los cobros en efectivo que recibió un turno, para el historial (GET /turnos/:id/cobros-efectivo).
// Cada fila es una operación, no un vehículo: un vehículo puede tener anticipo y saldo. `importe` con
// signo (las devoluciones restan). `sinDetalle`: una entrada de la caja de la que no se sabe la
// operación (un pase marcado como pagado después o eliminado, un ajuste a mano).
export type ConceptoCobroEfectivo = 'ANTICIPO' | 'SALDO' | 'AJUSTE' | 'DEVOLUCION' | 'PAGO_INQUILINO' | 'DEVOLUCION_INQUILINO'
  | 'ANULACION_INQUILINO' | 'ESTADIA_PERIODO' | 'DEVOLUCION_ANTICIPO' | 'AJUSTE_CAJA' | 'COBRO' | 'CORRECCION';
// `recibido` y `vuelto`: lo que el operador declaró al cobrar (null si no se guardó).
export type CobroEfectivo = { id: string; fecha: string; concepto: ConceptoCobroEfectivo; identificacion: string | null; importe: number; sinDetalle: boolean; periodo?: string | null; anula?: 'PAGO' | 'DEVOLUCION' | null; recibido?: number | null; vuelto?: number | null };
export type CobrosEfectivoTurno = { cobros: CobroEfectivo[]; cantidad: number; ingresos: number; egresos: number; total: number; sinDetalle: number };
export type CobroSinVerificar = { id: string; tipo: 'TRANSFERENCIA' | 'ALIAS_ELEGIDA'; importe: number; hora: string; concepto: string; operador: string };
export type ConciliacionCaja = { fondoInicial: number; ingresos: number; egresos: number; esperado: number; movimientos: { id: string; amount: number; concepto: string; operador: string; fecha: string }[]; conteos?: ConteoRelevoCaja[]; paraRevisar?: EstadiaParaRevisar[]; sinVerificar?: CobroSinVerificar[] };
export type OpenTurno = Turno & { efectivoDisponible: number; fondoObjetivo?: number; sueldoSugerido?: number; efectivoOperado?: number; usuariosEnCaja?: number; requiereArqueo?: boolean; fondoCaja?: number; abrioLaCaja?: boolean };
export type Caja = { id: string; nombre: string; principal: boolean; activa: boolean; fondoObjetivo?: number };
export type CashSession = { id: string; fondoInicial: number; fondoEsperado: number; cambioAgregado: number; diferenciaApertura: number; motivoApertura: string | null; fechaApertura: string; fechaCierre: string | null; efectivoParaSiguiente: number | null; efectivoContado: number | null; efectivoTeorico: number | null; diferencia: number | null; estado: 'ABIERTO' | 'CERRADO'; conteoDesglose?: ConteoBillete[] | null; primerConteoDesglose?: ConteoBillete[] | null };
export type CajaContext = Caja & { session: CashSession | null; pending: CashSession | null; legacyPending: Turno | null; traspaso?: { operador: string | null; fechaCierre: string | null; cierreAutomatico?: boolean; vehiculosDejados: number | null; vehiculosActivos: number }; efectivoDisponible: number; movimientos?: { id: string; amount: number; tipo: string; motivo: string; operador: string }[]; operadores: { turnoId: string; id: string; nombre: string }[] };
export type CashContext = { active: OpenTurno | null; pending: Turno | null; efectivoDisponible: number; openTurnos: OpenTurno[]; cajas?: CajaContext[]; multipleShiftsEnabled?: boolean; legacyOpen?: boolean };

export type TurnoResumen = {
  efectivoCobrado: number; efectivoNeto: number; ingresosVarios: number; gastosEfectivo: number; devolucionesEfectivo: number;
  mercadoPagoAlias: number; mercadoPagoQr: number; transferencias: number;
  sueldoRetirado: number; retirosRecaudacion: number; totalRetirado: number;
  salidas: number | null; vehiculosInicio: number | null; vehiculosFin: number | null; efectivoParaSiguiente: number | null;
  movimientos: { id: string; tipo: string; amount: number; motivo: string; createdAt: string; operador: string }[];
  // Correcciones de registros del turno (docs/correcciones.md). Las aplicadas con la caja abierta ya
  // están en los totales de arriba; las posteriores al cierre no tocan su arqueo y se informan aparte.
  correcciones?: { aplicadas: number; pendientes: number; posterioresAlCierre: { cantidad: number; efectivo: number; digital: number } | null };
};

// Una estadía que el operador registró en su turno y sigue abierta (GET /turnos/:id/estadias-abiertas).
// `operador`: quién registró la entrada (lo muestra el repaso de toda la playa al cerrar la caja).
export type EstadiaAbiertaTurno = { id: string; patente: string | null; vehicleType: string | null; entryDay: string; entryTime: string; anticipo: number; operador?: string | null };
