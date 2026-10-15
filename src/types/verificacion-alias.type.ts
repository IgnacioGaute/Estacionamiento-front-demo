// La verificación de transferencias al alias: el cobro de una estadía que espera el ingreso en la
// cuenta de MercadoPago de la empresa. Ver docs/verificacion-transferencias.md en el backend.

// ESPERANDO: se busca la transferencia. REVISION: hay más de una posibilidad y elige el operador.
// CONFIRMADO: se asoció (cobro registrado; la salida también si no quedó saldo). CANCELADO,
// VENCIDO, PAGADO_OTRO_MEDIO: terminó sin usar una transferencia.
export type EstadoCobroAlias =
  | 'ESPERANDO'
  | 'REVISION'
  | 'CONFIRMADO'
  | 'CANCELADO'
  | 'VENCIDO'
  | 'PAGADO_OTRO_MEDIO';

// Una transferencia candidata cuando hay que elegir. Nombre y banco, si MercadoPago los informa:
// se muestran en el momento y no se guardan.
export type OpcionTransferencia = {
  operacionId: string;
  importe: number;
  moneda: string;
  // Cuándo se hizo en MercadoPago y cuándo la vio el sistema.
  fechaOperacion: string;
  detectadaEl: string;
  nombre: string | null;
  entidad: string | null;
  documento?: string | null;
};

export type CobroAlias = {
  id: string;
  registrationId: string;
  tipo?: 'HORA' | 'ABONO' | 'INQUILINO';
  recibo?: import('./cuenta.type').ResultadoPago | null;
  estado: EstadoCobroAlias;
  importe: number;
  moneda: string;
  alias: string | null;
  creadoEl: string;
  buscarDesde: string;
  ventanaMinutos: number;
  puedeAmpliar: boolean;
  venceEl: string;
  cerradoEl: string | null;
  // AUTOMATICO_COINCIDENCIA_UNICA no identifica a quien pagó: es la regla de coincidencia única.
  modo: 'AUTOMATICO_COINCIDENCIA_UNICA' | 'MANUAL' | null;
  salidaRegistrada: boolean;
  // Si se pagó menos de lo pedido, lo que quedó por cobrar.
  saldoPendiente: number | null;
  // Un anticipo al entrar por esta duración: al confirmarse queda pagado y nunca registra la salida.
  anticipo?: { minutos: number; etiqueta?: string | null } | null;
  // `nombre`: quién transfirió, solo en la respuesta que la confirma (no se guarda).
  transferencia: {
    operacionId: string;
    importe: number;
    fechaOperacion: string;
    detectadaEl: string;
    nombre?: string | null;
  } | null;
  // Cómo salió la última consulta a MercadoPago. Un error NO significa que no pagó.
  consulta: { ok: true; consultadoEl: string } | { ok: false; code: string; error: string } | null;
  motivoRevision: 'VARIAS_TRANSFERENCIAS' | 'VARIOS_COBROS' | 'YA_EN_REVISION' | null;
  opciones: OpcionTransferencia[];
  // Mientras espera: las del mismo importe que entraron hasta 30 minutos antes de abrir el cobro.
  // Nunca se asocian solas; no aparecen si otro cobro del mismo importe podría reclamarlas.
  anteriores?: OpcionTransferencia[];
};

export type DisponibilidadAlias = { qrDisponible?: boolean } & (
  | { disponible: true; alias: string }
  | { disponible: false; code: string; motivo: string });

// Configuración → MercadoPago (administrador).
export type ConfiguracionAlias = {
  // La plataforma la habilitó para la empresa.
  adicionalHabilitado: boolean;
  activa: boolean;
  alias: string | null;
  cambiadaEl: string | null;
};

// Lo que habilita el super admin por empresa, aparte del plan.
export type AdicionalEmpresa = {
  codigo: 'VERIFICACION_ALIAS';
  habilitado: boolean;
  precioMensual: number;
  habilitadoEl: string | null;
  deshabilitadoEl: string | null;
};
