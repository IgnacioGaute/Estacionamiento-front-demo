// Lo que la empresa acepta al conectar MercadoPago: qué puede hacer el sistema con su cuenta. El
// texto viene del backend (src/mercadopago/condiciones.ts), que guarda qué versión se aceptó.
export type CondicionesMercadoPago = {
  version: string;
  titulo: string;
  puntos: string[];
};

// Lo que el backend cuenta sobre la cuenta de MercadoPago de la empresa. Nunca incluye tokens:
// las credenciales no salen del servidor.
export type EstadoMercadoPago =
  | { conectada: false; condicionesVigentes: CondicionesMercadoPago }
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
      condicionesVigentes: CondicionesMercadoPago;
      // null: la cuenta se conectó antes de que existieran las condiciones.
      condicionesAceptadas: { version: string; el: string | null; alDia: boolean } | null;
    };

// Un pedido de pago por QR. El importe queda congelado hasta `expiraEl`: la tarifa sigue
// corriendo, pero al cliente se le cobra lo que se le mostró.
export type CobroMercadoPago = {
  id: string;
  estado: 'PENDIENTE' | 'ACREDITADO' | 'VENCIDO' | 'CANCELADO';
  monto: number;
  // El link de pago de MercadoPago (vacío si el cobro salió con la caja de la playa).
  initPoint: string;
  // Lo que se dibuja como QR: el código estándar si la playa tiene caja de MercadoPago (lo paga
  // cualquier banco o billetera), si no el link.
  qr: string;
  interoperable: boolean;
  expiraEl: string;
  acreditadoEl: string | null;
  // Con el pago la estadía o el abono quedaron cerrados: el sistema registró la salida solo.
  salidaRegistrada?: boolean;
  // Solo en un cobro de inquilino ya acreditado: el recibo del pago que quedó asentado.
  recibo?: import('./cuenta.type').ResultadoPago | null;
};

// La dirección con la que se crea la sucursal de MercadoPago de una playa (la exige completa).
export type DireccionCaja = {
  calle: string;
  numero: string;
  ciudad: string;
  provincia: string;
  latitud: number;
  longitud: number;
  referencia?: string;
};

// Las playas de la empresa y si ya tienen caja de MercadoPago para el QR que se paga desde
// cualquier banco o billetera.
export type CajasQr = {
  cuentaConectada: boolean;
  playas: {
    playaId: string;
    nombre: string;
    direccion: string | null;
    caja: { creadaEl: string; direccion: DireccionCaja | null } | null;
  }[];
};

// Provincia o ciudad tal como las acepta MercadoPago para una sucursal (listado de MercadoLibre).
export type UbicacionMp = { id: string; nombre: string };

// Activar la caja con la ubicación del dispositivo: creada, o lo detectado para completar a mano.
export type CajaConUbicacion =
  | ({ creada: true } & CajasQr)
  | {
      creada: false;
      motivo: string;
      sugerencia: { calle: string; numero: string; provincia: string | null; latitud: number; longitud: number };
    };
