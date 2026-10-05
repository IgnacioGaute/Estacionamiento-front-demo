// Medidas baratas sobre una copia chica y en grises de lo que hay dentro de la guía del escáner.
// Con ellas el celular decide si vale la pena gastar un reconocimiento en el cuadro actual: cada
// consulta a Plate Recognizer se paga, encuentre o no una patente.
export const MUESTRA_ANCHO = 160;
export const MUESTRA_ALTO = 54; // la misma proporción 3:1 que la guía

export function aGrises(rgba: Uint8ClampedArray): Float32Array {
  const gris = new Float32Array(rgba.length / 4);
  for (let i = 0; i < gris.length; i++) {
    gris[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  return gris;
}

// Gradiente medio entre píxeles vecinos: alto con caracteres bien definidos, bajo si la imagen
// salió movida, fuera de foco o apunta a una superficie lisa.
export function nitidez(gris: Float32Array, ancho: number): number {
  const alto = gris.length / ancho;
  let suma = 0;
  let n = 0;
  for (let y = 0; y < alto - 1; y++) {
    for (let x = 0; x < ancho - 1; x++) {
      const i = y * ancho + x;
      suma += Math.abs(gris[i + 1] - gris[i]) + Math.abs(gris[i + ancho] - gris[i]);
      n++;
    }
  }
  return n ? suma / n : 0;
}

// Diferencia media entre dos muestras del mismo tamaño: cuánto cambió la escena.
export function diferencia(a: Float32Array, b: Float32Array): number {
  let suma = 0;
  for (let i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
  return a.length ? suma / a.length : 0;
}

// Rectángulo del video que cae dentro de la guía. El visor muestra el video con `object-cover`
// en un cuadro de proporción `aspectoVisor` (ancho / alto), y la guía ocupa `anchoGuia` de ese
// ancho, centrada y en 3:1. Como todo está centrado, alcanza con saber qué parte del video se ve.
export function zonaDeLaGuia(
  videoAncho: number,
  videoAlto: number,
  aspectoVisor: number,
  anchoGuia: number,
) {
  const visibleAncho = Math.min(videoAncho, videoAlto * aspectoVisor);
  const ancho = visibleAncho * anchoGuia;
  const alto = ancho / 3;
  return { x: (videoAncho - ancho) / 2, y: (videoAlto - alto) / 2, ancho, alto };
}
