// El arqueo final se cuenta por cantidad de billetes y monedas de cada denominación. Las mismas
// denominaciones que admite el backend (src/turnos/conteo-billetes.ts), de mayor a menor: con ellas
// se puede representar cualquier importe en pesos enteros. El servidor recalcula el total.
export const DENOMINACIONES = [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
// Las que casi no aparecen en un cajón: van plegadas y se abren solas si tienen algo.
export const DENOMINACION_CHICA = 50;

export type ConteoBillete = { denominacion: number; cantidad: number };
// Lo que se escribe en cada fila (texto, para no forzar un 0 que nadie contó).
export type Cantidades = Partial<Record<number, string>>;

export const cantidadValida = (texto: string | undefined) => texto !== undefined && texto !== '' && /^\d+$/.test(texto) && Number(texto) <= 100000;

// El desglose que se manda y se guarda: de mayor a menor y sin las denominaciones en cero.
export function desgloseDe(cantidades: Cantidades): ConteoBillete[] {
  return DENOMINACIONES.filter((d) => cantidadValida(cantidades[d]) && Number(cantidades[d]) > 0)
    .map((d) => ({ denominacion: d, cantidad: Number(cantidades[d]) }));
}

export const totalDesglose = (desglose: ConteoBillete[]) => desglose.reduce((s, f) => s + f.denominacion * f.cantidad, 0);

// Hay algo mal escrito (letras, negativos, decimales): no se puede comparar todavía.
export const conteoConErrores = (cantidades: Cantidades) => DENOMINACIONES.some((d) => (cantidades[d] ?? '') !== '' && !cantidadValida(cantidades[d]));
