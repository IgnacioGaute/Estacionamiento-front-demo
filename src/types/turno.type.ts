import { User } from './user.type';

export type Turno = {
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

export type OpenTurno = Turno & { efectivoDisponible: number; efectivoOperado?: number; usuariosEnCaja?: number; requiereArqueo?: boolean };
export type Caja = { id: string; nombre: string; principal: boolean; activa: boolean };
export type CashSession = { id: string; fondoInicial: number; fondoEsperado: number; cambioAgregado: number; diferenciaApertura: number; motivoApertura: string | null; fechaApertura: string; fechaCierre: string | null; efectivoParaSiguiente: number | null; efectivoContado: number | null; efectivoTeorico: number | null; diferencia: number | null; estado: 'ABIERTO' | 'CERRADO' };
export type CajaContext = Caja & { session: CashSession | null; pending: CashSession | null; legacyPending: Turno | null; efectivoDisponible: number; movimientos?: { id: string; amount: number; tipo: string; motivo: string; operador: string }[]; operadores: { turnoId: string; id: string; nombre: string }[] };
export type CashContext = { active: OpenTurno | null; pending: Turno | null; efectivoDisponible: number; openTurnos: OpenTurno[]; cajas?: CajaContext[]; multipleShiftsEnabled?: boolean; legacyOpen?: boolean };
