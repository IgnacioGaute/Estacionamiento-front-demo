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
};
