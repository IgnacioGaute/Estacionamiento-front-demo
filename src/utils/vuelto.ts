// Ayuda del mostrador para cobrar en efectivo: con cuánto suele pagar alguien y cuánto vuelto
// darle. Es solo un cálculo en pantalla: no cambia lo que se cobra ni se guarda en ningún lado.

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
