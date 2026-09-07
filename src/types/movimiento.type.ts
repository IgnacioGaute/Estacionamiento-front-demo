import { User } from './user.type';

export const MOVIMIENTO_METODO = ['CASH', 'TRANSFER'] as const;
export type MovimientoMetodo = (typeof MOVIMIENTO_METODO)[number];

export const MOVIMIENTO_TIPO = ['ANTICIPO', 'SALDO', 'AJUSTE', 'CORTESIA'] as const;
export type MovimientoTipo = (typeof MOVIMIENTO_TIPO)[number];

export type Movimiento = {
  id: string;
  sequence: number;
  fechaHora: string;
  monto: number;
  metodo: MovimientoMetodo;
  tipo: MovimientoTipo;
  usuario: User;
  referencia: string | null;
  motivo: string | null;
};
