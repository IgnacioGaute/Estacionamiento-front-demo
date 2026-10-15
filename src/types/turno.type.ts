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

export type OpenTurno = Turno & { efectivoDisponible: number; fondoObjetivo?: number; sueldoSugerido?: number; efectivoOperado?: number; usuariosEnCaja?: number; requiereArqueo?: boolean };
export type Caja = { id: string; nombre: string; principal: boolean; activa: boolean; fondoObjetivo?: number };
export type CashSession = { id: string; fondoInicial: number; fondoEsperado: number; cambioAgregado: number; diferenciaApertura: number; motivoApertura: string | null; fechaApertura: string; fechaCierre: string | null; efectivoParaSiguiente: number | null; efectivoContado: number | null; efectivoTeorico: number | null; diferencia: number | null; estado: 'ABIERTO' | 'CERRADO' };
export type CajaContext = Caja & { session: CashSession | null; pending: CashSession | null; legacyPending: Turno | null; traspaso?: { operador: string | null; fechaCierre: string | null; vehiculosDejados: number | null; vehiculosActivos: number }; efectivoDisponible: number; movimientos?: { id: string; amount: number; tipo: string; motivo: string; operador: string }[]; operadores: { turnoId: string; id: string; nombre: string }[] };
export type CashContext = { active: OpenTurno | null; pending: Turno | null; efectivoDisponible: number; openTurnos: OpenTurno[]; cajas?: CajaContext[]; multipleShiftsEnabled?: boolean; legacyOpen?: boolean };

export type TurnoResumen = {
  efectivoCobrado: number; efectivoNeto: number; ingresosVarios: number; gastosEfectivo: number; devolucionesEfectivo: number;
  mercadoPagoAlias: number; mercadoPagoQr: number; transferencias: number;
  sueldoRetirado: number; retirosRecaudacion: number; totalRetirado: number;
  salidas: number | null; vehiculosInicio: number | null; vehiculosFin: number | null; efectivoParaSiguiente: number | null;
  movimientos: { id: string; tipo: string; amount: number; motivo: string; createdAt: string; operador: string }[];
};

// Una estadía que el operador registró en su turno y sigue abierta (GET /turnos/:id/estadias-abiertas).
export type EstadiaAbiertaTurno = { id: string; patente: string | null; vehicleType: string | null; entryDay: string; entryTime: string; anticipo: number };
