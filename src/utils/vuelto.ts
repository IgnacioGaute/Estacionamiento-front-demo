// Ayuda del mostrador para cobrar en efectivo: con cuánto suele pagar alguien y cuánto vuelto
// darle. Lo que el operador elige («Justo» o el importe que entrega) se manda con el cobro: el
// servidor recalcula el vuelto, rechaza lo que no alcanza y lo guarda como dato declarado. La
// pantalla no cambia lo que se cobra.

// Redondeos a montos con los que se paga habitualmente (billetes o sumas redondas de billetes).
const REDONDEOS = [1000, 5000, 10000, 20000, 50000, 100000];

// Los primeros importes redondos mayores al saldo: para $ 38.000, 40.000 y 50.000.
export function pagosSugeridos(importe: number, cantidad = 2): number[] {
  if (!(importe > 0)) return [];
  const opciones: number[] = [];
  for (const redondeo of REDONDEOS) {
    const valor = Math.ceil(importe / redondeo) * redondeo;
    if (valor > importe && !opciones.includes(valor)) opciones.push(valor);
    if (opciones.length === cantidad) break;
  }
  return opciones;
}

// Positivo: el vuelto. Negativo: lo que le falta entregar. Redondeado a centavos para que una
// tarifa con decimales no muestre restos de coma flotante.
export function calcularVuelto(importe: number, recibido: number): number {
  return Math.round((recibido - importe) * 100) / 100;
}

// Si se puede confirmar el efectivo: hace falta indicar con cuánto paga y que alcance para la parte
// en efectivo (`aplicado`). Lo que falta no se descuenta ni queda como deuda: se corrige lo recibido
// o se cobra el resto con otro medio.
export type EstadoEfectivo =
  | { estado: 'SIN_INDICAR' }
  | { estado: 'FALTA'; falta: number }
  | { estado: 'LISTO'; vuelto: number };

export function estadoEfectivo(aplicado: number, recibido: number | null): EstadoEfectivo {
  if (recibido === null || !Number.isInteger(recibido) || recibido < 0) return { estado: 'SIN_INDICAR' };
  const vuelto = calcularVuelto(aplicado, recibido);
  return vuelto < 0 ? { estado: 'FALTA', falta: -vuelto } : { estado: 'LISTO', vuelto };
}
