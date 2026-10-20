import type { ResumenSalida, SalidaGratuitaSummary } from '@/services/tickets.service';

// Modalidad de operación de una playa (ver docs/modalidad-gratuita.md del backend). La define solo
// el super admin. «Con cobro» es el funcionamiento de siempre; «Gratuito» registra y controla
// vehículos sin tarifas, cobros ni caja. El backend es la autoridad: la UI solo oculta lo que en
// esa modalidad no existe, y cada estadía trae la modalidad con la que ingresó.
export type Modalidad = 'CON_COBRO' | 'GRATUITO';

export const esGratuita = (modalidad?: string | null) => modalidad === 'GRATUITO';

export const NOMBRE_MODALIDAD: Record<Modalidad, string> = {
  CON_COBRO: 'Con cobro',
  GRATUITO: 'Gratuito',
};

// Errores del backend propios de la modalidad, con el texto que ve el usuario.
export const ERRORES_MODALIDAD: Record<string, string> = {
  MODALIDAD_GRATUITA: 'Esta playa funciona en modalidad gratuita: no registra tarifas, cobros ni caja.',
  ESTADIA_GRATUITA: 'Esta estadía ingresó en modalidad gratuita: registrá la salida sin cobro.',
  ESTADIA_CON_COBRO: 'Esta estadía ingresó con cobro: registrá la salida desde Cobrar salida.',
  OFFLINE_NO_DISPONIBLE_GRATUITO: 'El modo sin conexión no está disponible en la modalidad gratuita.',
};

// El resumen de salida de una estadía gratuita (sin importes) frente al de una con cobro.
export const esSalidaGratuita = (s: ResumenSalida | null | undefined): s is SalidaGratuitaSummary => s?.modalidad === 'GRATUITO';
