import { ERRORES_MODALIDAD } from '@/lib/modalidad';

export interface TicketError {
    code: string;
    message: string;
  }


export function handleTicketError(error: TicketError): TicketError {
  const errorCode = error.code || 'UNKNOWN_ERROR';
  let errorMessage = error.message || 'Error desconocido.';

  switch (errorCode) {
    case 'TICKET_PRICE_TYPE_FOUND':
      errorMessage = 'Ya existe un tipo de precio para este ticket.';
      break;
    case 'TICKET_PRICE_NOT_FOUND':
      errorMessage = 'No se encontró el precio del ticket.';
      break;
    case 'TICKET_PRICE_BRACKET_NOT_FOUND':
      errorMessage = error.message || 'No hay tarifas configuradas para este tipo de vehículo.';
      break;
    default:
      // Modalidad gratuita: el texto propio del frontend, con el del backend como respaldo.
      errorMessage = ERRORES_MODALIDAD[errorCode] || error.message || 'Error desconocido.';
  }

  return {
    code: errorCode,
    message: errorMessage,
  };
}
