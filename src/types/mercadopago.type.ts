// Lo que el backend cuenta sobre la cuenta de MercadoPago de la empresa. Nunca incluye tokens:
// las credenciales no salen del servidor.
export type EstadoMercadoPago =
  | { conectada: false }
  | {
      conectada: true;
      mpUserId: string;
      nickname: string | null;
      email: string | null;
      estado: 'ACTIVA' | 'DESCONECTADA' | 'ERROR';
      expiraEl: string;
      conectadaEl: string | null;
      // Por qué dejó de funcionar, cuando el permiso se venció o MercadoPago lo revocó.
      ultimoError: string | null;
    };

// Un pedido de pago por QR. El importe queda congelado hasta `expiraEl`: la tarifa sigue
// corriendo, pero al cliente se le cobra lo que se le mostró.
export type CobroMercadoPago = {
  id: string;
  estado: 'PENDIENTE' | 'ACREDITADO' | 'VENCIDO' | 'CANCELADO';
  monto: number;
  // La URL de pago: es a la vez lo que se dibuja como QR y lo que se manda por WhatsApp.
  initPoint: string;
  expiraEl: string;
  acreditadoEl: string | null;
  // Solo en un cobro de inquilino ya acreditado: el recibo del pago que quedó asentado.
  recibo?: import('./cuenta.type').ResultadoPago | null;
};

// Diagnóstico del super admin: lo que MercadoPago informa que entró a la cuenta conectada de una
// empresa. Cada consulta viene con su resultado o con el error que contestó MercadoPago.
type ConsultaFallida = { ok: false; estado: number | null; error: string };
type Simples = Record<string, string | number | boolean | null>;

export type PagoDiagnostico = {
  id: number;
  creado: string | null;
  aprobado: string | null;
  estado: string | null;
  detalle: string | null;
  importe: number | null;
  neto: number | null;
  operacion: string | null;
  tipo: string | null;
  medio: string | null;
  descripcion: string | null;
  referencia: string | null;
  recibido: boolean | null;
  pagador: { id: number | null; nombre: string | null; email: string | null; documento: string | null };
  origen: {
    tipo: string | null;
    subtipo: string | null;
    banco: { pagador: Simples; cobrador: Simples; transferencia: boolean | null } | null;
  } | null;
  claves: string[];
};

export type DiagnosticoIngresos = {
  cuenta: { mpUserId: string | null; nickname: string | null; email: string | null };
  desde: string;
  hasta: string;
  pagos: { ok: true; total: number | null; items: PagoDiagnostico[] } | ConsultaFallida;
  movimientos: { ok: true; total: number | null; items: Simples[] } | ConsultaFallida;
  saldo: ({ ok: true } & Simples) | ConsultaFallida;
};
