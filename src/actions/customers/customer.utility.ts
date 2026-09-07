export interface CustomerError {
    code: string;
    message: string;
  }


  export function handleCustomerError(error: CustomerError): CustomerError {
    const errorCode = error.code || 'UNKNOWN_ERROR';
    let errorMessage = error.message || 'Error desconocido.';
  
    switch (errorCode) {
      case 'PARKING_TYPE_NOT_FOUND':
      case 'RENTER_PARKING_TYPE_NOT_FOUND':
        errorMessage =
          'El tipo de estacionamiento no existe, necesita ser creado en Administrar para ser utilizado.';
        break;
        case 'CUSTOMER_RENTER_RELATIONSHIP':
          errorMessage =
          error.message
          break;
          case 'GARAGE_NUMBER_ALREDY_EXIST':
            errorMessage =
            error.message
            break;
            case 'PARKING_TYPE_ALREDY_EXIST':
              errorMessage =
              error.message
              break;
              case 'FOREIGN_KEY_VIOLATION':
                errorMessage =
                error.message
                break;
      default:
        errorMessage = error.message || 'Error desconocido.';
    }
  
    return {
      code: errorCode,
      message: errorMessage,
    };
  }