import { User } from './user.type';

export type Turno = {
  id: string;
  usuarioApertura: User;
  fechaApertura: string;
  fondoInicial: number;
  usuarioCierre: User | null;
  fechaCierre: string | null;
  efectivoContado: number | null;
  efectivoTeorico: number | null;
  diferencia: number | null;
  observaciones: string | null;
  estado: 'ABIERTO' | 'CERRADO';
};
