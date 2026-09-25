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
