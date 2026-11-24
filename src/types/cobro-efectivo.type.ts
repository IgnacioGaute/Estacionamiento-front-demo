// El cobro en efectivo que confirmó el servidor: lo que entró a la caja (`importe`) y lo que el
// operador declaró recibir y dar de vuelto. Recibido y vuelto explican el cobro; no son plata del
// libro. null cuando no se guardaron (cobros anteriores o sin conexión de versiones viejas).
export type CobroEfectivoConfirmado = {
  importe: number;
  efectivoRecibido: number | null;
  vuelto: number | null;
};
