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
  estado: 'ABIERTO' | 'CERRADO';
};

export type CashContext = { active: Turno | null; pending: Turno | null; efectivoDisponible: number };
